import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export interface ReconResult {
  type: string
  data: any
  severity?: 'critical' | 'high' | 'medium' | 'low' | 'info'
  timestamp: Date
}

export interface ReconOptions {
  timeout?: number
  maxRetries?: number
}

/**
 * Execute shell command with timeout and error handling
 */
async function executeCommand(
  command: string,
  options: { timeout?: number } = {}
): Promise<{ stdout: string; stderr: string }> {
  const { timeout = 30000 } = options

  try {
    return await execAsync(command, { timeout })
  } catch (error: any) {
    if (error.killed && error.signal === 'SIGTERM') {
      throw new Error(`Command timed out after ${timeout}ms: ${command}`)
    }
    throw error
  }
}

/**
 * Subdomain Enumeration
 * Uses multiple techniques for comprehensive subdomain discovery
 */
export async function enumerateSubdomains(
  domain: string,
  options: ReconOptions = {}
): Promise<ReconResult[]> {
  const results: ReconResult[] = []

  try {
    console.log(`Starting subdomain enumeration for ${domain}`)

    // Method 1: Using dig for DNS enumeration
    try {
      const { stdout } = await executeCommand(
        `dig +short ANY ${domain}`,
        { timeout: 10000 }
      )

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

    // Method 2: Check for common subdomains (wordlist-based simulation)
    const commonSubdomains = [
      'www', 'api', 'dev', 'staging', 'test', 'mail', 'ftp', 'admin',
      'portal', 'blog', 'shop', 'app', 'secure', 'vpn', 'cdn', 'static',
      'assets', 'img', 'images', 'docs', 'docs', 'help', 'support', 'status'
    ]

    for (const subdomain of commonSubdomains) {
      const fullDomain = `${subdomain}.${domain}`
      try {
        const { stdout } = await executeCommand(
          `dig +short ${fullDomain} A`,
          { timeout: 5000 }
        )

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
        // Subdomain doesn't exist, skip
      }
    }

    console.log(`Subdomain enumeration completed: found ${results.length} results`)
    return results

  } catch (error) {
    console.error('Error in subdomain enumeration:', error)
    throw error
  }
}

/**
 * Port Scanning
 * Uses nmap for comprehensive port discovery
 */
export async function scanPorts(
  target: string,
  options: ReconOptions = {}
): Promise<ReconResult[]> {
  const results: ReconResult[] = []

  try {
    console.log(`Starting port scan for ${target}`)

    // Check if nmap is available
    try {
      await executeCommand('which nmap', { timeout: 5000 })
    } catch {
      console.warn('nmap not found, using alternative method')
      return scanPortsAlternative(target, options)
    }

    // Scan common ports (1-1024)
    const { stdout } = await executeCommand(
      `nmap -sS -p 1-1024 --top-ports 100 -T4 ${target}`,
      { timeout: 60000 }
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

    console.log(`Port scan completed: found ${results.length} open ports`)
    return results

  } catch (error) {
    console.error('Error in port scan:', error)
    throw error
  }
}

/**
 * Alternative Port Scanning (without nmap)
 */
async function scanPortsAlternative(
  target: string,
  options: ReconOptions = {}
): Promise<ReconResult[]> {
  const results: ReconResult[] = []

  try {
    // Use netcat or bash to check common ports
    const commonPorts = [
      21, 22, 23, 25, 53, 80, 110, 143, 443, 445, 993, 995, 3306, 3389, 5432, 8080
    ]

    for (const port of commonPorts) {
      try {
        // Try to connect with timeout
        const { stdout } = await executeCommand(
          `timeout 2 bash -c 'echo >/dev/tcp/${target}/${port}' 2>/dev/null && echo 'open' || echo 'closed'`,
          { timeout: 5000 }
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
        // Port is closed or filtered
      }
    }

    return results

  } catch (error) {
    console.error('Error in alternative port scan:', error)
    throw error
  }
}

/**
 * Get service name for common ports
 */
function getServiceName(port: number): string {
  const services: Record<number, string> = {
    21: 'ftp',
    22: 'ssh',
    23: 'telnet',
    25: 'smtp',
    53: 'dns',
    80: 'http',
    110: 'pop3',
    143: 'imap',
    443: 'https',
    445: 'smb',
    993: 'imaps',
    995: 'pop3s',
    3306: 'mysql',
    3389: 'rdp',
    5432: 'postgresql',
    8080: 'http-proxy'
  }

  return services[port] || 'unknown'
}

/**
 * Service Detection and Banner Grabbing
 */
export async function detectServices(
  target: string,
  options: ReconOptions = {}
): Promise<ReconResult[]> {
  const results: ReconResult[] = []

  try {
    console.log(`Starting service detection for ${target}`)

    // HTTP/HTTPS banner grabbing
    const httpPorts = [80, 443, 8080, 8443]

    for (const port of httpPorts) {
      try {
        const protocol = port === 443 || port === 8443 ? 'https' : 'http'
        const { stdout } = await executeCommand(
          `timeout 5 curl -sI ${protocol}://${target}:${port} 2>/dev/null | head -20`,
          { timeout: 10000 }
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

          // Check for vulnerabilities in headers
          checkSecurityHeaders(stdout, results)
        }
      } catch {
        // Service not available
      }
    }

    // SSH banner grabbing
    try {
      const { stdout } = await executeCommand(
        `timeout 5 echo '' | nc -w 2 ${target} 22 2>/dev/null | head -1`,
        { timeout: 10000 }
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

    console.log(`Service detection completed: found ${results.length} services`)
    return results

  } catch (error) {
    console.error('Error in service detection:', error)
    throw error
  }
}

/**
 * Parse HTTP headers
 */
function parseHttpHeaders(output: string): Record<string, string> {
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

/**
 * Check for security issues in HTTP headers
 */
function checkSecurityHeaders(headersOutput: string, results: ReconResult[]) {
  const headers = parseHttpHeaders(headersOutput)

  // Check for missing security headers
  const securityHeaders = [
    'X-Frame-Options',
    'X-Content-Type-Options',
    'Strict-Transport-Security',
    'Content-Security-Policy',
    'X-XSS-Protection'
  ]

  const missingHeaders = securityHeaders.filter(h => !headers[h])

  if (missingHeaders.length > 0) {
    results.push({
      type: 'vulnerability',
      data: {
        issue: 'Missing security headers',
        missing: missingHeaders
      },
      severity: 'medium',
      timestamp: new Date()
    })
  }

  // Check for server disclosure
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

  // Check for X-Powered-By header
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

/**
 * Full Reconnaissance Scan
 * Combines all reconnaissance techniques
 */
export async function fullScan(
  target: string,
  targetId: string,
  onProgress?: (progress: number, message: string) => void
): Promise<ReconResult[]> {
  const allResults: ReconResult[] = []

  try {
    const totalSteps = 3
    let currentStep = 0

    // Step 1: Subdomain enumeration
    currentStep++
    onProgress?.(
      Math.round((currentStep / totalSteps) * 100),
      'Enumerating subdomains...'
    )

    const subdomainResults = await enumerateSubdomains(target)
    allResults.push(...subdomainResults)

    // Step 2: Port scanning
    currentStep++
    onProgress?.(
      Math.round((currentStep / totalSteps) * 100),
      'Scanning ports...'
    )

    const portResults = await scanPorts(target)
    allResults.push(...portResults)

    // Step 3: Service detection
    currentStep++
    onProgress?.(
      Math.round((currentStep / totalSteps) * 100),
      'Detecting services...'
    )

    const serviceResults = await detectServices(target)
    allResults.push(...serviceResults)

    onProgress?.(100, 'Scan completed')

    console.log(`Full scan completed: ${allResults.length} results`)
    return allResults

  } catch (error) {
    console.error('Error in full scan:', error)
    throw error
  }
}

/**
 * Validate target before scanning
 */
export function validateTarget(target: string, targetType: string): {
  valid: boolean
  error?: string
} {
  // Basic security validation
  const dangerousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+=/i,
    /eval\(/i,
    /<iframe/i,
    /data:/i,
    /vbscript:/i,
    /;|\$\(|`/ // Command injection patterns
  ]

  for (const pattern of dangerousPatterns) {
    if (pattern.test(target)) {
      return {
        valid: false,
        error: 'Invalid target: contains potentially dangerous input'
      }
    }
  }

  // Type-specific validation
  if (targetType === 'ip') {
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
    if (!ipRegex.test(target)) {
      return {
        valid: false,
        error: 'Invalid IP address format'
      }
    }

    // Check for private IP addresses (optional: can be configured)
    const privateIPRegex = /^(10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.)/
    if (privateIPRegex.test(target)) {
      return {
        valid: false,
        error: 'Scanning private IP addresses is not allowed'
      }
    }
  }

  if (targetType === 'domain') {
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
    if (!domainRegex.test(target)) {
      return {
        valid: false,
        error: 'Invalid domain format'
      }
    }
  }

  if (targetType === 'url') {
    try {
      const url = new URL(target)
      if (!['http:', 'https:'].includes(url.protocol)) {
        return {
          valid: false,
          error: 'URL must use HTTP or HTTPS protocol'
        }
      }
    } catch {
      return {
        valid: false,
        error: 'Invalid URL format'
      }
    }
  }

  return { valid: true }
}
