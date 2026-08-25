"use client";

import { ThemedLayout, ThemedSider, ThemedTitle } from "@refinedev/antd";
import type { RefineThemedLayoutSiderProps, RefineLayoutThemedTitleProps } from "@refinedev/antd";
import React from "react";
import { Header } from "./header";

// Musia byť stabilné pomenované komponenty (nie inline arrow funkcie v JSX) -
// ThemedLayout interne volá `Sider` priamo ako funkciu (`SiderToRender({ Title })`)
// aby zistil, či má vôbec vykresliť sider layout. Nová identita funkcie pri každom
// renderi Layoutu spôsobovala po opakovaných hot-reloadoch pretečenie zásobníka.
const CustomSider = (props: RefineThemedLayoutSiderProps) => (
  // Logout je v dropdowne v hlavičke - v sidebari vraciame len položky menu
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
