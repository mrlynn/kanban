import { NextRequest, NextResponse } from 'next/server';
import { detectAndAlertStuckTasks } from '@/lib/agent/features/stuck-detector';

/**
 * Stuck Task Detection Cron Job
 *
 * GET/POST /api/cron/check-stuck
 *
 * Checks all boards for tasks stuck too long and sends alerts.
 * Designed to run every 6 hours via Vercel Cron.
 */
export async function GET(request: NextRequest) {
  return handleStuckCheck(request);
}

export async function POST(request: NextRequest) {
  return handleStuckCheck(request);
}

async function handleStuckCheck(request: NextRequest) {
  // Verify cron secret in production
  if (process.env.NODE_ENV === 'production') {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
  }

  try {
    console.log('[cron/check-stuck] Starting stuck task detection...');

    const result = await detectAndAlertStuckTasks();

    console.log(
      `[cron/check-stuck] Complete: ${result.stuckFound} stuck tasks found, ${result.alertsSent} alerts sent`
    );

    return NextResponse.json({
      success: result.success,
      tasksChecked: result.tasksChecked,
      stuckFound: result.stuckFound,
      alertsSent: result.alertsSent,
      errors: result.errors,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[cron/check-stuck] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: String(error),
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
