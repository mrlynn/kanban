import type { NextAuthOptions } from 'next-auth';
import type { Provider } from 'next-auth/providers/index';
import GitHubProvider from 'next-auth/providers/github';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { getDb } from './mongodb';
import { BoardInvitation, BoardMember } from '@/types/team';
import { TenantInvitation, TenantUser } from '@/types/tenant';

const isDev = process.env.NODE_ENV === 'development';

const providers: Provider[] = [
  GitHubProvider({
    clientId: process.env.GITHUB_CLIENT_ID!,
    clientSecret: process.env.GITHUB_CLIENT_SECRET!,
  }),
];

// Add Google OAuth if configured
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  );
}

// Add dev-only credentials provider for local testing
if (isDev) {
  providers.push(
    CredentialsProvider({
      id: 'dev-login',
      name: 'Dev Login',
      credentials: {
        username: { label: 'Username', type: 'text', placeholder: 'mike' },
      },
      async authorize(credentials) {
        // In dev mode, allow any username
        if (credentials?.username) {
          return {
            id: 'dev-user',
            name: credentials.username,
            email: `${credentials.username}@localhost`,
            image: null,
          };
        }
        return null;
      },
    })
  );
}

/**
 * Check if an email has been invited to any board/tenant or is already a member
 */
async function hasInvitationOrMembership(email: string): Promise<boolean> {
  try {
    const db = await getDb();
    const normalizedEmail = email.toLowerCase();
    
    // Check for pending board invitation
    const boardInvitation = await db.collection<BoardInvitation>('boardInvitations').findOne({
      email: normalizedEmail,
      acceptedAt: { $exists: false },
      declinedAt: { $exists: false },
      expiresAt: { $gt: new Date() },
    });
    
    if (boardInvitation) {
      console.log('[Auth] User has pending board invitation:', normalizedEmail);
      return true;
    }
    
    // Check for pending tenant/workspace invitation
    const tenantInvitation = await db.collection<TenantInvitation>('tenantInvitations').findOne({
      email: normalizedEmail,
      acceptedAt: { $exists: false },
      declinedAt: { $exists: false },
      expiresAt: { $gt: new Date() },
    });
    
    if (tenantInvitation) {
      console.log('[Auth] User has pending tenant invitation:', normalizedEmail);
      return true;
    }
    
    // Check if already a board member
    const boardMembership = await db.collection<BoardMember>('boardMembers').findOne({
      email: normalizedEmail,
    });
    
    if (boardMembership) {
      console.log('[Auth] User is already a board member:', normalizedEmail);
      return true;
    }
    
    // Check if already a tenant member (user with any membership)
    const tenantUser = await db.collection<TenantUser>('users').findOne({
      email: normalizedEmail,
      'memberships.0': { $exists: true }, // Has at least one membership
    });
    
    if (tenantUser) {
      console.log('[Auth] User is already a tenant member:', normalizedEmail);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('[Auth] Error checking invitation/membership:', error);
    return false;
  }
}

export const authOptions: NextAuthOptions = {
  providers,
  callbacks: {
    async signIn({ user, profile, account }) {
      // Dev login always allowed
      if (account?.provider === 'dev-login') {
        return true;
      }
      
      const userEmail = user?.email?.toLowerCase();
      
      // GitHub: check against username allowlist OR invitation
      if (account?.provider === 'github') {
        const allowedUsers = process.env.ALLOWED_GITHUB_USERS?.split(',').map(u => u.toLowerCase().trim()) || [];
        const githubUsername = (profile as any)?.login?.toLowerCase();
        
        console.log('[Auth] GitHub username:', githubUsername);
        console.log('[Auth] Allowed GitHub users:', allowedUsers);
        
        if (allowedUsers.length === 0) {
          console.log('[Auth] No GitHub allowlist, allowing all');
          return true;
        }
        
        // Check allowlist first
        if (allowedUsers.includes(githubUsername)) {
          console.log('[Auth] GitHub user on allowlist');
          return true;
        }
        
        // Check if they have an invitation or membership
        if (userEmail && await hasInvitationOrMembership(userEmail)) {
          console.log('[Auth] GitHub user has invitation/membership, allowing');
          return true;
        }
        
        console.log('[Auth] GitHub user not allowed');
        return false;
      }
      
      // Google: check against email allowlist OR invitation
      if (account?.provider === 'google') {
        const allowedEmails = process.env.ALLOWED_GOOGLE_EMAILS?.split(',').map(e => e.toLowerCase().trim()) || [];
        
        console.log('[Auth] Google email:', userEmail);
        console.log('[Auth] Allowed Google emails:', allowedEmails);
        
        if (allowedEmails.length === 0) {
          // If no allowlist, allow anyone with Google (for testing)
          console.log('[Auth] No Google allowlist, allowing all');
          return true;
        }
        
        // Check allowlist first
        if (userEmail && allowedEmails.includes(userEmail)) {
          console.log('[Auth] Google email on allowlist');
          return true;
        }
        
        // Check if they have an invitation or membership
        if (userEmail && await hasInvitationOrMembership(userEmail)) {
          console.log('[Auth] Google user has invitation/membership, allowing');
          return true;
        }
        
        console.log('[Auth] Google user not allowed');
        return false;
      }
      
      // Default: allow (for any future providers)
      return true;
    },
    async session({ session, token }) {
      // Add user ID and username to session
      if (session.user) {
        (session.user as any).id = token.sub;
        (session.user as any).username = token.username || token.name;
      }
      return session;
    },
    async jwt({ token, profile, user }) {
      if (profile) {
        token.username = (profile as any).login;
      }
      if (user) {
        token.username = user.name;
      }
      return token;
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
};
