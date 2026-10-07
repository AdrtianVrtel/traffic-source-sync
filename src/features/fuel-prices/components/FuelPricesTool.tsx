"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Card,
  Table,
  Select,
  Typography,
  Space,
  Row,
  Col,
  Tag,
  Button,
  Segmented,
  Alert,
  Tooltip,
  message,
  Popconfirm,
} from "antd";
import {
  CarOutlined,
  DownloadOutlined,
  ReloadOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  MinusCircleOutlined,
  PlusCircleOutlined,
  UndoOutlined,
  InfoCircleOutlined,
  CalendarOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import * as XLSX from "xlsx";
import {
  FUEL_INDICATORS,
  FuelIndicatorCode,
  FuelIndicatorMeta,
  FuelPricesApiResponse,
  FuelWeekRow,
} from "../types";

const { Title, Text, Link } = Typography;

const DEFAULT_STANDARD_FUELS: FuelIndicatorCode[] = [
  "UKAZ01", // Benzín 95
  "UKAZ04", // Motorová nafta
  "UKAZ03", // LPG
  "UKAZ021", // Prémiový benzín 98-100
  "UKAZ041", // Prémiová nafta
  "UKAZ05", // CNG
];

const ALL_ORDERED_FUELS: FuelIndicatorCode[] = [
  "UKAZ01", // Benzín 95
  "UKAZ04", // Motorová nafta
  "UKAZ03", // LPG
  "UKAZ02", // Benzín 98
  "UKAZ021", // Benzín 98-100
  "UKAZ041", // Prémiová nafta
  "UKAZ05", // CNG
  "UKAZ06", // LNG
  "UKAZ042", // HVO
  "UKAZ07", // bioLNG
  "UKAZ08", // Vodík
  "UKAZ09", // AC nabíjanie
  "UKAZ10", // DC nabíjanie
  "UKAZ11", // Ultra DC nabíjanie
];

const LOCAL_STORAGE_KEY = "iis_fuel_standard_fuels";

const MONTH_COLORS: Record<number, string> = {
  1: "blue",
  2: "cyan",
  3: "geekblue",
  4: "green",
  5: "lime",
  6: "gold",
  7: "orange",
  8: "volcano",
  9: "purple",
  10: "magenta",
  11: "red",
  12: "indigo",
};

const MONTH_NAMES = [
  { value: 0, label: "Všetky mesiace" },
  { value: 1, label: "Január" },
  { value: 2, label: "Február" },
  { value: 3, label: "Marec" },
  { value: 4, label: "Apríl" },
  { value: 5, label: "Máj" },
  { value: 6, label: "Jún" },
  { value: 7, label: "Júl" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "Október" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

interface ColumnHeaderProps {
  code: FuelIndicatorCode;
  meta: FuelIndicatorMeta;
  isInStandard: boolean;
  onToggleStandard: (code: FuelIndicatorCode, add: boolean) => void;
}

const FuelColumnHeader: React.FC<ColumnHeaderProps> = ({
  code,
  meta,
  isInStandard,
  onToggleStandard,
}) => {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        gap: 6,
        width: "100%",
        paddingRight: 2,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ textAlign: "right", lineHeight: 1.2 }}>
        <div style={{ fontWeight: 600 }}>{meta.shortLabel}</div>
        <div style={{ fontSize: "10px", color: "#8c8c8c" }}>{meta.unit}</div>
      </div>

      <div
        style={{
          width: 18,
          height: 18,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {isInStandard ? (
          <Tooltip title="Skryť zo Základných palív">
            <span
              style={{
                opacity: hovered ? 1 : 0,
                transition: "opacity 0.2s",
                cursor: "pointer",
                color: "#ff4d4f",
                fontSize: "15px",
                display: "inline-flex",
                alignItems: "center",
              }}
              onClick={(e) => {
                e.stopPropagation();
                onToggleStandard(code, false);
              }}
            >
              <MinusCircleOutlined />
            </span>
          </Tooltip>
        ) : (
          <Tooltip title="Pridať do Základných palív">
            <span
              style={{
                opacity: hovered ? 1 : 0,
                transition: "opacity 0.2s",
                cursor: "pointer",
                color: "#52c41a",
                fontSize: "15px",
                display: "inline-flex",
                alignItems: "center",
              }}
              onClick={(e) => {
                e.stopPropagation();
                onToggleStandard(code, true);
              }}
            >
              <PlusCircleOutlined />
            </span>
          </Tooltip>
        )}
      </div>
    </div>
  );
};

export const FuelPricesTool: React.FC = () => {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(0);
  const [fuelView, setFuelView] = useState<"standard" | "all">("standard");
  const [data, setData] = useState<FuelPricesApiResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // User-level customized standard fuels list
  const [standardFuels, setStandardFuels] = useState<FuelIndicatorCode[]>(DEFAULT_STANDARD_FUELS);

  // 1. Load preferences on mount (localStorage first, then server)
  useEffect(() => {
    try {
      const local = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (local) {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setStandardFuels(parsed);
        }
      }
    } catch (e) {
      console.warn("Chyba pri čítaní localStorage:", e);
    }

    // Sync from server
    fetch("/api/fuel-prices/preferences")
      .then((res) => (res.ok ? res.json() : null))
      .then((resData) => {
        if (resData?.standardFuels && Array.isArray(resData.standardFuels)) {
          setStandardFuels(resData.standardFuels);
          try {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(resData.standardFuels));
          } catch {}
        }
      })
      .catch((err) => console.warn("Chyba pri načítaní preferencií:", err));
  }, []);

  // Save preferences to server and localStorage
  const saveStandardFuels = async (newFuels: FuelIndicatorCode[]) => {
    setStandardFuels(newFuels);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newFuels));
    } catch {}

    try {
      await fetch("/api/fuel-prices/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ standardFuels: newFuels }),
      });
    } catch (e) {
      console.error("Chyba pri ukladaní preferencií na server:", e);
    }
  };

  const handleToggleStandard = (code: FuelIndicatorCode, add: boolean) => {
    const meta = FUEL_INDICATORS[code];
    if (add) {
      if (!standardFuels.includes(code)) {
        const next = [...standardFuels, code];
        saveStandardFuels(next);
        message.success(`${meta?.shortLabel || code} pridané do Základných palív`);
      }
    } else {
      if (standardFuels.length <= 1) {
        message.warning("V Základných palivách musí zostať aspoň jedno palivo.");
        return;
      }
      const next = standardFuels.filter((c) => c !== code);
      saveStandardFuels(next);
      message.info(`${meta?.shortLabel || code} skryté zo Základných palív`);
    }
  };

  const handleResetStandard = () => {
    saveStandardFuels(DEFAULT_STANDARD_FUELS);
    message.success("Základné palivá boli resetované na predvolené nastavenie.");
  };

  const loadData = async (year: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/fuel-prices?year=${year}`);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Chyba servera (${res.status})`);
      }
      const json: FuelPricesApiResponse = await res.json();
      setData(json);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Nepodarilo sa načítať dáta.");
      message.error("Nepodarilo sa načítať ceny pohonných látok.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(selectedYear);
  }, [selectedYear]);

  // Filter items by month if selected
  const filteredItems = useMemo(() => {
    if (!data?.items) return [];
    if (selectedMonth === 0) return data.items;
    return data.items.filter((item) => item.month === selectedMonth);
  }, [data, selectedMonth]);

  // Render price cell cleanly without inline diff, with tooltip on hover
  const renderPriceCell = (
    price: number | null | undefined,
    diff: number | null | undefined,
    unit: string,
    fuelName: string
  ) => {
    if (typeof price !== "number") {
      return <Text type="secondary">-</Text>;
    }

    const priceFormatted = price.toFixed(3);
    const hasDiff = typeof diff === "number" && !isNaN(diff);

    let tooltipContent: React.ReactNode = null;
    if (hasDiff && diff !== 0) {
      const isIncrease = diff > 0;
      tooltipContent = (
        <div style={{ textAlign: "center", padding: "2px 4px" }}>
          <div style={{ fontWeight: 600 }}>
            {fuelName}: {priceFormatted} {unit}
          </div>
          <div
            style={{
              marginTop: 4,
              fontWeight: 600,
              color: isIncrease ? "#ff7875" : "#95de64",
            }}
          >
            {isIncrease ? "▲ Nárast: +" : "▼ Pokles: "}
            {diff.toFixed(3)} {unit}
          </div>
          <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.75)" }}>
            oproti predchádzajúcemu týždňu
          </div>
        </div>
      );
    } else if (hasDiff && diff === 0) {
      tooltipContent = (
        <div style={{ textAlign: "center", padding: "2px 4px" }}>
          <div style={{ fontWeight: 600 }}>
            {fuelName}: {priceFormatted} {unit}
          </div>
          <div style={{ marginTop: 2, color: "rgba(255,255,255,0.85)" }}>
            Bez zmeny oproti predchádzajúcemu týždňu
          </div>
        </div>
      );
    } else {
      tooltipContent = `${fuelName}: ${priceFormatted} ${unit}`;
    }

    return (
      <Tooltip title={tooltipContent} placement="top" arrow>
        <span
          style={{
            fontWeight: 600,
            fontSize: "14px",
            cursor: "pointer",
            display: "inline-block",
            padding: "2px 6px",
            borderRadius: 4,
            transition: "background 0.2s, color 0.2s",
          }}
          className="fuel-price-cell-hover"
        >
          {priceFormatted}{" "}
          <span style={{ fontSize: "11px", fontWeight: 400, color: "#8c8c8c" }}>
            {unit}
          </span>
        </span>
      </Tooltip>
    );
  };

  // Build table columns dynamically based on active fuel list
  const columns: ColumnsType<FuelWeekRow> = useMemo(() => {
    const cols: ColumnsType<FuelWeekRow> = [
      {
        title: "Týždeň",
        key: "week",
        fixed: "left",
        width: 220,
        render: (_, record) => {
          return (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Text strong style={{ fontSize: "14px" }}>
                  {record.weekNumber}. týždeň
                </Text>
                <Tag
                  color={MONTH_COLORS[record.month] || "default"}
                  style={{ marginRight: 0, fontSize: "11px", borderRadius: "10px" }}
                >
                  {record.monthName}
                </Tag>
              </div>
              <Text type="secondary" style={{ fontSize: "11px" }}>
                {record.startDate} - {record.endDate}
              </Text>
            </div>
          );
        },
      },
    ];

    // Determine active codes:
    // In "standard" view, only user's standardFuels.
    // In "all" view, all available fuels in fixed order.
    const activeCodes = fuelView === "standard" ? standardFuels : ALL_ORDERED_FUELS;

    for (const code of activeCodes) {
      const meta = FUEL_INDICATORS[code];
      if (!meta) continue;

      const isInStandard = standardFuels.includes(code);

      cols.push({
        title: (
          <FuelColumnHeader
            code={code}
            meta={meta}
            isInStandard={isInStandard}
            onToggleStandard={handleToggleStandard}
          />
        ),
        key: code,
        width: 150,
        align: "right",
        render: (_, record) =>
          renderPriceCell(record.prices[code], record.diffs[code], meta.unit, meta.shortLabel),
      });
    }

    return cols;
  }, [fuelView, standardFuels]);

  // Export to Excel
  const handleExportExcel = () => {
    if (!filteredItems || filteredItems.length === 0) {
      message.warning("Žiadne dáta na export.");
      return;
    }

    const exportRows = filteredItems.map((item) => {
      const rowObj: Record<string, any> = {
        Týždeň: `${item.weekNumber}. týždeň (${item.year})`,
        Mesiac: item.monthName,
        "Od dátumu": item.startDate,
        "Do dátumu": item.endDate,
      };

      for (const [code, meta] of Object.entries(FUEL_INDICATORS)) {
        rowObj[`${meta.shortLabel} (${meta.unit})`] = item.prices[code as FuelIndicatorCode] ?? "";
      }

      return rowObj;
    });

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `Ceny palív ${selectedYear}`);
    XLSX.writeFile(workbook, `priemerne_ceny_paliv_sr_${selectedYear}.xlsx`);
    message.success(`Excel súbor za rok ${selectedYear} bol úspešne vygenerovaný.`);
  };

  return (
    <div style={{ padding: "8px 0" }}>
      {/* Header section */}
      <Card variant="borderless" style={{ marginBottom: 16 }}>
        <Row justify="space-between" align="middle" gutter={[16, 16]}>
          <Col xs={24} lg={16}>
            <Space align="center" size={12}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 10,
                  backgroundColor: "#e6f4ff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#1677ff",
                  fontSize: 22,
                }}
              >
                <CarOutlined />
              </div>
              <div>
                <Title level={4} style={{ margin: 0 }}>
                  Priemerné ceny pohonných látok v SR (týždenne)
                </Title>
                <div style={{ marginTop: 2 }}>
                  <Text type="secondary" style={{ fontSize: "12px" }}>
                    Zdroj: Štatistický úrad Slovenskej republiky (produkt{" "}
                    <Link
                      href="https://data.statistics.sk/api/v2/dataset/sp0207ts/all/last1?lang=sk&type=json"
                      target="_blank"
                      rel="noreferrer"
                    >
                      sp0207ts
                    </Link>
                    )
                  </Text>
                  {data?.updatedAt && (
                    <Tag color="blue" style={{ marginLeft: 8, fontSize: "11px", borderRadius: 4 }}>
                      Posledná publikácia ŠÚ SR: {data.updatedAt}
                    </Tag>
                  )}
                </div>
              </div>
            </Space>
          </Col>
          <Col xs={24} lg={8} style={{ textAlign: "right" }}>
            <Space wrap>
              <Button
                icon={<ReloadOutlined />}
                onClick={() => loadData(selectedYear)}
                loading={loading}
              >
                Obnoviť
              </Button>
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                onClick={handleExportExcel}
                disabled={!data || data.items.length === 0}
              >
                Export Excel
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* KPI highlight cards for latest week */}
      {data?.latestSummary && data.latestSummary.length > 0 && (
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          {data.latestSummary.map((item) => {
            const hasPrice = typeof item.price === "number";
            const diff = item.diff;
            const hasDiff = typeof diff === "number" && !isNaN(diff) && diff !== 0;

            return (
              <Col xs={12} sm={12} md={6} key={item.code}>
                <Card
                  size="small"
                  variant="borderless"
                  style={{
                    borderRadius: 8,
                    background: "#ffffff",
                    boxShadow: "0 1px 2px rgba(0, 0, 0, 0.03)",
                  }}
                >
                  <Text type="secondary" style={{ fontSize: "12px", fontWeight: 500 }}>
                    {item.label}
                  </Text>
                  <div style={{ marginTop: 4, display: "flex", alignItems: "baseline", gap: 6 }}>
                    <span style={{ fontSize: "22px", fontWeight: 700, color: "#1f1f1f" }}>
                      {hasPrice ? item.price?.toFixed(3) : "-"}
                    </span>
                    <span style={{ fontSize: "12px", color: "#8c8c8c" }}>{item.unit}</span>
                  </div>
                  {hasDiff ? (
                    <div
                      style={{
                        marginTop: 4,
                        fontSize: "12px",
                        fontWeight: 600,
                        color: diff! > 0 ? "#cf1322" : "#389e0d",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      {diff! > 0 ? (
                        <>
                          <ArrowUpOutlined style={{ fontSize: "11px" }} />
                          <span>+{diff!.toFixed(3)} € oproti min. týždňu</span>
                        </>
                      ) : (
                        <>
                          <ArrowDownOutlined style={{ fontSize: "11px" }} />
                          <span>{diff!.toFixed(3)} € oproti min. týždňu</span>
                        </>
                      )}
                    </div>
                  ) : (
                    <div style={{ marginTop: 4, fontSize: "12px", color: "#8c8c8c" }}>
                      bez zmeny oproti min. týždňu
                    </div>
                  )}
                </Card>
              </Col>
            );
          })}
        </Row>
      )}

      {/* Main Table Card */}
      <Card variant="borderless">
        {/* Controls toolbar */}
        <Row
          justify="space-between"
          align="middle"
          gutter={[16, 16]}
          style={{ marginBottom: 16 }}
        >
          <Col xs={24} md={14}>
            <Space wrap size={12}>
              {/* Year filter */}
              <Space size={6}>
                <CalendarOutlined style={{ color: "#8c8c8c" }} />
                <Text strong>Rok:</Text>
                <Select
                  value={selectedYear}
                  onChange={(val) => {
                    setSelectedYear(val);
                    setSelectedMonth(0); // reset month when year changes
                  }}
                  style={{ width: 110 }}
                  options={data?.availableYears?.map((y) => ({
                    value: y,
                    label: `${y}`,
                  }))}
                />
              </Space>

              {/* Month filter */}
              <Space size={6}>
                <Text strong>Mesiac:</Text>
                <Select
                  value={selectedMonth}
                  onChange={setSelectedMonth}
                  style={{ width: 160 }}
                  options={MONTH_NAMES}
                />
              </Space>
            </Space>
          </Col>

          <Col xs={24} md={10} style={{ textAlign: "right" }}>
            <Space size={8} wrap>
              <Text type="secondary" style={{ fontSize: "12px" }}>
                Zobrazenie:
              </Text>
              <Segmented
                value={fuelView}
                onChange={(val) => setFuelView(val as "standard" | "all")}
                options={[
                  {
                    label: `Základné palivá (${standardFuels.length})`,
                    value: "standard",
                  },
                  { label: "Všetky palivá a energie", value: "all" },
                ]}
              />
              <Popconfirm
                title="Obnoviť predvolené palivá?"
                description="Obnoví základné palivá na pôvodný zoznam (Benzín 95, Nafta, LPG, 98-100, Prémiová nafta, CNG)."
                onConfirm={handleResetStandard}
                okText="Áno, resetovať"
                cancelText="Zrušiť"
              >
                <Tooltip title="Resetovať nastavenie základných palív">
                  <Button size="small" icon={<UndoOutlined />} />
                </Tooltip>
              </Popconfirm>
            </Space>
          </Col>
        </Row>

        {/* Informative helper banner about column customization */}
        <div
          style={{
            marginBottom: 16,
            padding: "8px 12px",
            background: "#f6ffed",
            border: "1px solid #b7eb8f",
            borderRadius: 6,
            fontSize: "12px",
            color: "#389e0d",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <span>
            💡 <strong>Tip:</strong> Zmena ceny oproti minulému týždňu sa zobrazí po <strong>hovernutí myšou</strong> priamo na konkrétnu bunku.{" "}
            {fuelView === "standard"
              ? "Hovernutím na názov stĺpca môžete palivo skryť pomocou ikonky mínus (−)."
              : "Hovernutím na názov stĺpca môžete palivo pridať do Základných palív pomocou pluska (+)."}
          </span>
          <span style={{ fontSize: "11px", color: "#52c41a" }}>
            Nastavenie sa ukladá k vášmu účtu.
          </span>
        </div>

        {error && (
          <Alert
            type="error"
            message="Chyba pri sťahovaní dát"
            description={error}
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        {/* Soft Month division indicator if filtered by month */}
        {selectedMonth > 0 && (
          <Alert
            type="info"
            showIcon
            icon={<InfoCircleOutlined />}
            message={`Filtruje sa len mesiac ${MONTH_NAMES.find((m) => m.value === selectedMonth)?.label} ${selectedYear}`}
            action={
              <Button size="small" type="link" onClick={() => setSelectedMonth(0)}>
                Zobraziť celý rok
              </Button>
            }
            style={{ marginBottom: 16 }}
          />
        )}

        {/* Table */}
        <Table<FuelWeekRow>
          dataSource={filteredItems}
          columns={columns}
          loading={loading}
          pagination={{
            defaultPageSize: 15,
            showSizeChanger: true,
            pageSizeOptions: ["15", "30", "52", "100"],
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} z ${total} týždňov (najnovšie navrchu)`,
          }}
          scroll={{ x: 1000 }}
          size="middle"
          rowKey="key"
          rowClassName={(record) => {
            // Apply soft visual divider if record starts a new month
            return record.isMonthBoundary && selectedMonth === 0
              ? "fuel-prices-month-divider"
              : "";
          }}
        />
      </Card>

      <style jsx global>{`
        .fuel-prices-month-divider > td {
          border-top: 2px solid #1677ff22 !important;
          background-color: #fafcff !important;
        }
        .fuel-price-cell-hover:hover {
          background-color: #f0f5ff;
          color: #1677ff;
        }
      `}</style>
    </div>
  );
};
