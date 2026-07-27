"use client";

import React from "react";
import { ErrorBoundary as ReactErrorBoundary, FallbackProps } from "react-error-boundary";
import { Button, Result, Typography } from "antd";

const { Text } = Typography;

function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div style={{ padding: "40px 20px", display: "flex", justifyContent: "center" }}>
      <Result
        status="500"
        title="Ups, niečo sa pokazilo."
        subTitle={<Text type="danger">{error.message}</Text>}
        extra={
          <Button type="primary" onClick={resetErrorBoundary}>
            Skúsiť znova
          </Button>
        }
      />
    </div>
  );
}

export const ErrorBoundary = ({ children }: { children: React.ReactNode }) => {
  return (
    <ReactErrorBoundary
      FallbackComponent={ErrorFallback}
      onReset={() => {
        // Reset the state of your app here if needed
      }}
    >
      {children}
    </ReactErrorBoundary>
  );
};
