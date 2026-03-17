import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Google from "next-auth/providers/google";
import Apple from "next-auth/providers/apple";
import type { EmailConfig } from "@auth/core/providers/email";
import { prisma } from "@/lib/prisma";
import { sendMagicLinkEmail } from "@/lib/email/ses";

const emailProvider: EmailConfig = {
  id: "email",
  type: "email",
  name: "Email",
  from: process.env.SES_FROM_EMAIL ?? "noreply@rsaerofkt.com",
  server: "",
  maxAge: 24 * 60 * 60, // 24 hours
  sendVerificationRequest: async ({ identifier: email, url }) => {
    await sendMagicLinkEmail({ email, url });
  },
  options: {},
};

const providers = [
  Google({
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  }),
  // Apple is optional — omit if env vars are not set (e.g. local dev)
  ...(process.env.APPLE_CLIENT_ID
    ? [Apple({
        clientId: process.env.APPLE_CLIENT_ID,
        clientSecret: process.env.APPLE_CLIENT_SECRET!,
      })]
    : []),
  emailProvider,
];

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers,
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  trustHost: true,
  session: {
    strategy: "database",
  },
  // Allow linking OAuth accounts to existing email-based users
  allowDangerousEmailAccountLinking: true,
  callbacks: {
    session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
    async signIn({ user, account }) {
      console.log('🔐 SignIn callback triggered:', {
        provider: account?.provider,
        email: user?.email,
        userId: user?.id
      });

      // Always allow email provider sign-ins (magic links)
      if (account?.provider === "email") {
        console.log('✅ Email provider sign-in allowed');
        return true;
      }

      // For OAuth providers (Google, Apple), handle account linking
      if (account?.provider && user?.email) {
        console.log(`🔍 Checking for existing user with email: ${user.email}`);
        try {
          // Check if a user with this email already exists
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email },
            include: { accounts: true }
          });

          if (existingUser) {
            console.log(`👤 Found existing user:`, {
              id: existingUser.id,
              email: existingUser.email,
              accountCount: existingUser.accounts.length
            });

            // Check if this OAuth provider is already linked
            const existingAccount = existingUser.accounts.find(
              acc => acc.provider === account.provider
            );

            if (existingAccount) {
              // Account already linked, allow sign-in
              console.log(`✅ ${account.provider} account already linked, allowing sign-in`);
              return true;
            }

            // User exists but this OAuth provider isn't linked yet
            // NextAuth will automatically link the account after this callback returns true
            console.log(`🔗 Linking ${account.provider} account to existing user ${existingUser.id}`);
            return true;
          }

          // No existing user, create new one (NextAuth handles this automatically)
          console.log('👤 No existing user found, creating new user');
          return true;
        } catch (error) {
          console.error('Error in signIn callback:', error);
          return false;
        }
      }

      return true;
    },
    async redirect({ url, baseUrl }) {
      // For all redirects, use the URL if it's internal, otherwise go to base
      return url.startsWith(baseUrl) ? url : baseUrl;
    },
  },
  pages: {
    verifyRequest: "/auth/verify",
  },
});

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}
