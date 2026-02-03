import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { requireAuth, AuthError } from '@/lib/tenant-auth';
import { 
  TenantUser, 
  TenantInvitation, 
  TenantTeamMember,
  TenantRole,
  TENANT_ROLE_PERMISSIONS,
} from '@/types/tenant';

/**
 * GET /api/tenant/members
 * List all workspace members and pending invitations
 */
export async function GET(request: NextRequest) {
  try {
    const context = await requireAuth(request);
    const db = await getDb();
    
    // Get the tenant
    const tenant = context.tenant;
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }
    
    // Get all users who are members of this tenant
    const users = await db
      .collection<TenantUser>('users')
      .find({
        'memberships.tenantId': tenant.id,
      })
      .toArray();
    
    // Get pending invitations
    const invitations = await db
      .collection<TenantInvitation>('tenantInvitations')
      .find({
        tenantId: tenant.id,
        acceptedAt: { $exists: false },
        declinedAt: { $exists: false },
        expiresAt: { $gt: new Date() },
      })
      .sort({ createdAt: -1 })
      .toArray();
    
    // Build unified response
    const members: TenantTeamMember[] = [];
    
    // Add active members
    for (const user of users) {
      const membership = user.memberships.find(m => m.tenantId === tenant.id);
      if (membership) {
        members.push({
          id: user.id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
          role: membership.role,
          status: 'active',
          joinedAt: membership.joinedAt,
        });
      }
    }
    
    // Sort by role (owner first, then admin, then member)
    const roleOrder: Record<TenantRole, number> = { owner: 0, admin: 1, member: 2 };
    members.sort((a, b) => roleOrder[a.role] - roleOrder[b.role]);
    
    // Add pending invitations
    for (const invite of invitations) {
      members.push({
        id: invite.id,
        email: invite.email,
        name: invite.email.split('@')[0],
        role: invite.role,
        status: 'pending',
        joinedAt: invite.createdAt,
        invitationId: invite.id,
        expiresAt: invite.expiresAt,
      });
    }
    
    // Get current user's role
    const currentUserMembership = context.user?.memberships.find(
      m => m.tenantId === tenant.id
    );
    const currentUserRole = currentUserMembership?.role || 'member';
    const permissions = TENANT_ROLE_PERMISSIONS[currentUserRole];
    
    return NextResponse.json({
      members,
      currentUserRole,
      canManageMembers: permissions.canManageMembers,
      canManageAdmins: permissions.canManageAdmins,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Error fetching tenant members:', error);
    return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 });
  }
}
