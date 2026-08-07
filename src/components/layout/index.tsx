"use client";

import { ThemedLayout, ThemedSider, ThemedTitle } from "@refinedev/antd";
import React from "react";
import { Header } from "./header";

export const Layout = ({ children }: React.PropsWithChildren) => {
  return (
    <ThemedLayout
      Header={Header}
      // Logout je v dropdowne v hlavičke - v sidebari vraciame len položky menu
      Sider={(props) => <ThemedSider {...props} render={({ items }) => <>{items}</>} />}
      Title={({ collapsed }) => (
        <ThemedTitle
          collapsed={collapsed}
          text="IIS Tooling"
          icon={<img src="/logo.png" alt="Logo" width={24} height={24} style={{ borderRadius: 4 }} />}
        />
      )}
    >
      {children}
    </ThemedLayout>
  );
};
