import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/recon/tasks - Get all tasks
export async function GET() {
  try {
    const tasks = await db.reconTask.findMany({
      include: {
        target: {
          select: {
            target: true,
            targetType: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 50 // Limit to last 50 tasks
    })

    // Format response
    const formattedTasks = tasks.map(task => ({
      id: task.id,
      taskType: task.taskType,
      status: task.status,
      progress: task.progress,
      startedAt: task.startedAt?.toISOString(),
      completedAt: task.completedAt?.toISOString(),
      error: task.error,
      target: task.target.target,
      targetType: task.target.targetType
    }))

    return NextResponse.json({ tasks: formattedTasks })
  } catch (error) {
    console.error('Error fetching tasks:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    )
  }
}
