"use client";

import React, { useEffect, useState } from "react";
import {
  Button,
  Card,
  Form,
  Input,
  message,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import {
  CopyOutlined,
  DeleteOutlined,
  LinkOutlined,
  ReloadOutlined,
  UserAddOutlined,
} from "@ant-design/icons";
import { useGetIdentity } from "@refinedev/core";
import copy from "copy-to-clipboard";
import { TOOLS } from "@/shared/tools";

const { Title, Text } = Typography;

interface ManagedUser {
  id: number;
  email: string;
  role: "admin" | "user";
  status: "pending" | "active";
  allowedTools: string[];
  inviteToken: string | null;
  createdAt: string;
}

const toolOptions = TOOLS.map((t) => ({ label: t.label, value: t.key }));

const inviteUrl = (token: string) => `${window.location.origin}/register?token=${token}`;

export const UserManagement = () => {
  const { data: identity } = useGetIdentity<{ email?: string }>();
  const [userList, setUserList] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form] = Form.useForm();
  const newRole = Form.useWatch("role", form);
  const [invite, setInvite] = useState<{ email: string; url: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/users")
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error || "Nepodarilo sa načítať používateľov.");
        if (!cancelled) setUserList(data.users);
      })
      .catch((error) => {
        if (!cancelled) {
          message.error(error instanceof Error ? error.message : "Nepodarilo sa načítať používateľov.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleCreate = async (values: { email: string; role: "admin" | "user"; allowedTools?: string[] }) => {
    setCreating(true);
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: values.email,
          role: values.role,
          allowedTools: values.role === "admin" ? [] : (values.allowedTools ?? []),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Používateľa sa nepodarilo pridať.");

      form.resetFields();
      setUserList((prev) => [...prev, data.user]);
      setInvite({ email: data.user.email, url: inviteUrl(data.user.inviteToken) });
      message.success(`${data.user.email} pridaný na whitelist.`);
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Používateľa sa nepodarilo pridať.");
    } finally {
      setCreating(false);
    }
  };

  const patchUser = async (id: number, body: Record<string, unknown>, successMsg: string) => {
    try {
      const response = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Zmena zlyhala.");
      setUserList((prev) => prev.map((u) => (u.id === id ? data.user : u)));
      message.success(successMsg);
      return data.user as ManagedUser;
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Zmena zlyhala.");
      return null;
    }
  };

  const handleDelete = async (user: ManagedUser) => {
    try {
      const response = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Zmazanie zlyhalo.");
      setUserList((prev) => prev.filter((u) => u.id !== user.id));
      message.success(`Používateľ ${user.email} bol zmazaný.`);
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Zmazanie zlyhalo.");
    }
  };

  const handleShowInvite = (user: ManagedUser) => {
    if (!user.inviteToken) return;
    setInvite({ email: user.email, url: inviteUrl(user.inviteToken) });
  };

  const handleCopy = async (url: string) => {
    if (await copy(url)) {
      message.success("Odkaz skopírovaný do schránky.");
    } else {
      message.warning("Kopírovanie zlyhalo. Označte odkaz v políčku a skopírujte ho ručne.");
    }
  };

  const columns = [
    {
      title: "E-mail",
      dataIndex: "email",
      key: "email",
      render: (email: string) => (
        <Space size={6}>
          {email}
          {identity?.email === email && <Tag color="blue">vy</Tag>}
        </Space>
      ),
    },
    {
      title: "Rola",
      dataIndex: "role",
      key: "role",
      width: 130,
      render: (role: ManagedUser["role"], record: ManagedUser) => (
        <Select
          size="small"
          value={role}
          style={{ width: 110 }}
          disabled={identity?.email === record.email}
          options={[
            { label: "Admin", value: "admin" },
            { label: "User", value: "user" },
          ]}
          onChange={(value) => patchUser(record.id, { role: value }, `Rola pre ${record.email} zmenená.`)}
        />
      ),
    },
    {
      title: "Stav",
      dataIndex: "status",
      key: "status",
      width: 110,
      render: (status: ManagedUser["status"]) =>
        status === "active" ? <Tag color="green">Aktívny</Tag> : <Tag color="gold">Čaká na registráciu</Tag>,
    },
    {
      title: "Prístup k nástrojom",
      dataIndex: "allowedTools",
      key: "allowedTools",
      render: (allowedTools: string[], record: ManagedUser) =>
        record.role === "admin" ? (
          <Text type="secondary">všetky (admin)</Text>
        ) : (
          <Select
            mode="multiple"
            size="small"
            value={allowedTools}
            style={{ minWidth: 260 }}
            placeholder="Žiadne nástroje"
            options={toolOptions}
            onChange={(value) =>
              patchUser(record.id, { allowedTools: value }, `Nástroje pre ${record.email} upravené.`)
            }
          />
        ),
    },
    {
      title: "Akcie",
      key: "actions",
      width: 140,
      render: (_: unknown, record: ManagedUser) => (
        <Space>
          {record.status === "pending" && record.inviteToken && (
            <Tooltip title="Zobraziť pozvánkový odkaz">
              <Button size="small" icon={<LinkOutlined />} onClick={() => handleShowInvite(record)} />
            </Tooltip>
          )}
          {record.status === "pending" && (
            <Tooltip title="Vygenerovať nový pozvánkový odkaz (starý prestane platiť)">
              <Button
                size="small"
                icon={<ReloadOutlined />}
                onClick={async () => {
                  const updated = await patchUser(record.id, { regenerateInvite: true }, "Nová pozvánka vygenerovaná.");
                  if (updated?.inviteToken) {
                    setInvite({ email: updated.email, url: inviteUrl(updated.inviteToken) });
                  }
                }}
              />
            </Tooltip>
          )}
          {identity?.email !== record.email && (
            <Popconfirm
              title={`Zmazať používateľa ${record.email}?`}
              description="Používateľ sa už nebude môcť prihlásiť."
              onConfirm={() => handleDelete(record)}
              okText="Áno, zmazať"
              cancelText="Nie"
            >
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Card variant="borderless">
      <Title level={4}>Správa používateľov</Title>
      <Text type="secondary">
        Whitelistnite e-mailovú adresu a pošlite používateľovi pozvánkový odkaz, cez ktorý si nastaví heslo.
        Userom môžete sprístupniť len vybrané nástroje, admini majú prístup ku všetkému vrátane tejto stránky.
      </Text>

      <Card size="small" style={{ marginTop: 24, marginBottom: 24 }} title="Pridať používateľa na whitelist">
        <Form form={form} layout="inline" onFinish={handleCreate} initialValues={{ role: "user", allowedTools: [] }}>
          <Form.Item
            name="email"
            rules={[
              { required: true, message: "Zadajte e-mail" },
              { type: "email", message: "Neplatný e-mail" },
            ]}
          >
            <Input placeholder="email@domena.sk" style={{ width: 240 }} />
          </Form.Item>
          <Form.Item name="role">
            <Select
              style={{ width: 110 }}
              options={[
                { label: "User", value: "user" },
                { label: "Admin", value: "admin" },
              ]}
            />
          </Form.Item>
          {newRole !== "admin" && (
            <Form.Item name="allowedTools">
              <Select
                mode="multiple"
                placeholder="Prístup k nástrojom"
                style={{ minWidth: 280 }}
                options={toolOptions}
              />
            </Form.Item>
          )}
          <Form.Item>
            <Button type="primary" htmlType="submit" icon={<UserAddOutlined />} loading={creating}>
              Pridať
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <Table
        dataSource={userList}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={false}
        scroll={{ x: "max-content" }}
      />

      <Modal
        open={invite !== null}
        title="Pozvánkový odkaz"
        onCancel={() => setInvite(null)}
        footer={[
          <Button key="close" onClick={() => setInvite(null)}>
            Zavrieť
          </Button>,
          <Button
            key="copy"
            type="primary"
            icon={<CopyOutlined />}
            onClick={() => invite && handleCopy(invite.url)}
          >
            Kopírovať
          </Button>,
        ]}
      >
        {invite && (
          <Space direction="vertical" style={{ width: "100%" }} size="middle">
            <Text type="secondary">
              Pošlite tento odkaz používateľovi <Text strong>{invite.email}</Text>. Cez neho si nastaví heslo
              a dokončí registráciu. Po dokončení odkaz prestane platiť.
            </Text>
            <Input
              readOnly
              autoFocus
              value={invite.url}
              onFocus={(e) => e.currentTarget.select()}
              onClick={(e) => e.currentTarget.select()}
            />
          </Space>
        )}
      </Modal>
    </Card>
  );
};
