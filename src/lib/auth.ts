import { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

/**
 * Check if request is authenticated via API key or session
 */
export async function isAuthenticated(request: NextRequest): Promise<boolean> {
  // Check for API key
  const apiKey = request.headers.get('x-api-key');
  const envKey = process.env.KANBAN_API_KEY?.trim();
  if (apiKey && envKey && apiKey === envKey) {
    return true;
  }

  // Check for session token
  const token = await getToken({ req: request });
  return !!token;
}

/**
 * Unauthorized response
 */
export function unauthorizedResponse() {
  return Response.json({ error: 'Unauthorized' }, { status: 401 });
}
