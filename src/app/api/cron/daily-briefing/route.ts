import { NextRequest, NextResponse } from 'next/server';
import { generateDailyBriefings } from '@/lib/moltbot/features/briefing';

/**
 * Daily Briefing Cron Job
 *
 * POST /api/cron/daily-briefing
 *
 * Generates and posts Moltbot daily briefings to all active boards.
 * Designed to run at 8am daily via Vercel Cron.
 *
 * Security:
 * - In production, verify CRON_SECRET header
 * - In development, allow any request
 */
export async function GET(request: NextRequest) {
  return handleBriefingRequest(request);
}

export async function POST(request: NextRequest) {
  return handleBriefingRequest(request);
}

async function handleBriefingRequest(request: NextRequest) {
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
    console.log('[cron/daily-briefing] Starting daily briefing generation...');

    const result = await generateDailyBriefings();

    console.log(
      `[cron/daily-briefing] Complete: ${result.messagesPosted} messages posted to ${result.boardsProcessed} boards`
    );

    return NextResponse.json({
      success: result.success,
      boardsProcessed: result.boardsProcessed,
      messagesPosted: result.messagesPosted,
      errors: result.errors,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[cron/daily-briefing] Error:', error);

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
