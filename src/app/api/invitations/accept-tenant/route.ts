import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { getToken } from 'next-auth/jwt';
import { TenantUser, TenantInvitation } from '@/types/tenant';
import crypto from 'crypto';

function generateId(prefix: string): string {
  return `${prefix}_${crypto.randomBytes(8).toString('hex')}`;
}

/**
 * GET /api/invitations/accept-tenant?token=xxx
 * Accept a workspace/tenant invitation
 * 
 * If user is logged in: add them as workspace member
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
    const invitation = await db.collection<TenantInvitation>('tenantInvitations').findOne({
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
    
    // Get the tenant
    const tenant = await db.collection('tenants').findOne({ id: invitation.tenantId });
    if (!tenant) {
      return redirectWithError(request, 'Workspace no longer exists');
    }
    
    // Check if user is logged in
    const jwtToken = await getToken({ req: request });
    
    if (!jwtToken?.email) {
      // Not logged in - redirect to sign in with return URL
      const baseUrl = process.env.NEXTAUTH_URL || 'https://kanban.mlynn.org';
      const returnUrl = `${baseUrl}/api/invitations/accept-tenant?token=${token}`;
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
    
    // Find or create user
    let user = await db.collection<TenantUser>('users').findOne({
      email: userEmail,
    });
    
    const now = new Date();
    
    if (user) {
      // Check if already a member of this tenant
      const existingMembership = user.memberships.find(
        m => m.tenantId === invitation.tenantId
      );
      
      if (existingMembership) {
        // Already a member - just redirect to dashboard
        const baseUrl = process.env.NEXTAUTH_URL || 'https://kanban.mlynn.org';
        return NextResponse.redirect(`${baseUrl}/dashboard?joined=already`);
      }
      
      // Add membership to existing user
      await db.collection<TenantUser>('users').updateOne(
        { id: user.id },
        {
          $push: {
            memberships: {
              tenantId: invitation.tenantId,
              role: invitation.role,
              joinedAt: now,
            },
          } as any,
          $set: {
            activeTenantId: invitation.tenantId, // Switch to the new workspace
            updatedAt: now,
          },
        }
      );
    } else {
      // Create new user with membership to this tenant only
      const userId = generateId('user');
      const userName = (jwtToken.name as string) || userEmail.split('@')[0];
      const userAvatar = jwtToken.picture as string | undefined;
      
      const newUser: TenantUser = {
        id: userId,
        email: userEmail,
        name: userName,
        avatar: userAvatar,
        provider: 'google',
        providerId: userEmail,
        memberships: [{
          tenantId: invitation.tenantId,
          role: invitation.role,
          joinedAt: now,
        }],
        activeTenantId: invitation.tenantId,
        createdAt: now,
        updatedAt: now,
      };
      
      await db.collection<TenantUser>('users').insertOne(newUser);
    }
    
    // Mark invitation as accepted
    await db.collection<TenantInvitation>('tenantInvitations').updateOne(
      { id: invitation.id },
      { $set: { acceptedAt: now } }
    );
    
    // Redirect to dashboard
    const baseUrl = process.env.NEXTAUTH_URL || 'https://kanban.mlynn.org';
    return NextResponse.redirect(`${baseUrl}/dashboard?joined=success&workspace=${encodeURIComponent(tenant.name)}`);
  } catch (error) {
    console.error('Error accepting tenant invitation:', error);
    return redirectWithError(request, 'Something went wrong. Please try again.');
  }
}

function redirectWithError(request: NextRequest, message: string) {
  const baseUrl = process.env.NEXTAUTH_URL || 'https://kanban.mlynn.org';
  return NextResponse.redirect(
    `${baseUrl}/auth/error?error=${encodeURIComponent(message)}`
  );
}
