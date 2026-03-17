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

      // For OAuth providers, manually handle account linking
      if (account?.provider && user?.email && account?.provider !== "email") {
        console.log(`🔍 Handling OAuth account linking for ${account.provider}`);

        try {
          // Check if user with this email already exists
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email },
            include: { accounts: true }
          });

          if (existingUser) {
            console.log(`👤 Found existing user: ${existingUser.id}`);

            // Check if this provider is already linked
            const existingAccount = existingUser.accounts.find(
              acc => acc.provider === account.provider && acc.providerAccountId === account.providerAccountId
            );

            if (existingAccount) {
              console.log(`✅ Account already linked`);
              return true;
            }

            // Link the OAuth account to the existing user
            console.log(`🔗 Creating account link for existing user`);
            await prisma.account.create({
              data: {
                userId: existingUser.id,
                type: account.type || "oauth",
                provider: account.provider,
                providerAccountId: account.providerAccountId!,
                access_token: account.access_token,
                refresh_token: account.refresh_token,
                expires_at: account.expires_at,
                token_type: account.token_type,
                scope: account.scope,
                id_token: account.id_token,
                session_state: account.session_state as string,
              },
            });
            console.log(`✅ Successfully linked ${account.provider} to user ${existingUser.id}`);
            return true;
          }

          // No existing user, allow NextAuth to create a new one
          console.log(`👤 No existing user, creating new one`);
          return true;
        } catch (error) {
          console.error('❌ Error in account linking:', error);
          return false;
        }
      }

      console.log('✅ Default: allowing sign-in');
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
