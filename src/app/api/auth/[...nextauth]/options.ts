import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { verifyPassword } from "@/lib/auth/password";
import type { ToolKey } from "@/lib/tools";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email.toLowerCase().trim();
        const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

        if (!user || user.status !== "active" || !user.passwordHash) {
          return null;
        }
        if (!verifyPassword(credentials.password, user.passwordHash)) {
          return null;
        }

        return { id: String(user.id), name: user.email, email: user.email };
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token }) {
      if (token.email) {
        const [dbUser] = await db
          .select()
          .from(users)
          .where(eq(users.email, token.email.toLowerCase()))
          .limit(1);

        if (dbUser && dbUser.status === "active") {
          token.uid = String(dbUser.id);
          token.role = dbUser.role;
          token.nickname = dbUser.nickname;
          try {
            token.tools = JSON.parse(dbUser.allowedTools) as ToolKey[];
          } catch {
            token.tools = [];
          }
        } else {
          token.role = undefined;
          token.tools = [];
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.uid ?? "";
        session.user.role = token.role;
        session.user.tools = token.tools ?? [];
        session.user.nickname = token.nickname ?? null;
      }
      return session;
    },
  },
};
