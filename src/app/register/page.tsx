"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Alert, Button, Card, Form, Input, Spin, Typography } from "antd";
import { LockOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;

function RegisterForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [email, setEmail] = useState<string | null>(null);
  const [checking, setChecking] = useState(Boolean(token));
  const [invalid, setInvalid] = useState<string | null>(
    token ? null : "V odkaze chýba registračný token."
  );
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/register?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Pozvánka je neplatná.");
        setEmail(data.email);
      })
      .catch((error) => setInvalid(error instanceof Error ? error.message : "Pozvánka je neplatná."))
      .finally(() => setChecking(false));
  }, [token]);

  const handleSubmit = async (values: { password: string }) => {
    setSubmitting(true);
    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: values.password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Registráciu sa nepodarilo dokončiť.");

      const signInResult = await signIn("credentials", {
        email: data.email,
        password: values.password,
        redirect: false,
      });
      if (signInResult?.ok) {
        window.location.href = "/";
      } else {
        window.location.href = "/login";
      }
    } catch (error) {
      setInvalid(error instanceof Error ? error.message : "Registráciu sa nepodarilo dokončiť.");
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f0f2f5",
        padding: 16,
      }}
    >
      <Card style={{ width: 400 }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
          <img src="/login-logo.png" alt="Invest in Slovakia Logo" style={{ maxWidth: 128, height: "auto" }} />
        </div>
        <Title level={4} style={{ textAlign: "center" }}>
          Dokončenie registrácie
        </Title>

        {checking && (
          <div style={{ textAlign: "center", padding: 24 }}>
            <Spin />
          </div>
        )}

        {!checking && invalid && <Alert type="error" showIcon message={invalid} />}

        {!checking && !invalid && email && (
          <>
            <Text type="secondary" style={{ display: "block", textAlign: "center", marginBottom: 24 }}>
              Nastavte si heslo pre konto <Text strong>{email}</Text>
            </Text>
            <Form layout="vertical" onFinish={handleSubmit} requiredMark={false}>
              <Form.Item
                name="password"
                label="Heslo"
                rules={[
                  { required: true, message: "Zadajte heslo" },
                  { min: 6, message: "Heslo musí mať aspoň 6 znakov" },
                ]}
              >
                <Input.Password prefix={<LockOutlined />} placeholder="Heslo" />
              </Form.Item>
              <Form.Item
                name="confirm"
                label="Heslo znova"
                dependencies={["password"]}
                rules={[
                  { required: true, message: "Zopakujte heslo" },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue("password") === value) return Promise.resolve();
                      return Promise.reject(new Error("Heslá sa nezhodujú"));
                    },
                  }),
                ]}
              >
                <Input.Password prefix={<LockOutlined />} placeholder="Heslo znova" />
              </Form.Item>
              <Button type="primary" htmlType="submit" block loading={submitting}>
                Dokončiť registráciu a prihlásiť sa
              </Button>
            </Form>
          </>
        )}
      </Card>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterForm />
    </Suspense>
  );
}
