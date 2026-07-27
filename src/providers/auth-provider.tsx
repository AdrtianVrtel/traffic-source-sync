"use client";

import type { AuthProvider } from "@refinedev/core";
import { signIn, signOut, getSession } from "next-auth/react";

export const authProvider: AuthProvider = {
  login: async ({ email, password, redirectTo }) => {
    const response = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (response?.ok) {
      return {
        success: true,
        redirectTo: redirectTo ?? "/",
      };
    }

    return {
      success: false,
      error: {
        message: "Invalid email or password",
        name: "Login Error",
      },
    };
  },
  logout: async () => {
    await signOut({ redirect: true, callbackUrl: "/login" });
    return {
      success: true,
    };
  },
  check: async () => {
    try {
      const session = await getSession();
      if (session) {
        return {
          authenticated: true,
        };
      }
    } catch (error) {
      console.error("Error fetching session:", error);
    }

    return {
      authenticated: false,
      redirectTo: "/login",
    };
  },
  getPermissions: async () => null,
  getIdentity: async () => {
    try {
      const session = await getSession();
      if (session?.user) {
        return {
          id: session.user.email ?? "1",
          name: session.user.name,
          email: session.user.email,
          avatar: session.user.image,
        };
      }
    } catch (error) {
      console.error("Error fetching session for identity:", error);
    }
    return null;
  },
  onError: async (error) => {
    console.error(error);
    return { error };
  },
};
