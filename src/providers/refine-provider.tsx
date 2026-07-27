"use client";

import { Refine } from "@refinedev/core";
import routerProvider from "@refinedev/nextjs-router/app";
import { usePathname } from "next/navigation";
import { SessionProvider } from "next-auth/react";
import { ConfigProvider, App as AntdApp } from "antd";
import { authProvider } from "./auth-provider";
import { UploadOutlined } from "@ant-design/icons";
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
            resources={[
              {
                name: "traffic-sync",
                list: "/",
                meta: {
                  label: "Traffic Source Sync",
                  icon: <UploadOutlined />,
                },
              },
            ]}
            options={{
              syncWithLocation: true,
              warnWhenUnsavedChanges: true,
              useNewQueryKeys: true,
            }}
          >
            {children}
          </Refine>
        </AntdApp>
      </ConfigProvider>
    </SessionProvider>
  );
}
