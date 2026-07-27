"use client";

import { ThemedLayout, ThemedTitle } from "@refinedev/antd";
import React from "react";

export const Layout = ({ children }: React.PropsWithChildren) => {
  return (
    <ThemedLayout
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
