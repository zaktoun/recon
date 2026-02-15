import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// DELETE /api/recon/targets/[id] - Delete a target
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    // Validate ID format
    if (!id || id.length < 1) {
      return NextResponse.json(
        { error: 'Invalid target ID' },
        { status: 400 }
      )
    }

    // Check if target exists
    const target = await db.reconTarget.findUnique({
      where: { id }
    })

    if (!target) {
      return NextResponse.json(
        { error: 'Target not found' },
        { status: 404 }
      )
    }

    // Delete target (cascade will delete related tasks and results)
    await db.reconTarget.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Target deleted successfully' })
  } catch (error) {
    console.error('Error deleting target:', error)
    return NextResponse.json(
      { error: 'Failed to delete target' },
      { status: 500 }
    )
  }
}
