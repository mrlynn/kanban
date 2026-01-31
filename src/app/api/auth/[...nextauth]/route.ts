import NextAuth from 'next-auth';
import GitHubProvider from 'next-auth/providers/github';
import CredentialsProvider from 'next-auth/providers/credentials';

const isDev = process.env.NODE_ENV === 'development';

const providers = [
  GitHubProvider({
    clientId: process.env.GITHUB_CLIENT_ID!,
    clientSecret: process.env.GITHUB_CLIENT_SECRET!,
  }),
];

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
      
      // Only allow specific GitHub users (you!)
      const allowedUsers = process.env.ALLOWED_GITHUB_USERS?.split(',').map(u => u.toLowerCase().trim()) || [];
      const githubUsername = (profile as any)?.login?.toLowerCase();
      
      console.log('[Auth] GitHub username:', githubUsername);
      console.log('[Auth] Allowed users:', allowedUsers);
      
      if (allowedUsers.length === 0) {
        // If no allowlist, allow anyone (for testing)
        console.log('[Auth] No allowlist, allowing all');
        return true;
      }
      
      const isAllowed = allowedUsers.includes(githubUsername);
      console.log('[Auth] Is allowed:', isAllowed);
      
      return isAllowed;
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
