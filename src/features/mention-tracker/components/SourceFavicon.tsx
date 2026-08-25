"use client";

import React, { useState } from "react";
import { GlobalOutlined } from "@ant-design/icons";

export const SourceFavicon = ({ url }: { url: string | null }) => {
  const [failed, setFailed] = useState(false);

  if (!url || failed) return <GlobalOutlined />;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt=""
      width={16}
      height={16}
      style={{ borderRadius: 2, verticalAlign: "middle" }}
      onError={() => setFailed(true)}
    />
  );
};
