"use client";

import React, { useEffect, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
  message,
  Popconfirm,
  Space,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import {
  DeleteOutlined,
  SearchOutlined,
  SwapOutlined,
  SafetyOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import type { ClassifiedContact } from "@/lib/ac-cleaner/rules";

const { Title, Text } = Typography;

interface LastSyncInfo {
  startedAt: string;
  finishedAt: string | null;
  contactsScanned: number;
  hardMatches: number;
  softMatches: number;
}

interface SyncStatus {
  configured: boolean;
  lastSync: LastSyncInfo | null;
}

const formatDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString("sk-SK") : "—";

export const AcCleanerTool = () => {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [searching, setSearching] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [hardMatches, setHardMatches] = useState<ClassifiedContact[]>([]);
  const [softMatches, setSoftMatches] = useState<ClassifiedContact[]>([]);
  const [scanInfo, setScanInfo] = useState<{ scanned: number; since: string | null } | null>(null);
  const [fullScan, setFullScan] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    fetch("/api/ac-sync")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data && setStatus(data))
      .catch(() => setStatus(null));
  }, []);

  const handleSearch = async () => {
    setSearching(true);
    try {
      const response = await fetch("/api/ac-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullScan }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Hľadanie zlyhalo.");
      }

      setHardMatches(data.hard);
      setSoftMatches(data.soft);
      setScanInfo({ scanned: data.scanned, since: data.since });
      setHasSearched(true);
      message.success(
        `Skontrolovaných ${data.scanned} kontaktov: ${data.hard.length} na archiváciu, ${data.soft.length} na kontrolu.`
      );
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Nastala chyba pri hľadaní.");
      console.error(error);
    } finally {
      setSearching(false);
    }
  };

  // "Záchrana" kontaktu - odstráni riadok, kontakt sa nearchivuje
  const handleRescue = (contact: ClassifiedContact) => {
    if (contact.category === "hard") {
      setHardMatches((prev) => prev.filter((c) => c.id !== contact.id));
    } else {
      setSoftMatches((prev) => prev.filter((c) => c.id !== contact.id));
    }
    message.success(`Kontakt ${contact.email} bol vyradený z archivácie.`);
  };

  // Presun medzi záložkami (hard <-> soft)
  const handleMove = (contact: ClassifiedContact) => {
    if (contact.category === "hard") {
      setHardMatches((prev) => prev.filter((c) => c.id !== contact.id));
      setSoftMatches((prev) => [...prev, { ...contact, category: "soft" }]);
      message.info(`Kontakt ${contact.email} presunutý do "Na kontrolu".`);
    } else {
      setSoftMatches((prev) => prev.filter((c) => c.id !== contact.id));
      setHardMatches((prev) => [...prev, { ...contact, category: "hard" }]);
      message.info(`Kontakt ${contact.email} presunutý do "Na archiváciu".`);
    }
  };

  const handleArchive = async () => {
    if (hardMatches.length === 0) return;
    setArchiving(true);
    try {
      const response = await fetch("/api/ac-archive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contacts: hardMatches.map((c) => ({
            id: c.id,
            email: c.email,
            category: c.category,
            reasons: c.reasons,
          })),
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Archivácia zlyhala.");
      }

      const failedEmails = new Set((data.failed as { email: string }[]).map((f) => f.email));
      setHardMatches((prev) => prev.filter((c) => failedEmails.has(c.email)));

      if (data.mode === "dry-run") {
        message.warning(
          `DRY-RUN: ${data.archived.length} kontaktov bolo iba zalogovaných (nič sa v AC nezmenilo). ` +
            `Ostrý režim zapnete premennou AC_ARCHIVE_MODE=live.`,
          8
        );
      } else {
        message.success(`Archivovaných ${data.archived.length} kontaktov.`);
      }
      if (data.failed.length > 0) {
        message.error(`Zlyhalo ${data.failed.length} kontaktov, ostali v tabuľke.`);
      }
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Nastala chyba pri archivácii.");
      console.error(error);
    } finally {
      setArchiving(false);
    }
  };

  const buildColumns = (category: "hard" | "soft") => [
    {
      title: "E-mail",
      dataIndex: "email",
      key: "email",
      ellipsis: true,
      sorter: (a: ClassifiedContact, b: ClassifiedContact) => a.email.localeCompare(b.email),
    },
    {
      title: "Meno",
      key: "name",
      render: (_: unknown, record: ClassifiedContact) =>
        `${record.firstName} ${record.lastName}`.trim() || <Text type="secondary">—</Text>,
    },
    {
      title: "Telefón",
      dataIndex: "phone",
      key: "phone",
      render: (phone: string, record: ClassifiedContact) =>
        phone ? (
          <Space size={4}>
            {phone}
            {record.signals.sharedPhoneCount > 1 && (
              <Tooltip title={`Rovnaký telefón má ${record.signals.sharedPhoneCount} kontaktov`}>
                <Badge count={record.signals.sharedPhoneCount} color="orange" />
              </Tooltip>
            )}
          </Space>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      title: "Vytvorený",
      dataIndex: "createdDate",
      key: "createdDate",
      render: (d: string) => formatDate(d),
      sorter: (a: ClassifiedContact, b: ClassifiedContact) =>
        (a.createdDate || "").localeCompare(b.createdDate || ""),
    },
    {
      title: "Dôvody",
      dataIndex: "reasons",
      key: "reasons",
      render: (reasons: string[]) => (
        <Space size={[0, 4]} wrap>
          {reasons.map((reason) => (
            <Tag key={reason} color={category === "hard" ? "red" : "orange"}>
              {reason}
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: "Akcie",
      key: "actions",
      width: 120,
      render: (_: unknown, record: ClassifiedContact) => (
        <Space>
          <Tooltip title={category === "hard" ? `Presunúť do "Na kontrolu"` : `Presunúť do "Na archiváciu"`}>
            <Button size="small" icon={<SwapOutlined />} onClick={() => handleMove(record)} />
          </Tooltip>
          <Popconfirm
            title="Vyradiť kontakt?"
            description="Kontakt sa odstráni zo zoznamu a nebude archivovaný."
            onConfirm={() => handleRescue(record)}
            okText="Áno, vyradiť"
            cancelText="Nie"
          >
            <Tooltip title="Zachrániť (vyradiť zo zoznamu)">
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const notConfigured = status !== null && !status.configured;

  return (
    <Card variant="borderless">
      <Title level={4}>ActiveCampaign Cleaner</Title>
      <Text type="secondary">
        {`Nástroj stiahne kontakty z ActiveCampaign (od posledného behu), automaticky rozdelí testovacie kontakty
        na "Na archiváciu" a "Na kontrolu" a po potvrdení ich hromadne archivuje.`}
      </Text>

      {notConfigured && (
        <Alert
          style={{ marginTop: 16 }}
          type="warning"
          showIcon
          message="ActiveCampaign nie je nakonfigurovaný"
          description="V prostredí chýbajú premenné AC_API_URL a AC_API_KEY. Hľadanie zatiaľ nie je možné spustiť."
        />
      )}

      <Space direction="vertical" style={{ width: "100%", marginTop: 24 }} size="large">
        <Space wrap>
          <Button
            type="primary"
            icon={<SearchOutlined />}
            onClick={handleSearch}
            loading={searching}
            disabled={notConfigured}
          >
            Spustiť hľadanie
          </Button>
          <Checkbox checked={fullScan} onChange={(e) => setFullScan(e.target.checked)}>
            Úplný sken (ignorovať dátum poslednej kontroly)
          </Checkbox>
          {status?.lastSync && (
            <Text type="secondary">
              Posledná kontrola: {formatDate(status.lastSync.startedAt)} ({status.lastSync.contactsScanned}{" "}
              kontaktov)
            </Text>
          )}
        </Space>

        {scanInfo && (
          <Alert
            type="info"
            showIcon
            message={
              scanInfo.since
                ? `Skontrolovaných ${scanInfo.scanned} kontaktov vytvorených od ${formatDate(scanInfo.since)}.`
                : `Skontrolovaných ${scanInfo.scanned} kontaktov (úplný sken).`
            }
          />
        )}

        {hasSearched && (
          <>
            <Tabs
              defaultActiveKey="hard"
              items={[
                {
                  key: "hard",
                  label: (
                    <Space size={6}>
                      <WarningOutlined />
                      Na archiváciu
                      <Badge count={hardMatches.length} color="red" showZero />
                    </Space>
                  ),
                  children: (
                    <Table
                      dataSource={hardMatches}
                      columns={buildColumns("hard")}
                      rowKey="id"
                      pagination={{ defaultPageSize: 20, showSizeChanger: true }}
                      scroll={{ x: "max-content" }}
                    />
                  ),
                },
                {
                  key: "soft",
                  label: (
                    <Space size={6}>
                      <SafetyOutlined />
                      Na kontrolu
                      <Badge count={softMatches.length} color="orange" showZero />
                    </Space>
                  ),
                  children: (
                    <Table
                      dataSource={softMatches}
                      columns={buildColumns("soft")}
                      rowKey="id"
                      pagination={{ defaultPageSize: 20, showSizeChanger: true }}
                      scroll={{ x: "max-content" }}
                    />
                  ),
                },
              ]}
            />

            <Popconfirm
              title={`Archivovať ${hardMatches.length} kontaktov?`}
              description={`Kontakty zo záložky "Na archiváciu" dostanú tag test_archived a budú odhlásené zo všetkých zoznamov.`}
              onConfirm={handleArchive}
              okText="Áno, archivovať"
              cancelText="Nie"
              disabled={hardMatches.length === 0}
            >
              <Button
                type="primary"
                danger
                loading={archiving}
                disabled={hardMatches.length === 0}
              >
                Potvrdiť archiváciu ({hardMatches.length})
              </Button>
            </Popconfirm>
          </>
        )}
      </Space>
    </Card>
  );
};
