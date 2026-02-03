import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { requireAuth, AuthError } from '@/lib/tenant-auth';
import { 
  TenantUser, 
  TenantInvitation, 
  TENANT_ROLE_PERMISSIONS,
} from '@/types/tenant';
import { sendTenantInvitationEmail } from '@/lib/email';
import crypto from 'crypto';

function generateId(prefix: string): string {
  return `${prefix}_${crypto.randomBytes(8).toString('hex')}`;
}

function generateToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

/**
 * POST /api/tenant/invite
 * Send an invitation to join the workspace
 */
export async function POST(request: NextRequest) {
  try {
    const context = await requireAuth(request);
    const db = await getDb();
    
    // Check if user can manage members
    const membership = context.user?.memberships.find(
      m => m.tenantId === context.tenantId
    );
    const role = membership?.role || 'member';
    const permissions = TENANT_ROLE_PERMISSIONS[role];
    
    if (!permissions.canManageMembers) {
      return NextResponse.json(
        { error: 'You do not have permission to invite members' },
        { status: 403 }
      );
    }
    
    const { email, role: inviteRole = 'member' } = await request.json();
    
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }
    
    // Validate role
    if (!['admin', 'member'].includes(inviteRole)) {
      return NextResponse.json(
        { error: 'Role must be "admin" or "member"' },
        { status: 400 }
      );
    }
    
    // Only owners can invite admins
    if (inviteRole === 'admin' && !permissions.canManageAdmins) {
      return NextResponse.json(
        { error: 'Only workspace owners can invite admins' },
        { status: 403 }
      );
    }
    
    const normalizedEmail = email.toLowerCase().trim();
    const tenant = context.tenant;
    
    // Check if user is already a member
    const existingUser = await db.collection<TenantUser>('users').findOne({
      email: normalizedEmail,
      'memberships.tenantId': tenant.id,
    });
    
    if (existingUser) {
      return NextResponse.json(
        { error: 'This user is already a member of this workspace' },
        { status: 400 }
      );
    }
    
    // Check if there's already a pending invitation
    const existingInvite = await db.collection<TenantInvitation>('tenantInvitations').findOne({
      tenantId: tenant.id,
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
    
    // Check plan limits for member count
    const memberCount = await db.collection<TenantUser>('users').countDocuments({
      'memberships.tenantId': tenant.id,
    });
    
    if (tenant.limits.maxMembers !== -1 && memberCount >= tenant.limits.maxMembers) {
      return NextResponse.json(
        { error: `Your plan allows a maximum of ${tenant.limits.maxMembers} members. Please upgrade to add more.` },
        { status: 403 }
      );
    }
    
    // Create invitation
    const invitation: TenantInvitation = {
      id: generateId('tinvite'),
      tenantId: tenant.id,
      email: normalizedEmail,
      role: inviteRole as 'admin' | 'member',
      token: generateToken(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      createdAt: new Date(),
      createdBy: context.userId || 'system',
    };
    
    await db.collection<TenantInvitation>('tenantInvitations').insertOne(invitation);
    
    // Build accept URL
    const baseUrl = process.env.NEXTAUTH_URL || 'https://kanban.mlynn.org';
    const acceptUrl = `${baseUrl}/api/invitations/accept-tenant?token=${invitation.token}`;
    
    // Get inviter info
    const inviter = context.user || 
      await db.collection<TenantUser>('users').findOne({ id: context.userId });
    
    // Send email
    try {
      await sendTenantInvitationEmail({
        to: normalizedEmail,
        inviterName: inviter?.name || 'Someone',
        workspaceName: tenant.name,
        role: inviteRole,
        acceptUrl,
      });
    } catch (emailError) {
      console.error('Failed to send tenant invitation email:', emailError);
      return NextResponse.json({
        invitation: {
          id: invitation.id,
          email: invitation.email,
          role: invitation.role,
          expiresAt: invitation.expiresAt,
        },
        emailSent: false,
        acceptUrl,
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
    console.error('Error creating tenant invitation:', error);
    return NextResponse.json({ error: 'Failed to create invitation' }, { status: 500 });
  }
}
