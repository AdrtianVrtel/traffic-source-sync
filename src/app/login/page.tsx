"use client";

import { AuthPage } from "@refinedev/antd";

export default function Login() {
  return (
    <AuthPage
      type="login"
      title={
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
          <img src="/login-logo.png" alt="Invest in Slovakia Logo" style={{ maxWidth: '128px', height: 'auto' }} />
        </div>
      }
      registerLink={false}
      forgotPasswordLink={false}
      rememberMe={false}
    />
  );
}
