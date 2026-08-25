"use client";

import React from "react";
import { Layout as AntdLayout, Avatar, Dropdown, Space, Typography, theme } from "antd";
import type { MenuProps } from "antd";
import { DownOutlined, LogoutOutlined, SettingOutlined, TeamOutlined, UserOutlined } from "@ant-design/icons";
import { useSession } from "next-auth/react";
import { useLogout } from "@refinedev/core";
import { useRouter } from "next/navigation";

// Vlastná hlavička namiesto ThemedHeader z Refine: e-mail/prezývka vpravo hore
// s hover dropdownom (profil, správa používateľov pre adminov, odhlásenie).
// Unread badge pre Mention Tracker žije v sidebari pri danej položke menu
// (src/providers/refine-provider.tsx) - v hlavičke by pôsobil ako appka-wide
// notifikácia, hoci sa týka len jedného nástroja.
export const Header = () => {
  const { token } = theme.useToken();
  const { data: session } = useSession();
  const { mutate: logout } = useLogout();
  const router = useRouter();

  const displayName = session?.user?.nickname || session?.user?.email || "";
  const isAdmin = session?.user?.role === "admin";

  const items: MenuProps["items"] = [
    {
      key: "profile",
      icon: <SettingOutlined />,
      label: "Nastavenie profilu",
      onClick: () => router.push("/profile"),
    },
    ...(isAdmin
      ? [
          {
            key: "users",
            icon: <TeamOutlined />,
            label: "Správa používateľov",
            onClick: () => router.push("/settings"),
          },
        ]
      : []),
    { type: "divider" as const },
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: "Odhlásiť sa",
      danger: true,
      onClick: () => logout(),
    },
  ];

  return (
    <AntdLayout.Header
      style={{
        backgroundColor: token.colorBgElevated,
        display: "flex",
        justifyContent: "flex-end",
        alignItems: "center",
        padding: "0px 24px",
        height: "64px",
        position: "sticky",
        top: 0,
        zIndex: 1,
      }}
    >
      <Dropdown menu={{ items }} trigger={["hover"]} placement="bottomRight">
        <Space style={{ cursor: "pointer" }} size="small">
          <Avatar size="small" icon={<UserOutlined />} />
          <Typography.Text strong>{displayName}</Typography.Text>
          <DownOutlined style={{ fontSize: 10, color: token.colorTextSecondary }} />
        </Space>
      </Dropdown>
    </AntdLayout.Header>
  );
};
