import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { requireAuth, AuthError } from '@/lib/tenant-auth';
import { requireBoardAccess, BoardAccessError } from '@/lib/board-access';
import { BoardMember, BoardInvitation } from '@/types/team';
import { TenantUser } from '@/types/tenant';
import { sendBoardInvitationEmail } from '@/lib/email';
import crypto from 'crypto';

function generateId(prefix: string): string {
  return `${prefix}_${crypto.randomBytes(8).toString('hex')}`;
}

function generateToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

/**
 * POST /api/boards/[boardId]/invite
 * Send an invitation to join a board
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ boardId: string }> }
) {
  try {
    const context = await requireAuth(request);
    const { boardId } = await params;
    
    // Only owners can invite members
    await requireBoardAccess(boardId, context, 'owner');
    
    const { email, role = 'editor' } = await request.json();
    
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }
    
    if (!['editor', 'viewer'].includes(role)) {
      return NextResponse.json(
        { error: 'Role must be "editor" or "viewer"' },
        { status: 400 }
      );
    }
    
    const normalizedEmail = email.toLowerCase().trim();
    
    const db = await getDb();
    
    // Get the board
    const board = await db.collection('boards').findOne({ id: boardId });
    if (!board) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 });
    }
    
    // Get inviter info
    const inviter = context.user || 
      await db.collection<TenantUser>('users').findOne({ id: context.userId });
    
    // Check if user is already a member
    const existingMember = await db.collection<BoardMember>('boardMembers').findOne({
      boardId,
      email: normalizedEmail,
    });
    
    if (existingMember) {
      return NextResponse.json(
        { error: 'This user is already a member of this board' },
        { status: 400 }
      );
    }
    
    // Check if there's already a pending invitation
    const existingInvite = await db.collection<BoardInvitation>('boardInvitations').findOne({
      boardId,
      email: normalizedEmail,
      acceptedAt: { $exists: false },
      declinedAt: { $exists: false },
      expiresAt: { $gt: new Date() },
    });
    
    if (existingInvite) {
      return NextResponse.json(
        { error: 'An invitation has already been sent to this email' },
        { status: 400 }
      );
    }
    
    // Check if inviting yourself (tenant owner)
    const tenant = await db.collection('tenants').findOne({ id: board.tenantId });
    const owner = tenant 
      ? await db.collection<TenantUser>('users').findOne({ id: tenant.ownerId })
      : null;
    
    if (owner?.email.toLowerCase() === normalizedEmail) {
      return NextResponse.json(
        { error: 'You cannot invite yourself - you already own this board' },
        { status: 400 }
      );
    }
    
    // Create invitation
    const invitation: BoardInvitation = {
      id: generateId('invite'),
      boardId,
      tenantId: board.tenantId,
      email: normalizedEmail,
      role: role as 'editor' | 'viewer',
      token: generateToken(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      createdAt: new Date(),
      createdBy: context.userId || 'system',
    };
    
    await db.collection<BoardInvitation>('boardInvitations').insertOne(invitation);
    
    // Build accept URL
    const baseUrl = process.env.NEXTAUTH_URL || 'https://kanban.mlynn.org';
    const acceptUrl = `${baseUrl}/api/invitations/accept?token=${invitation.token}`;
    
    // Send email
    try {
      await sendBoardInvitationEmail({
        to: normalizedEmail,
        inviterName: inviter?.name || 'Someone',
        boardName: board.name,
        role,
        acceptUrl,
      });
    } catch (emailError) {
      console.error('Failed to send invitation email:', emailError);
      // Don't fail the request - invitation was created
      return NextResponse.json({
        invitation: {
          id: invitation.id,
          email: invitation.email,
          role: invitation.role,
          expiresAt: invitation.expiresAt,
        },
        emailSent: false,
        acceptUrl, // Return URL so user can share manually
        warning: 'Invitation created but email could not be sent. Share the link manually.',
      }, { status: 201 });
    }
    
    return NextResponse.json({
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        expiresAt: invitation.expiresAt,
      },
      emailSent: true,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof BoardAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Error creating invitation:', error);
    return NextResponse.json({ error: 'Failed to create invitation' }, { status: 500 });
  }
}
