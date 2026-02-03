import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { getToken } from 'next-auth/jwt';
import { BoardMember, BoardInvitation, generateMemberColor } from '@/types/team';
import { TenantUser } from '@/types/tenant';
import { sendMemberJoinedEmail } from '@/lib/email';
import crypto from 'crypto';

function generateId(prefix: string): string {
  return `${prefix}_${crypto.randomBytes(8).toString('hex')}`;
}

/**
 * GET /api/invitations/accept?token=xxx
 * Accept a board invitation
 * 
 * If user is logged in: add them as member
 * If not logged in: redirect to sign in, then back here
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    
    if (!token) {
      return redirectWithError(request, 'Invalid invitation link');
    }
    
    const db = await getDb();
    
    // Find the invitation
    const invitation = await db.collection<BoardInvitation>('boardInvitations').findOne({
      token,
      acceptedAt: { $exists: false },
      declinedAt: { $exists: false },
    });
    
    if (!invitation) {
      return redirectWithError(request, 'Invitation not found or already used');
    }
    
    // Check expiration
    if (invitation.expiresAt < new Date()) {
      return redirectWithError(request, 'This invitation has expired');
    }
    
    // Get the board
    const board = await db.collection('boards').findOne({ id: invitation.boardId });
    if (!board) {
      return redirectWithError(request, 'Board no longer exists');
    }
    
    // Check if user is logged in
    const jwtToken = await getToken({ req: request });
    
    if (!jwtToken?.email) {
      // Not logged in - redirect to sign in with return URL
      const baseUrl = process.env.NEXTAUTH_URL || 'https://kanban.mlynn.org';
      const returnUrl = `${baseUrl}/api/invitations/accept?token=${token}`;
      const signInUrl = `${baseUrl}/auth/signin?callbackUrl=${encodeURIComponent(returnUrl)}`;
      return NextResponse.redirect(signInUrl);
    }
    
    const userEmail = jwtToken.email.toLowerCase();
    
    // Verify the invitation is for this email
    if (invitation.email !== userEmail) {
      return redirectWithError(
        request, 
        `This invitation was sent to ${invitation.email}. Please sign in with that email address.`
      );
    }
    
    // Find existing user
    let existingUser = await db.collection<TenantUser>('users').findOne({
      email: userEmail,
    });
    
    // User details we'll use
    let userId: string;
    let userName: string;
    let userAvatar: string | undefined;
    
    if (existingUser) {
      userId = existingUser.id;
      userName = existingUser.name;
      userAvatar = existingUser.avatar;
    } else {
      // Create new user
      userId = generateId('user');
      userName = (jwtToken.name as string) || userEmail.split('@')[0];
      userAvatar = jwtToken.picture as string | undefined;
      const now = new Date();
      
      const newUser: TenantUser = {
        id: userId,
        email: userEmail,
        name: userName,
        avatar: userAvatar,
        provider: 'google',
        providerId: userEmail,
        memberships: [], // They don't get a tenant, just board access
        createdAt: now,
        updatedAt: now,
      };
      
      await db.collection<TenantUser>('users').insertOne(newUser);
    }
    
    // Check if already a member (race condition protection)
    const existingMember = await db.collection<BoardMember>('boardMembers').findOne({
      boardId: invitation.boardId,
      userId: userId,
    });
    
    if (existingMember) {
      // Already a member - just redirect to board
      const baseUrl = process.env.NEXTAUTH_URL || 'https://kanban.mlynn.org';
      return NextResponse.redirect(`${baseUrl}/board/${invitation.boardId}?joined=already`);
    }
    
    // Add as board member
    const member: BoardMember = {
      id: generateId('member'),
      boardId: invitation.boardId,
      tenantId: invitation.tenantId,
      userId: userId,
      email: userEmail,
      name: userName,
      avatar: userAvatar,
      role: invitation.role === 'viewer' ? 'viewer' : 'editor',
      color: generateMemberColor(),
      addedAt: new Date(),
      addedBy: invitation.createdBy,
    };
    
    await db.collection<BoardMember>('boardMembers').insertOne(member);
    
    // Mark invitation as accepted
    await db.collection<BoardInvitation>('boardInvitations').updateOne(
      { id: invitation.id },
      { $set: { acceptedAt: new Date() } }
    );
    
    // Notify board owner
    try {
      const tenant = await db.collection('tenants').findOne({ id: board.tenantId });
      const owner = tenant 
        ? await db.collection<TenantUser>('users').findOne({ id: tenant.ownerId })
        : null;
      
      if (owner?.email) {
        await sendMemberJoinedEmail({
          to: owner.email,
          newMemberName: userName,
          newMemberEmail: userEmail,
          boardName: board.name,
        });
      }
    } catch (emailError) {
      console.error('Failed to send member joined notification:', emailError);
      // Don't fail - this is just a notification
    }
    
    // Redirect to board
    const baseUrl = process.env.NEXTAUTH_URL || 'https://kanban.mlynn.org';
    return NextResponse.redirect(`${baseUrl}/board/${invitation.boardId}?joined=success`);
  } catch (error) {
    console.error('Error accepting invitation:', error);
    return redirectWithError(request, 'Something went wrong. Please try again.');
  }
}

function redirectWithError(request: NextRequest, message: string) {
  const baseUrl = process.env.NEXTAUTH_URL || 'https://kanban.mlynn.org';
  return NextResponse.redirect(
    `${baseUrl}/auth/error?error=${encodeURIComponent(message)}`
  );
}
