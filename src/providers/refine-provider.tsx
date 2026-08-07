"use client";

import { Refine, type AccessControlProvider } from "@refinedev/core";
import routerProvider from "@refinedev/nextjs-router/app";
import { usePathname } from "next/navigation";
import { SessionProvider, getSession } from "next-auth/react";
import { ConfigProvider, App as AntdApp } from "antd";
import { authProvider } from "./auth-provider";
import { UploadOutlined, ClearOutlined } from "@ant-design/icons";
import { ALL_TOOL_KEYS } from "@/lib/tools";
import "@refinedev/antd/dist/reset.css";

// Týmto potlačíme neškodný warning z knižnice Refine a Antd, aby Next.js nevyhadzoval červený overlay na obrazovku
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

// Riadi viditeľnosť položiek v menu aj prístup k stránkam (cez <CanAccess>).
// Admin vidí všetko, user len nástroje povolené v DB. Skutočná ochrana dát
// je na serveri v API routes (requireTool/requireAdmin).
const accessControlProvider: AccessControlProvider = {
  can: async ({ resource }) => {
    const session = await getSession();
    const role = session?.user?.role;
    if (!role) return { can: false };
    if (role === "admin") return { can: true };
    if (resource && (ALL_TOOL_KEYS as string[]).includes(resource)) {
      return { can: (session?.user?.tools ?? []).includes(resource as (typeof ALL_TOOL_KEYS)[number]) };
    }
    // Všetko ostatné (napr. správa používateľov) je len pre adminov
    return { can: false };
  },
};

export function RefineProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // We can add dummy dataProvider since we are just building tools
  const dataProvider = {
    getList: async () => ({ data: [], total: 0 }),
    getOne: async () => ({ data: {} as any }),
    update: async () => ({ data: {} as any }),
    create: async () => ({ data: {} as any }),
    deleteOne: async () => ({ data: {} as any }),
    getApiUrl: () => "",
    getCustom: async () => ({ data: {} as any }),
  };

  return (
    <SessionProvider>
      <ConfigProvider>
        <AntdApp>
          <Refine
            routerProvider={routerProvider}
            authProvider={authProvider}
            dataProvider={dataProvider}
            accessControlProvider={accessControlProvider}
            resources={[
              {
                name: "traffic-sync",
                list: "/",
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
            ]}
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
