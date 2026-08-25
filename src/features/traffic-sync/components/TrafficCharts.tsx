"use client";

import React, { useState, useMemo, useRef } from "react";
import { Card, Select, Button, Space, Typography, Row, Col } from "antd";
import { DownloadOutlined } from "@ant-design/icons";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import html2canvas from "html2canvas";

const { Title, Text } = Typography;
const { Option } = Select;

// Moderná paleta farieb pre grafy
const COLORS = [
  "#1890ff", "#2fc25b", "#facc14", "#223273", "#8543e0", "#13c2c2", "#3436c7", "#f04864"
];

interface TrafficChartsProps {
  data: any[];
}

export const TrafficCharts: React.FC<TrafficChartsProps> = ({ data }) => {
  const [chartType, setChartType] = useState<"pie" | "bar">("pie");
  const [selectedColumn, setSelectedColumn] = useState<string>("Custom Channel Grouping");
  
  const chartRef = useRef<HTMLDivElement>(null);

  // Agregácia dát pre graf
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];

    const counts: Record<string, number> = {};

    data.forEach((row) => {
      let finalCategory = "Neznáme (Prázdne)";

      if (selectedColumn === "Custom Channel Grouping") {
        const source = String(row["Original Traffic Source"] || "").toLowerCase();
        const drill1 = String(row["Original Traffic Source Drill-Down 1"] || "").toLowerCase();
        
        if (source.includes("google")) {
          if (drill1.includes("cpc") || drill1.includes("paid") || drill1.includes("ad")) {
            finalCategory = "Paid Google";
          } else {
            finalCategory = "Organic Google";
          }
        } else if (
          source.includes("facebook") || 
          source.includes("fb") || 
          source.includes("instagram") || 
          source.includes("ig") || 
          source.includes("meta")
        ) {
          if (drill1.includes("cpc") || drill1.includes("paid") || drill1.includes("ad")) {
            finalCategory = "Paid Meta";
          } else {
            finalCategory = "Organic Meta";
          }
        } else if (source.includes("direct") || source.includes("$direct")) {
          finalCategory = "Direct";
        } else if (
          drill1.includes("referral") || 
          drill1.includes("affiliate") || 
          source.includes("referral")
        ) {
          finalCategory = "Referral / Affiliate";
        } else if (source) {
          finalCategory = "Ostatné";
        }
      } else {
        let value = row[selectedColumn];
        if (value && String(value).trim() !== "") {
          finalCategory = String(value);
        }
      }
      
      counts[finalCategory] = (counts[finalCategory] || 0) + 1;
    });

    // Zoradíme od najväčšieho po najmenší
    return Object.keys(counts)
      .map((key) => ({
        name: key,
        value: counts[key],
      }))
      .sort((a, b) => b.value - a.value);
  }, [data, selectedColumn]);

  const handleDownloadPNG = async () => {
    if (chartRef.current) {
      try {
        const canvas = await html2canvas(chartRef.current, {
          backgroundColor: "#ffffff",
          scale: 2, // vyššie rozlíšenie pre lepšiu kvalitu
        });
        
        const image = canvas.toDataURL("image/png", 1.0);
        const link = document.createElement("a");
        link.download = `traffic-source-chart-${Date.now()}.png`;
        link.href = image;
        link.click();
      } catch (error) {
        console.error("Failed to generate chart image", error);
      }
    }
  };

  if (!data || data.length === 0) {
    return <Text type="secondary">Zatiaľ žiadne dáta pre grafy.</Text>;
  }

  return (
    <Card style={{ marginTop: 24 }} variant="borderless">
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Title level={5}>Prehľad podľa zdrojov návštevnosti</Title>
        </Col>
        <Col>
          <Space>
            <Select
              value={selectedColumn}
              onChange={setSelectedColumn}
              style={{ width: 280 }}
            >
              <Option value="Custom Channel Grouping">Marketingové kanály (Vlastné)</Option>
              <Option value="Original Traffic Source">Zdroj (Traffic Source)</Option>
              <Option value="Original Traffic Source Drill-Down 1">Kampaň / Médium (Drill-Down 1)</Option>
              <Option value="Original Traffic Source Drill-Down 2">Detail kampane (Drill-Down 2)</Option>
            </Select>

            <Select
              value={chartType}
              onChange={setChartType}
              style={{ width: 140 }}
            >
              <Option value="pie">Koláčový graf</Option>
              <Option value="bar">Stĺpcový graf</Option>
            </Select>

            <Button icon={<DownloadOutlined />} onClick={handleDownloadPNG}>
              Stiahnuť PNG
            </Button>
          </Space>
        </Col>
      </Row>

      <div ref={chartRef} style={{ width: "100%", height: 450, padding: 20 }}>
        <ResponsiveContainer width="100%" height="100%">
          {chartType === "pie" ? (
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={true}
                label={({ name, percent = 0 }) => `${name} (${(percent * 100).toFixed(1)}%)`}
                outerRadius={150}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [`${value} leadov`, "Počet"]} />
              <Legend />
            </PieChart>
          ) : (
            <BarChart
              data={chartData}
              margin={{
                top: 20,
                right: 30,
                left: 20,
                bottom: 60, // Využitie pre dlhé názvy na X osi
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                angle={-45} 
                textAnchor="end" 
                interval={0}
                height={80}
              />
              <YAxis />
              <Tooltip formatter={(value) => [`${value} leadov`, "Počet"]} />
              <Bar dataKey="value" fill="#1890ff" name="Počet leadov">
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </Card>
  );
};
