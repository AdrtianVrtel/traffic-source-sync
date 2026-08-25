"use client";

import { ThemedLayout, ThemedSider, ThemedTitle } from "@refinedev/antd";
import type { RefineThemedLayoutSiderProps, RefineLayoutThemedTitleProps } from "@refinedev/antd";
import React from "react";
import { Header } from "./AppHeader";

const CustomSider = (props: RefineThemedLayoutSiderProps) => (
  <ThemedSider {...props} render={({ items }) => <>{items}</>} />
);

const CustomTitle = ({ collapsed }: RefineLayoutThemedTitleProps) => (
  <ThemedTitle
    collapsed={collapsed}
    text="IIS Tooling"
    icon={<img src="/logo.png" alt="Logo" width={24} height={24} style={{ borderRadius: 4 }} />}
  />
);

export const Layout = ({ children }: React.PropsWithChildren) => {
  return (
    <ThemedLayout Header={Header} Sider={CustomSider} Title={CustomTitle}>
      {children}
    </ThemedLayout>
  );
};
