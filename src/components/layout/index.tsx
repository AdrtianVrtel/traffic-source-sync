"use client";

import { ThemedLayout, ThemedTitle } from "@refinedev/antd";
import React from "react";

export const Layout = ({ children }: React.PropsWithChildren) => {
  return (
    <ThemedLayout
      Title={({ collapsed }) => (
        <ThemedTitle
          collapsed={collapsed}
          text="Traffic Sync Tool"
        />
      )}
    >
      {children}
    </ThemedLayout>
  );
};
