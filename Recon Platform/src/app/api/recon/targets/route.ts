import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/recon/targets - Get all targets
export async function GET() {
  try {
    const targets = await db.reconTarget.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({ targets })
  } catch (error) {
    console.error('Error fetching targets:', error)
    return NextResponse.json(
      { error: 'Failed to fetch targets' },
      { status: 500 }
    )
  }
}

// POST /api/recon/targets - Create new target
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { target, targetType, description } = body

    // Input validation
    if (!target || !targetType) {
      return NextResponse.json(
        { error: 'Target and targetType are required' },
        { status: 400 }
      )
    }

    // Validate target type
    const validTypes = ['domain', 'ip', 'url']
    if (!validTypes.includes(targetType)) {
      return NextResponse.json(
        { error: 'Invalid targetType. Must be: domain, ip, or url' },
        { status: 400 }
      )
    }

    // Security validation - prevent XSS and malicious input
    const dangerousPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+=/i,
      /eval\(/i,
      /<iframe/i,
      /data:/i,
      /vbscript:/i
    ]

    for (const pattern of dangerousPatterns) {
      if (pattern.test(target)) {
        return NextResponse.json(
          { error: 'Invalid target: contains potentially dangerous input' },
          { status: 400 }
        )
      }
    }

    // Validate target format based on type
    if (targetType === 'domain') {
      // Domain validation
      const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
      if (!domainRegex.test(target)) {
        return NextResponse.json(
          { error: 'Invalid domain format' },
          { status: 400 }
        )
      }
    } else if (targetType === 'ip') {
      // IP validation (IPv4)
      const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
      if (!ipRegex.test(target)) {
        return NextResponse.json(
          { error: 'Invalid IP address format (must be IPv4)' },
          { status: 400 }
        )
      }
    } else if (targetType === 'url') {
      // URL validation
      try {
        const url = new URL(target)
        if (!['http:', 'https:'].includes(url.protocol)) {
          return NextResponse.json(
            { error: 'URL must use HTTP or HTTPS protocol' },
            { status: 400 }
          )
        }
      } catch {
        return NextResponse.json(
          { error: 'Invalid URL format' },
          { status: 400 }
        )
      }
    }

    // Check if target already exists
    const existing = await db.reconTarget.findFirst({
      where: {
        target: target.toLowerCase()
      }
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Target already exists' },
        { status: 409 }
      )
    }

    // Create new target
    const newTarget = await db.reconTarget.create({
      data: {
        target: target.toLowerCase(),
        targetType,
        description: description || null
      }
    })

    return NextResponse.json({ target: newTarget }, { status: 201 })
  } catch (error) {
    console.error('Error creating target:', error)
    return NextResponse.json(
      { error: 'Failed to create target' },
      { status: 500 }
    )
  }
}
