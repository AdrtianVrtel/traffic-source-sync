"use client";

import React, { useEffect, useState } from "react";
import { Authenticated } from "@refinedev/core";
import { Button, Card, Form, Input, message, Spin, Typography } from "antd";
import { UserOutlined } from "@ant-design/icons";
import { useSession } from "next-auth/react";
import { Layout } from "@/shared/ui/AppLayout";

const { Title, Text } = Typography;

const ProfileSettings = () => {
  const { update } = useSession();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/profile")
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error || "Nepodarilo sa načítať profil.");
        if (!cancelled) {
          setEmail(data.email);
          form.setFieldsValue({ nickname: data.nickname ?? "" });
        }
      })
      .catch((error) => {
        if (!cancelled) message.error(error instanceof Error ? error.message : "Nepodarilo sa načítať profil.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [form]);

  const handleSave = async (values: { nickname: string }) => {
    setSaving(true);
    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname: values.nickname ?? "" }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Uloženie zlyhalo.");

      await update();
      message.success(
        data.nickname
          ? `Prezývka "${data.nickname}" uložená.`
          : "Prezývka zmazaná, zobrazuje sa e-mail."
      );
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Uloženie zlyhalo.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card variant="borderless">
      <Title level={4}>Nastavenie profilu</Title>
      <Text type="secondary">
        Prihlásený ako <Text strong>{email}</Text>
      </Text>

      <Spin spinning={loading}>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSave}
          style={{ maxWidth: 400, marginTop: 24 }}
        >
          <Form.Item
            name="nickname"
            label="Prezývka"
            extra="Zobrazuje sa v pravom hornom rohu namiesto e-mailu. Nechajte prázdne, ak chcete zobrazovať e-mail."
            rules={[{ max: 50, message: "Prezývka môže mať najviac 50 znakov" }]}
          >
            <Input prefix={<UserOutlined />} placeholder="Napr. Adrián" allowClear />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={saving}>
            Uložiť
          </Button>
        </Form>
      </Spin>
    </Card>
  );
};

export default function ProfilePage() {
  return (
    <Authenticated key="profile-page" fallback={<div style={{ padding: 24 }}>Načítavam...</div>}>
      <Layout>
        <ProfileSettings />
      </Layout>
    </Authenticated>
  );
}
