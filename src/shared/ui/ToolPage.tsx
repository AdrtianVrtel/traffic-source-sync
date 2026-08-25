"use client";

import React from "react";
import { Authenticated, CanAccess } from "@refinedev/core";
import { Alert } from "antd";
import { Layout } from "./AppLayout";
import { TOOLS } from "@/shared/tools";

interface ToolPageProps {
  pageKey: string;
  resource?: string;
  noAccessDescription?: string;
  children: React.ReactNode;
}

export const ToolPage = ({ pageKey, resource, noAccessDescription, children }: ToolPageProps) => {
  const content = resource ? (
    <CanAccess
      resource={resource}
      action="list"
      fallback={
        <Alert
          type="warning"
          showIcon
          message="Nedostatočné oprávnenia"
          description={
            noAccessDescription ??
            `K nástroju ${TOOLS.find((t) => t.key === resource)?.label ?? resource} nemáte prístup. Kontaktujte administrátora.`
          }
        />
      }
    >
      {children}
    </CanAccess>
  ) : (
    children
  );

  return (
    <Authenticated key={pageKey} fallback={<div style={{ padding: 24 }}>Načítavam...</div>}>
      <Layout>{content}</Layout>
    </Authenticated>
  );
};
