import NextAuth from 'next-auth';
import GitHubProvider from 'next-auth/providers/github';

const handler = NextAuth({
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, profile }) {
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
      // Add GitHub username to session
      if (session.user) {
        (session.user as any).username = token.username;
      }
      return session;
    },
    async jwt({ token, profile }) {
      if (profile) {
        token.username = (profile as any).login;
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
