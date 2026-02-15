import { createServer } from 'http'
import { Server as SocketIOServer } from 'socket.io'
import { PrismaClient } from '@prisma/client'
import { exec } from 'child_process'
import { promisify } from 'util'

const PORT = 3003
const execAsync = promisify(exec)

const httpServer = createServer()
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
})

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'file:../db/custom.db'
    }
  }
})

// Store active connections
const activeConnections = new Map<string, Set<string>>()

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`)

  // Join rooms for specific targets or tasks
  socket.on('join-target', (targetId: string) => {
    socket.join(`target-${targetId}`)
    console.log(`Socket ${socket.id} joined target-${targetId}`)
  })

  socket.on('join-task', (taskId: string) => {
    socket.join(`task-${taskId}`)
    console.log(`Socket ${socket.id} joined task-${taskId}`)
  })

  socket.on('leave-task', (taskId: string) => {
    socket.leave(`task-${taskId}`)
    console.log(`Socket ${socket.id} left task-${taskId}`)
  })

  // Handle scan initiation request
  socket.on('start-scan', async (data: { targetId: string, taskType: string }) => {
    try {
      const { targetId, taskType } = data

      // Validate input
      if (!targetId || !taskType) {
        socket.emit('error', { message: 'targetId and taskType are required' })
        return
      }

      // Validate taskType
      const validTaskTypes = ['subdomain', 'port', 'service', 'full_scan']
      if (!validTaskTypes.includes(taskType)) {
        socket.emit('error', { message: 'Invalid taskType' })
        return
      }

      // Validate targetId format (basic CUID validation)
      if (typeof targetId !== 'string' || targetId.length < 10) {
        socket.emit('error', { message: 'Invalid targetId format' })
        return
      }

      // Get target info
      const target = await prisma.reconTarget.findUnique({
        where: { id: targetId }
      })

      if (!target) {
        socket.emit('error', { message: 'Target not found' })
        return
      }

      // Validate target string before scanning
      const validation = validateTargetString(target.target, target.targetType)
      if (!validation.valid) {
        socket.emit('error', { message: validation.error || 'Target validation failed' })
        return
      }

      // Check for running task
      const runningTask = await prisma.reconTask.findFirst({
        where: {
          targetId,
          status: 'running'
        }
      })

      if (runningTask) {
        socket.emit('error', { message: 'Scan already running for this target' })
        return
      }

      // Create new task
      const task = await prisma.reconTask.create({
        data: {
          targetId,
          taskType,
          status: 'running',
          progress: 0,
          startedAt: new Date()
        }
      })

      // Notify all clients
      io.to(`target-${targetId}`).emit('task-started', {
        taskId: task.id,
        targetId,
        taskType,
        target: target.target
      })

      // Start the actual reconnaissance
      runReconnaissance(task.id, target.target, taskType)

    } catch (error) {
      console.error('Error starting scan:', error)
      socket.emit('error', { message: 'Failed to start scan' })
    }
  })

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`)
  })
})

// Execute shell command with timeout
async function execCommand(command: string, timeout: number = 30000): Promise<{ stdout: string; stderr: string }> {
  try {
    return await Promise.race([
      execAsync(command),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Command timed out after ${timeout}ms`)), timeout)
      )
    ])
  } catch (error: any) {
    if (error.message && error.message.includes('timed out')) {
      throw new Error(`Command timed out after ${timeout}ms: ${command}`)
    }
    throw error
  }
}

// Validate target string to prevent command injection and other attacks
function validateTargetString(target: string, targetType: string): { valid: boolean; error?: string } {
  // Basic type check
  if (typeof target !== 'string') {
    return { valid: false, error: 'Target must be a string' }
  }

  // Trim whitespace
  target = target.trim()

  // Check for dangerous patterns (command injection, XSS, etc.)
  const dangerousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+=/i,
    /eval\(/i,
    /<iframe/i,
    /data:/i,
    /vbscript:/i,
    /;|\$\(|`/,                    // Command injection
    /&&|\|\|/,                      // Command chaining
    /\|\s*\d+/,                    // Pipe redirects
    />\s*\//,                       // Output redirects
    /\\r|\\n/,                     // Newline injection
    /%0[ad]/i,                     // URL encoded newlines
    /&#x?[0-9a-f]+;/i             // HTML entities
  ]

  for (const pattern of dangerousPatterns) {
    if (pattern.test(target)) {
      return { valid: false, error: 'Invalid target: contains potentially dangerous characters' }
    }
  }

  // Length check
  if (target.length > 253) { // Max domain length
    return { valid: false, error: 'Target exceeds maximum length' }
  }

  // Type-specific validation
  if (targetType === 'ip') {
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
    if (!ipRegex.test(target)) {
      return { valid: false, error: 'Invalid IP address format' }
    }

    // Block private IP ranges
    const privateIPRegex = /^(10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.|127\.)/
    if (privateIPRegex.test(target)) {
      return { valid: false, error: 'Scanning private IP addresses is not allowed' }
    }

    // Block localhost
    if (target === '0.0.0.0' || target === '127.0.0.1') {
      return { valid: false, error: 'Scanning localhost is not allowed' }
    }
  }

  if (targetType === 'domain') {
    // Domain validation (RFC compliant)
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
    if (!domainRegex.test(target)) {
      return { valid: false, error: 'Invalid domain format' }
    }

    // Block localhost domains
    if (target === 'localhost' || target.endsWith('.localhost')) {
      return { valid: false, error: 'Scanning localhost is not allowed' }
    }

    // Block local domains
    if (target.endsWith('.local') || target.endsWith('.test') || target.endsWith('.example')) {
      return { valid: false, error: 'Scanning local/test domains is not allowed' }
    }
  }

  if (targetType === 'url') {
    try {
      const url = new URL(target)

      // Only allow HTTP/HTTPS
      if (!['http:', 'https:'].includes(url.protocol)) {
        return { valid: false, error: 'URL must use HTTP or HTTPS protocol' }
      }

      // Block localhost URLs
      const hostname = url.hostname
      if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.') || hostname.startsWith('10.')) {
        return { valid: false, error: 'Scanning local addresses is not allowed' }
      }

      // Block credentials in URL
      if (url.username || url.password) {
        return { valid: false, error: 'URL must not contain credentials' }
      }
    } catch {
      return { valid: false, error: 'Invalid URL format' }
    }
  }

  return { valid: true }
}

// Subdomain enumeration
async function enumerateSubdomains(domain: string) {
  const results = []

  // DNS enumeration with dig
  try {
    const { stdout } = await execCommand(`dig +short ANY ${domain}`, 10000)
    const records = stdout.trim().split('\n').filter(line => line.trim())
    records.forEach(record => {
      results.push({
        type: 'dns_record',
        data: { domain, record },
        severity: 'info',
        timestamp: new Date()
      })
    })
  } catch (error) {
    console.warn('DNS enumeration failed:', error)
  }

  // Common subdomains check
  const commonSubdomains = ['www', 'api', 'dev', 'staging', 'test', 'mail', 'ftp', 'admin', 'portal', 'blog', 'shop', 'app', 'secure', 'cdn', 'static']

  for (const subdomain of commonSubdomains) {
    const fullDomain = `${subdomain}.${domain}`
    try {
      const { stdout } = await execCommand(`dig +short ${fullDomain} A`, 5000)
      if (stdout.trim()) {
        results.push({
          type: 'subdomain',
          data: {
            subdomain: fullDomain,
            ips: stdout.trim().split('\n')
          },
          severity: 'info',
          timestamp: new Date()
        })
      }
    } catch {
      // Subdomain doesn't exist
    }
  }

  return results
}

// Port scanning
async function scanPorts(target: string) {
  const results = []

  try {
    // Check if nmap is available
    await execCommand('which nmap', 5000)

    // Scan top 100 ports
    const { stdout } = await execCommand(
      `nmap -sS --top-ports 100 -T4 ${target} 2>/dev/null`,
      60000
    )

    const lines = stdout.split('\n')
    for (const line of lines) {
      const match = line.match(/(\d+)\/(tcp|udp)\s+(open|closed|filtered)\s+(.+)/)
      if (match) {
        const [, port, protocol, state, service] = match
        if (state === 'open') {
          results.push({
            type: 'port',
            data: {
              port: parseInt(port),
              protocol,
              service: service.split(' ')[0],
              state
            },
            severity: 'info',
            timestamp: new Date()
          })
        }
      }
    }
  } catch (error) {
    // Fallback: use nc for common ports
    console.warn('nmap not found, using alternative port scan')
    const commonPorts = [21, 22, 23, 25, 53, 80, 110, 143, 443, 445, 993, 995, 3306, 3389, 5432, 8080]

    for (const port of commonPorts) {
      try {
        const { stdout } = await execCommand(
          `timeout 2 bash -c 'echo >/dev/tcp/${target}/${port}' 2>/dev/null && echo 'open' || echo 'closed'`,
          5000
        )

        if (stdout.trim() === 'open') {
          results.push({
            type: 'port',
            data: {
              port,
              protocol: 'tcp',
              state: 'open',
              service: getServiceName(port)
            },
            severity: 'info',
            timestamp: new Date()
          })
        }
      } catch {
        // Port is closed
      }
    }
  }

  return results
}

// Get service name for common ports
function getServiceName(port: number): string {
  const services: Record<number, string> = {
    21: 'ftp', 22: 'ssh', 23: 'telnet', 25: 'smtp', 53: 'dns',
    80: 'http', 110: 'pop3', 143: 'imap', 443: 'https', 445: 'smb',
    993: 'imaps', 995: 'pop3s', 3306: 'mysql', 3389: 'rdp',
    5432: 'postgresql', 8080: 'http-proxy'
  }
  return services[port] || 'unknown'
}

// Service detection
async function detectServices(target: string) {
  const results = []

  // HTTP/HTTPS banner grabbing
  const httpPorts = [80, 443, 8080, 8443]

  for (const port of httpPorts) {
    try {
      const protocol = port === 443 || port === 8443 ? 'https' : 'http'
      const { stdout } = await execCommand(
        `timeout 5 curl -sI ${protocol}://${target}:${port} 2>/dev/null | head -20`,
        10000
      )

      if (stdout.trim()) {
        results.push({
          type: 'service',
          data: {
            port,
            protocol,
            type: 'http',
            headers: parseHttpHeaders(stdout)
          },
          severity: 'info',
          timestamp: new Date()
        })

        // Check for vulnerabilities
        checkSecurityHeaders(stdout, results)
      }
    } catch {
      // Service not available
    }
  }

  // SSH banner
  try {
    const { stdout } = await execCommand(
      `timeout 5 echo '' | nc -w 2 ${target} 22 2>/dev/null | head -1`,
      10000
    )

    if (stdout.trim() && stdout.includes('SSH')) {
      results.push({
        type: 'service',
        data: {
          port: 22,
          protocol: 'tcp',
          type: 'ssh',
          banner: stdout.trim()
        },
        severity: 'info',
        timestamp: new Date()
      })
    }
  } catch {
    // SSH not available
  }

  return results
}

// Parse HTTP headers
function parseHttpHeaders(output: string) {
  const headers: Record<string, string> = {}
  const lines = output.split('\n')

  for (const line of lines) {
    const match = line.match(/^([^:]+):\s*(.+)$/)
    if (match) {
      headers[match[1].trim()] = match[2].trim()
    }
  }

  return headers
}

// Check security headers
function checkSecurityHeaders(headersOutput: string, results: any[]) {
  const headers = parseHttpHeaders(headersOutput)
  const securityHeaders = ['X-Frame-Options', 'X-Content-Type-Options', 'Strict-Transport-Security', 'Content-Security-Policy', 'X-XSS-Protection']
  const missing = securityHeaders.filter(h => !headers[h])

  if (missing.length > 0) {
    results.push({
      type: 'vulnerability',
      data: {
        issue: 'Missing security headers',
        missing
      },
      severity: 'medium',
      timestamp: new Date()
    })
  }

  if (headers['Server']) {
    results.push({
      type: 'vulnerability',
      data: {
        issue: 'Server version disclosure',
        server: headers['Server']
      },
      severity: 'low',
      timestamp: new Date()
    })
  }

  if (headers['X-Powered-By']) {
    results.push({
      type: 'vulnerability',
      data: {
        issue: 'Technology stack disclosure',
        technology: headers['X-Powered-By']
      },
      severity: 'low',
      timestamp: new Date()
    })
  }
}

// Run reconnaissance with actual tool integration
async function runReconnaissance(taskId: string, target: string, taskType: string) {
  try {
    console.log(`Starting reconnaissance for ${target} (type: ${taskType})`)

    let results = []
    const totalSteps = 3

    // Step 1: Subdomain enumeration or initial scan
    await prisma.reconTask.update({
      where: { id: taskId },
      data: { progress: 20, status: 'running' }
    })
    io.to(`task-${taskId}`).emit('task-progress', {
      taskId,
      progress: 20,
      step: 1,
      totalSteps,
      status: 'running'
    })

    if (taskType === 'subdomain' || taskType === 'full_scan') {
      results = results.concat(await enumerateSubdomains(target))
    }

    // Step 2: Port scanning
    await prisma.reconTask.update({
      where: { id: taskId },
      data: { progress: 50, status: 'running' }
    })
    io.to(`task-${taskId}`).emit('task-progress', {
      taskId,
      progress: 50,
      step: 2,
      totalSteps,
      status: 'running'
    })

    if (taskType === 'port' || taskType === 'full_scan') {
      results = results.concat(await scanPorts(target))
    }

    // Step 3: Service detection
    await prisma.reconTask.update({
      where: { id: taskId },
      data: { progress: 75, status: 'running' }
    })
    io.to(`task-${taskId}`).emit('task-progress', {
      taskId,
      progress: 75,
      step: 3,
      totalSteps,
      status: 'running'
    })

    if (taskType === 'service' || taskType === 'full_scan') {
      results = results.concat(await detectServices(target))
    }

    // Save results to database
    for (const result of results) {
      await prisma.reconResult.create({
        data: {
          taskId,
          resultType: result.type,
          data: JSON.stringify(result.data),
          severity: result.severity || 'info',
          isVerified: true
        }
      })

      io.to(`task-${taskId}`).emit('result-found', {
        taskId,
        result
      })
    }

    // Mark task as completed
    const completedAt = new Date()
    await prisma.reconTask.update({
      where: { id: taskId },
      data: {
        progress: 100,
        status: 'completed',
        completedAt
      }
    })

    io.to(`task-${taskId}`).emit('task-completed', {
      taskId,
      completedAt: completedAt.toISOString(),
      totalResults: results.length
    })

    console.log(`Reconnaissance completed for task ${taskId}: ${results.length} results`)

  } catch (error) {
    console.error('Error running reconnaissance:', error)

    // Mark task as failed
    await prisma.reconTask.update({
      where: { id: taskId },
      data: {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    })

    io.to(`task-${taskId}`).emit('task-failed', {
      taskId,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

// Start server
httpServer.listen(PORT, () => {
  console.log(`Recon WebSocket Service running on port ${PORT}`)
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`)
})

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing connections...')
  await prisma.$disconnect()
  httpServer.close(() => {
    console.log('Server closed')
    process.exit(0)
  })
})

process.on('SIGINT', async () => {
  console.log('SIGINT received, closing connections...')
  await prisma.$disconnect()
  httpServer.close(() => {
    console.log('Server closed')
    process.exit(0)
  })
})
