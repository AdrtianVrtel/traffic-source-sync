"use client";

import "@ant-design/v5-patch-for-react-19";
import { Refine, type AccessControlProvider } from "@refinedev/core";
import routerProvider from "@refinedev/nextjs-router/app";
import { usePathname } from "next/navigation";
import { SessionProvider, getSession } from "next-auth/react";
import { ConfigProvider, App as AntdApp } from "antd";
import { authProvider } from "./auth-provider";
import { UploadOutlined, ClearOutlined } from "@ant-design/icons";
import { ALL_TOOL_KEYS } from "@/shared/tools";
import { MentionTrackerIcon } from "@/features/mention-tracker/components/SidebarIcon";
import "@refinedev/antd/dist/reset.css";

if (typeof window !== "undefined") {
  const originalError = console.error;
  console.error = (...args: any[]) => {
    if (typeof args[0] === "string") {
      if (args[0].includes("[antd: Menu] `children` is deprecated")) return;
      if (args[0].includes("[antd: compatible]")) return;
    }
    originalError(...args);
  };
}

const accessControlProvider: AccessControlProvider = {
  can: async ({ resource }) => {
    const session = await getSession();
    const role = session?.user?.role;
    if (!role) return { can: false };
    if (role === "admin") return { can: true };
    if (resource && (ALL_TOOL_KEYS as string[]).includes(resource)) {
      return { can: (session?.user?.tools ?? []).includes(resource as (typeof ALL_TOOL_KEYS)[number]) };
    }
    return { can: false };
  },
};

const dataProvider = {
  getList: async () => ({ data: [], total: 0 }),
  getOne: async () => ({ data: {} as any }),
  update: async () => ({ data: {} as any }),
  create: async () => ({ data: {} as any }),
  deleteOne: async () => ({ data: {} as any }),
  getApiUrl: () => "",
  getCustom: async () => ({ data: {} as any }),
};

const RESOURCES = [
  {
    name: "traffic-sync",
    list: "/traffic-sync",
    meta: {
      label: "Traffic Source Sync",
      icon: <UploadOutlined />,
    },
  },
  {
    name: "ac-cleaner",
    list: "/ac-cleaner",
    meta: {
      label: "ActiveCampaign Cleaner",
      icon: <ClearOutlined />,
    },
  },
  {
    name: "mention-tracker",
    list: "/mention-tracker",
    meta: {
      label: "Mention Tracker",
      icon: <MentionTrackerIcon />,
    },
  },
];

export function RefineProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <SessionProvider>
      <ConfigProvider>
        <AntdApp>
          <Refine
            routerProvider={routerProvider}
            authProvider={authProvider}
            dataProvider={dataProvider}
            accessControlProvider={accessControlProvider}
            resources={RESOURCES}
            options={{
              syncWithLocation: true,
              warnWhenUnsavedChanges: true,
            }}
          >
            {children}
          </Refine>
        </AntdApp>
      </ConfigProvider>
    </SessionProvider>
  );
}
