"use client";

import React from "react";
import { ErrorBoundary as ReactErrorBoundary, FallbackProps } from "react-error-boundary";
import { Button, Result, Typography } from "antd";

const { Text } = Typography;

function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  const errorMessage = error instanceof Error ? error.message : String(error);

  return (
    <div style={{ padding: "40px 20px", display: "flex", justifyContent: "center" }}>
      <Result
        status="500"
        title="Ups, niečo sa pokazilo."
        subTitle={<Text type="danger">{errorMessage}</Text>}
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
