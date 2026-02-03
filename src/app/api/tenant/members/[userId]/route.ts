import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { requireAuth, AuthError } from '@/lib/tenant-auth';
import { 
  TenantUser, 
  TenantInvitation,
  TenantRole,
  TENANT_ROLE_PERMISSIONS,
} from '@/types/tenant';

/**
 * PATCH /api/tenant/members/[userId]
 * Update a member's role
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const context = await requireAuth(request);
    const { userId } = await params;
    const { role: newRole } = await request.json();
    
    if (!newRole || !['admin', 'member'].includes(newRole)) {
      return NextResponse.json(
        { error: 'Role must be "admin" or "member"' },
        { status: 400 }
      );
    }
    
    // Get current user's permissions
    const currentMembership = context.user?.memberships.find(
      m => m.tenantId === context.tenantId
    );
    const currentRole = currentMembership?.role || 'member';
    const permissions = TENANT_ROLE_PERMISSIONS[currentRole];
    
    if (!permissions.canManageMembers) {
      return NextResponse.json(
        { error: 'You do not have permission to manage members' },
        { status: 403 }
      );
    }
    
    // Only owners can change roles to/from admin
    if (newRole === 'admin' && !permissions.canManageAdmins) {
      return NextResponse.json(
        { error: 'Only workspace owners can promote members to admin' },
        { status: 403 }
      );
    }
    
    const db = await getDb();
    
    // Check if this is an invitation or a user
    if (userId.startsWith('tinvite_')) {
      // Update invitation role
      const result = await db.collection<TenantInvitation>('tenantInvitations').updateOne(
        { 
          id: userId,
          tenantId: context.tenantId,
          acceptedAt: { $exists: false },
        },
        { $set: { role: newRole } }
      );
      
      if (result.matchedCount === 0) {
        return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
      }
      
      return NextResponse.json({ success: true, updated: 'invitation' });
    }
    
    // Find the target user
    const targetUser = await db.collection<TenantUser>('users').findOne({
      id: userId,
      'memberships.tenantId': context.tenantId,
    });
    
    if (!targetUser) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }
    
    // Get target user's current role
    const targetMembership = targetUser.memberships.find(
      m => m.tenantId === context.tenantId
    );
    const targetCurrentRole = targetMembership?.role;
    
    // Cannot change owner's role
    if (targetCurrentRole === 'owner') {
      return NextResponse.json(
        { error: 'Cannot change the owner\'s role' },
        { status: 403 }
      );
    }
    
    // If demoting an admin, must be owner
    if (targetCurrentRole === 'admin' && !permissions.canManageAdmins) {
      return NextResponse.json(
        { error: 'Only workspace owners can demote admins' },
        { status: 403 }
      );
    }
    
    // Cannot change your own role
    if (userId === context.userId) {
      return NextResponse.json(
        { error: 'You cannot change your own role' },
        { status: 400 }
      );
    }
    
    // Update the user's membership role
    await db.collection<TenantUser>('users').updateOne(
      { 
        id: userId,
        'memberships.tenantId': context.tenantId,
      },
      { 
        $set: { 
          'memberships.$.role': newRole,
          updatedAt: new Date(),
        } 
      }
    );
    
    return NextResponse.json({ success: true, role: newRole });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Error updating member role:', error);
    return NextResponse.json({ error: 'Failed to update member' }, { status: 500 });
  }
}

/**
 * DELETE /api/tenant/members/[userId]
 * Remove a member from the workspace (or cancel invitation)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const context = await requireAuth(request);
    const { userId } = await params;
    
    // Get current user's permissions
    const currentMembership = context.user?.memberships.find(
      m => m.tenantId === context.tenantId
    );
    const currentRole = currentMembership?.role || 'member';
    const permissions = TENANT_ROLE_PERMISSIONS[currentRole];
    
    if (!permissions.canManageMembers) {
      return NextResponse.json(
        { error: 'You do not have permission to remove members' },
        { status: 403 }
      );
    }
    
    const db = await getDb();
    
    // Check if this is an invitation
    if (userId.startsWith('tinvite_')) {
      // Cancel invitation
      const result = await db.collection<TenantInvitation>('tenantInvitations').updateOne(
        { 
          id: userId,
          tenantId: context.tenantId,
          acceptedAt: { $exists: false },
        },
        { $set: { declinedAt: new Date() } }
      );
      
      if (result.matchedCount === 0) {
        return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
      }
      
      return NextResponse.json({ success: true, removed: 'invitation' });
    }
    
    // Find the target user
    const targetUser = await db.collection<TenantUser>('users').findOne({
      id: userId,
      'memberships.tenantId': context.tenantId,
    });
    
    if (!targetUser) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }
    
    // Get target user's current role
    const targetMembership = targetUser.memberships.find(
      m => m.tenantId === context.tenantId
    );
    const targetRole = targetMembership?.role;
    
    // Cannot remove owner
    if (targetRole === 'owner') {
      return NextResponse.json(
        { error: 'Cannot remove the workspace owner' },
        { status: 403 }
      );
    }
    
    // Must be owner to remove admins
    if (targetRole === 'admin' && !permissions.canManageAdmins) {
      return NextResponse.json(
        { error: 'Only workspace owners can remove admins' },
        { status: 403 }
      );
    }
    
    // Cannot remove yourself (use leave workspace instead)
    if (userId === context.userId) {
      return NextResponse.json(
        { error: 'You cannot remove yourself. Use "Leave Workspace" instead.' },
        { status: 400 }
      );
    }
    
    // Remove the membership from the user
    await db.collection<TenantUser>('users').updateOne(
      { id: userId },
      { 
        $pull: { memberships: { tenantId: context.tenantId } } as any,
        $set: { updatedAt: new Date() },
      }
    );
    
    // If user's active tenant was this one, clear it
    if (targetUser.activeTenantId === context.tenantId) {
      const remainingMembership = targetUser.memberships.find(
        m => m.tenantId !== context.tenantId
      );
      await db.collection<TenantUser>('users').updateOne(
        { id: userId },
        { 
          $set: { 
            activeTenantId: remainingMembership?.tenantId || undefined,
          } 
        }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Error removing member:', error);
    return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 });
  }
}
