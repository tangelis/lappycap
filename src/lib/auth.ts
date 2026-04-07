import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { CredentialsSignin } from 'next-auth';
import { compare } from 'bcryptjs';
import * as crypto from 'crypto';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getDbErrorMessage } from '@/lib/db-error';

/** Legacy SHA-256 (nest-legacy seed). Backup may also have bcrypt ($2b$...). */
function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  if (storedHash.startsWith('$2a$') || storedHash.startsWith('$2b$')) {
    return compare(password, storedHash);
  }
  const hash = crypto.createHash('sha256').update(password).digest('hex');
  return Promise.resolve(hash === storedHash);
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  /** Required for non-default hosts/ports (e.g. Playwright on 127.0.0.1:3333). */
  trustHost: true,
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        let user;
        try {
          user = await db.query.users.findFirst({
            where: eq(users.email, credentials.email as string),
          });
        } catch (err) {
          throw new CredentialsSignin(getDbErrorMessage(err));
        }

        if (!user) return null;

        const ok = await verifyPassword(credentials.password as string, user.passwordHash);
        if (!ok) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role: string }).role;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as unknown as { role: string }).role = token.role as string;
        (session.user as unknown as { id: string }).id = token.id as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
});
