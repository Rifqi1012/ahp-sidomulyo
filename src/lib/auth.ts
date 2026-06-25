import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

import prisma from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
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

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.isActive) {
          return null;
        }

        const isValid = await bcrypt.compare(
          credentials.password,
          user.password,
        );

        if (!isValid) {
          return null;
        }

        return {
          id: String(user.id),
          name: user.name,
          email: user.email,
          role: user.role,
          branchId: user.branchId,
          departmentId: user.departmentId,
          jabatanId: user.jabatanId,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // Saat login pertama, `user` tersedia — salin field ke token.
      if (user) {
        token.id = Number(user.id);
        token.role = user.role;
        token.branchId = user.branchId;
        token.departmentId = user.departmentId;
        token.jabatanId = user.jabatanId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.branchId = token.branchId;
        session.user.departmentId = token.departmentId;
        session.user.jabatanId = token.jabatanId;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
