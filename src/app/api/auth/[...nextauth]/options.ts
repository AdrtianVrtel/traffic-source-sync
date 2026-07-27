import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

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

        const user1Email = process.env.ADMIN_EMAIL || "admin@example.com";
        const user1Password = process.env.ADMIN_PASSWORD || "password123";
        
        const user2Email = process.env.USER2_EMAIL || "user@example.com";
        const user2Password = process.env.USER2_PASSWORD || "password123";

        // Kontrola pre prvého používateľa
        if (credentials.email === user1Email && credentials.password === user1Password) {
          return { id: "1", name: "Admin User", email: user1Email };
        }

        // Kontrola pre druhého používateľa
        if (credentials.email === user2Email && credentials.password === user2Password) {
          return { id: "2", name: "Secondary User", email: user2Email };
        }

        return null;
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
};
