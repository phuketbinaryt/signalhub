import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');
    const level = searchParams.get('level');
    const category = searchParams.get('category');
    const search = searchParams.get('search');

    // Build where clause
    const where: any = {};

    if (level && level !== 'all') {
      where.level = level;
    }

    if (category && category !== 'all') {
      where.category = category;
    }

    if (search) {
      where.OR = [
        { message: { contains: search, mode: 'insensitive' } },
        { metadata: { path: ['ticker'], string_contains: search } },
        { metadata: { path: ['strategy'], string_contains: search } },
        { metadata: { path: ['configName'], string_contains: search } },
      ];
    }

    // Get logs with pagination
    const [logs, total] = await Promise.all([
      prisma.appLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: Math.min(limit, 500),
        skip: offset,
      }),
      prisma.appLog.count({ where }),
    ]);

    return NextResponse.json({
      logs,
      total,
      limit,
      offset,
    });
  } catch (error: any) {
    console.error('Error fetching logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch logs' },
      { status: 500 }
    );
  }
}

// DELETE - Clear all logs
export async function DELETE(request: NextRequest) {
  try {
    await prisma.appLog.deleteMany({});

    return NextResponse.json({
      success: true,
      message: 'All logs cleared',
    });
  } catch (error: any) {
    console.error('Error clearing logs:', error);
    return NextResponse.json(
      { error: 'Failed to clear logs' },
      { status: 500 }
    );
  }
}
