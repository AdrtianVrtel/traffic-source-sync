"use client";

import { AuthPage } from "@refinedev/antd";

export default function Login() {
  return (
    <AuthPage
      type="login"
      title="Traffic Source Sync"
      formProps={{
        initialValues: {
          email: "admin@example.com",
          password: "password123",
        },
      }}
    />
  );
}
