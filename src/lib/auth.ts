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
    async signIn() {
      // Allow sign-in to complete
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
