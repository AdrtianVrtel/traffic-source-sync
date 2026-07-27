"use client";

import React, { useState } from "react";
import { Upload, Button, Table, message, Card, Typography, Space, Alert, Progress, Popconfirm } from "antd";
import { InboxOutlined, SyncOutlined, DownloadOutlined, MinusCircleOutlined } from "@ant-design/icons";
import * as XLSX from "xlsx";

const { Title, Text } = Typography;
const { Dragger } = Upload;

const REQUIRED_COLUMNS = [
  "Original Traffic Source",
  "Original Traffic Source Drill-Down 1",
  "Original Traffic Source Drill-Down 2",
];
const EMAIL_ALIASES = ["email", "Email", "e-mail", "E-mail", "e mail", "E mail"];

const ColumnHeader = ({ title, onDelete }: { title: string; onDelete: (col: string) => void }) => {
  const [hover, setHover] = useState(false);

  return (
    <div 
      style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <span>{title}</span>
      <div style={{ opacity: hover ? 1 : 0, transition: "opacity 0.2s" }}>
        <Popconfirm
          title="Naozaj vymazať tento stĺpec?"
          description="Stĺpec sa vymaže z tabuľky aj z finálneho Excelu."
          onConfirm={() => onDelete(title)}
          okText="Áno, vymazať"
          cancelText="Nie"
          placement="bottom"
        >
          <MinusCircleOutlined 
            style={{ color: "#ff4d4f", cursor: "pointer", paddingLeft: 8 }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              onDelete(title);
            }}
            title="Dvojklik pre rýchle zmazanie"
          />
        </Popconfirm>
      </div>
    </div>
  );
};

export const TrafficSyncTool = () => {
  const [data, setData] = useState<any[]>([]);
  const [columns, setColumns] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState("");
  const [missingColumns, setMissingColumns] = useState<string[]>([]);
  const [isSynced, setIsSynced] = useState(false);
  const [emailColumnName, setEmailColumnName] = useState<string>("email");

  const handleDeleteColumn = (colName: string) => {
    // Odstránime stĺpec zo samotných dát
    setData(prevData => prevData.map(row => {
      const newRow = { ...row };
      delete newRow[colName];
      return newRow;
    }));

    // Odstránime stĺpec z definície tabuľky
    setColumns(prevCols => prevCols.filter(c => c.key !== colName));
    
    // Ak vymazal povinný stĺpec, aktualizujeme missingColumns
    if (REQUIRED_COLUMNS.includes(colName) || EMAIL_ALIASES.includes(colName)) {
      setMissingColumns(prev => {
        if (!prev.includes(colName)) {
          return [...prev, colName];
        }
        return prev;
      });
    }

    message.success(`Stĺpec "${colName}" bol vymazaný.`);
  };

  const handleFileUpload = (file: File) => {
    setFileName(file.name);
    setIsSynced(false);
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const buffer = e.target?.result;
        const workbook = XLSX.read(buffer, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Convert sheet to JSON
        const rawJsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
        // Add a unique identifier for React/Antd rendering
        const jsonData = rawJsonData.map((row: any, index) => ({
          ...row,
          _rowId: `row_${index}`
        }));

        if (jsonData.length > 0) {
          // Remove _rowId when extracting columns
          const firstRow = { ...jsonData[0] };
          delete firstRow._rowId;
          const cols = Object.keys(firstRow);

          // Find which email alias is used
          const foundEmailCol = cols.find((col) => EMAIL_ALIASES.includes(col));
          
          if (foundEmailCol) {
            setEmailColumnName(foundEmailCol);
          }

          // Check for missing columns
          const missing = REQUIRED_COLUMNS.filter((col) => !cols.includes(col));
          if (!foundEmailCol) {
            missing.push("Email (alebo variant ako e-mail, E-mail atď.)");
          }
          
          setMissingColumns(missing);

          if (missing.length === 0) {
            message.success("Súbor bol úspešne načítaný.");
          } else {
            message.warning("V súbore chýbajú niektoré požadované stĺpce.");
          }

          // Generate Antd Table Columns
          const tableColumns = cols.map((col) => ({
            title: <ColumnHeader title={col} onDelete={handleDeleteColumn} />,
            dataIndex: col,
            key: col,
            ellipsis: true,
          }));

          setColumns(tableColumns);
          setData(jsonData);
        } else {
          message.error("Excel súbor je prázdny.");
        }
      } catch (error) {
        message.error("Nastala chyba pri spracovaní súboru.");
        console.error(error);
      }
    };

    reader.readAsArrayBuffer(file);
    return false; // Prevent default upload behavior
  };

  const [progress, setProgress] = useState<number>(0);

  const handleSync = async () => {
    if (data.length === 0) return;
    setLoading(true);
    setProgress(0);

    try {
      // Extract unique emails
      const emails = [...new Set(data.map((row) => row[emailColumnName]).filter(Boolean))];
      
      const BATCH_SIZE = 40;
      const totalBatches = Math.ceil(emails.length / BATCH_SIZE);
      let allPosthogData: Record<string, any> = {};

      for (let i = 0; i < totalBatches; i++) {
        const batchEmails = emails.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);

        const response = await fetch("/api/posthog-sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ emails: batchEmails }),
        });

        if (!response.ok) {
          throw new Error(`Nepodarilo sa stiahnuť dáta z PostHogu (dávka ${i + 1}/${totalBatches}).`);
        }

        const batchData = await response.json();
        allPosthogData = { ...allPosthogData, ...batchData };

        // Update progress
        const currentProgress = Math.round(((i + 1) / totalBatches) * 100);
        setProgress(currentProgress);
      }

      const updatedData = data.map((row) => {
        const email = row[emailColumnName];
        if (email && allPosthogData[email]) {
          return {
            ...row,
            "Original Traffic Source": allPosthogData[email].source || row["Original Traffic Source"],
            "Original Traffic Source Drill-Down 1": allPosthogData[email].drillDown1 || row["Original Traffic Source Drill-Down 1"],
            "Original Traffic Source Drill-Down 2": allPosthogData[email].drillDown2 || row["Original Traffic Source Drill-Down 2"],
          };
        }
        return row;
      });

      setData(updatedData);
      setIsSynced(true);
      message.success("Dáta boli úspešne synchronizované s PostHogom.");
    } catch (error: any) {
      message.error(error.message || "Nastala chyba pri synchronizácii.");
      console.error(error);
    } finally {
      setLoading(false);
      // Optional: keep progress at 100% for a moment or reset it. We leave it at 100%.
    }
  };

  const handleDownload = () => {
    // Odstránime vnútorné _rowId pred exportom
    const dataForExport = data.map(row => {
      const exportRow = { ...row };
      delete exportRow._rowId;
      return exportRow;
    });

    const worksheet = XLSX.utils.json_to_sheet(dataForExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Synchronized Data");

    const newFileName = fileName ? fileName.replace(".xlsx", "_synced.xlsx") : "synced_data.xlsx";
    XLSX.writeFile(workbook, newFileName);
  };

  const hasErrors = missingColumns.length > 0;
  const canSync = data.length > 0 && !hasErrors;

  return (
    <Card variant="borderless">
      <Title level={4}>Synchronizácia zdroja návštevnosti (Traffic Source Sync)</Title>
      <Text type="secondary">
        Nahrajte Excel súbor obsahujúci stĺpce: E-mail (alebo jeho varianty) a {REQUIRED_COLUMNS.join(", ")}. 
        Aplikácia doplní dáta z PostHogu na základe e-mailovej adresy.
      </Text>

      <div style={{ marginTop: 24, marginBottom: 24 }}>
        <Dragger
          accept=".xlsx, .xls, .csv"
          beforeUpload={handleFileUpload}
          showUploadList={false}
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">Kliknite alebo presuňte Excel súbor sem pre nahratie</p>
          <p className="ant-upload-hint">
            Podporované sú formáty .xlsx, .xls.
          </p>
        </Dragger>
      </div>

      {hasErrors && (
        <Alert
          message="Chýbajúce stĺpce"
          description={`V nahratom súbore chýbajú nasledovné povinné stĺpce: ${missingColumns.join(", ")}`}
          type="error"
          showIcon
          style={{ marginBottom: 24 }}
        />
      )}

      {data.length > 0 && (
        <Space direction="vertical" style={{ width: "100%" }} size="large">
          <Space>
            <Button
              type="primary"
              icon={<SyncOutlined />}
              onClick={handleSync}
              loading={loading}
              disabled={!canSync}
            >
              Synchronizovať s PostHogom
            </Button>
            {isSynced && (
              <Button
                icon={<DownloadOutlined />}
                onClick={handleDownload}
              >
                Stiahnuť upravený Excel
              </Button>
            )}
          </Space>

          {(loading || (isSynced && progress === 100)) && (
            <div style={{ padding: '16px 0' }}>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>
                {loading ? "Sťahujem dáta z PostHogu..." : "Dáta sú stiahnuté"}
              </Text>
              <Progress percent={progress} status={loading ? "active" : "success"} />
            </div>
          )}

          <Table
            dataSource={data}
            columns={columns}
            rowKey="_rowId"
            pagination={{ defaultPageSize: 10, showSizeChanger: true, pageSizeOptions: ['10', '20', '50', '100'] }}
            scroll={{ x: "max-content" }}
            title={() => (
              <Text strong>
                Náhľad dát (celkom {data.length} záznamov)
              </Text>
            )}
          />
        </Space>
      )}
    </Card>
  );
};
