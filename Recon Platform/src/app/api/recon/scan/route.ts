import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST /api/recon/scan - Start a new scan
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { targetId, taskType } = body

    // Input validation
    if (!targetId || !taskType) {
      return NextResponse.json(
        { error: 'targetId and taskType are required' },
        { status: 400 }
      )
    }

    // Validate task type
    const validTaskTypes = ['subdomain', 'port', 'service', 'full_scan']
    if (!validTaskTypes.includes(taskType)) {
      return NextResponse.json(
        { error: 'Invalid taskType. Must be: subdomain, port, service, or full_scan' },
        { status: 400 }
      )
    }

    // Validate target ID format
    if (!targetId || targetId.length < 1) {
      return NextResponse.json(
        { error: 'Invalid target ID' },
        { status: 400 }
      )
    }

    // Check if target exists
    const target = await db.reconTarget.findUnique({
      where: { id: targetId }
    })

    if (!target) {
      return NextResponse.json(
        { error: 'Target not found' },
        { status: 404 }
      )
    }

    // Check if there's already a running scan for this target
    const runningTask = await db.reconTask.findFirst({
      where: {
        targetId,
        status: 'running'
      }
    })

    if (runningTask) {
      return NextResponse.json(
        { error: 'A scan is already running for this target' },
        { status: 409 }
      )
    }

    // Create new task
    const now = new Date()
    const task = await db.reconTask.create({
      data: {
        targetId,
        taskType,
        status: 'pending',
        progress: 0,
        startedAt: now
      }
    })

    // Trigger the scan (this will be handled by the WebSocket service)
    // For now, we'll update the status to running immediately
    await db.reconTask.update({
      where: { id: task.id },
      data: {
        status: 'running'
      }
    })

    // Simulate scan progress (in real implementation, this would be done by the recon service)
    simulateScan(task.id, taskType)

    return NextResponse.json({ task: { id: task.id } }, { status: 201 })
  } catch (error) {
    console.error('Error starting scan:', error)
    return NextResponse.json(
      { error: 'Failed to start scan' },
      { status: 500 }
    )
  }
}

// Simulate scan progress (placeholder - will be replaced by real recon service)
async function simulateScan(taskId: string, taskType: string) {
  const delays = [1000, 3000, 5000, 7000, 9000]
  const progressSteps = [20, 40, 60, 80, 100]

  try {
    for (let i = 0; i < progressSteps.length; i++) {
      await new Promise(resolve => setTimeout(resolve, delays[i] / 5)) // Faster simulation
      
      const progress = progressSteps[i]
      const isCompleted = progress === 100

      await db.reconTask.update({
        where: { id: taskId },
        data: {
          progress,
          status: isCompleted ? 'completed' : 'running',
          completedAt: isCompleted ? new Date() : null
        }
      })

      // In real implementation, results would be saved here
      if (isCompleted) {
        // Add sample results
        await db.reconResult.create({
          data: {
            taskId,
            resultType: taskType,
            data: JSON.stringify({ message: 'Scan completed successfully' }),
            severity: 'info',
            isVerified: true
          }
        })
      }
    }
  } catch (error) {
    console.error('Error in simulated scan:', error)
    await db.reconTask.update({
      where: { id: taskId },
      data: {
        status: 'failed',
        error: 'Scan failed during execution'
      }
    })
  }
}
