import NextAuth from 'next-auth';
import type { Provider } from 'next-auth/providers/index';
import GitHubProvider from 'next-auth/providers/github';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';

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

const handler = NextAuth({
  providers,
  callbacks: {
    async signIn({ user, profile, account }) {
      // Dev login always allowed
      if (account?.provider === 'dev-login') {
        return true;
      }
      
      // GitHub: check against username allowlist
      if (account?.provider === 'github') {
        const allowedUsers = process.env.ALLOWED_GITHUB_USERS?.split(',').map(u => u.toLowerCase().trim()) || [];
        const githubUsername = (profile as any)?.login?.toLowerCase();
        
        console.log('[Auth] GitHub username:', githubUsername);
        console.log('[Auth] Allowed GitHub users:', allowedUsers);
        
        if (allowedUsers.length === 0) {
          console.log('[Auth] No GitHub allowlist, allowing all');
          return true;
        }
        
        const isAllowed = allowedUsers.includes(githubUsername);
        console.log('[Auth] GitHub allowed:', isAllowed);
        return isAllowed;
      }
      
      // Google: check against email allowlist
      if (account?.provider === 'google') {
        const allowedEmails = process.env.ALLOWED_GOOGLE_EMAILS?.split(',').map(e => e.toLowerCase().trim()) || [];
        const userEmail = user?.email?.toLowerCase();
        
        console.log('[Auth] Google email:', userEmail);
        console.log('[Auth] Allowed Google emails:', allowedEmails);
        
        if (allowedEmails.length === 0) {
          // If no allowlist, allow anyone with Google (for testing)
          console.log('[Auth] No Google allowlist, allowing all');
          return true;
        }
        
        const isAllowed = userEmail ? allowedEmails.includes(userEmail) : false;
        console.log('[Auth] Google allowed:', isAllowed);
        return isAllowed;
      }
      
      // Default: allow (for any future providers)
      return true;
    },
    async session({ session, token }) {
      // Add username to session
      if (session.user) {
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
});

export { handler as GET, handler as POST };
