"use client";

import React from "react";

interface RadarDataPoint {
  dimension: string;
  score: number; // 1 to 4
  fullMark: 4;
}

interface RadarChartProps {
  data: RadarDataPoint[];
  size?: number;
}

export function CareRadarChart({ data, size = 300 }: RadarChartProps) {
  if (!data || data.length === 0) return null;

  const center = size / 2;
  const radius = center - 40;
  const total = data.length;

  const getCoordinates = (index: number, value: number) => {
    // scale 1 to 4 to radius
    const normalized = Math.max(0, Math.min(4, value)) / 4;
    const angle = (Math.PI * 2 * index) / total - Math.PI / 2;
    const x = center + radius * normalized * Math.cos(angle);
    const y = center + radius * normalized * Math.sin(angle);
    return { x, y };
  };

  // Polygon points for data
  const dataPoints = data.map((d, i) => getCoordinates(i, d.score));
  const dataPolygonString = dataPoints.map((p) => `${p.x},${p.y}`).join(" ");

  // Target 3.0 polygon
  const targetPoints = data.map((_, i) => getCoordinates(i, 3.0));
  const targetPolygonString = targetPoints.map((p) => `${p.x},${p.y}`).join(" ");

  // Background grid levels 1, 2, 3, 4
  const levels = [1, 2, 3, 4];

  return (
    <div className="flex flex-col items-center justify-center">
      <svg width={size} height={size} className="overflow-visible">
        {/* Background Grid Rings */}
        {levels.map((lvl) => {
          const ringPoints = data.map((_, i) => getCoordinates(i, lvl));
          const ringStr = ringPoints.map((p) => `${p.x},${p.y}`).join(" ");
          return (
            <polygon
              key={lvl}
              points={ringStr}
              fill="none"
              stroke="currentColor"
              strokeWidth={lvl === 3 ? "1.5" : "1"}
              strokeDasharray={lvl === 3 ? "3,3" : undefined}
              className={lvl === 3 ? "text-accent" : "text-hairline/60"}
            />
          );
        })}

        {/* Spokes (Axes) */}
        {data.map((_, i) => {
          const outer = getCoordinates(i, 4);
          return (
            <line
              key={i}
              x1={center}
              y1={center}
              x2={outer.x}
              y2={outer.y}
              stroke="currentColor"
              strokeWidth="1"
              className="text-hairline/40"
            />
          );
        })}

        {/* Target 3.0 reference outline */}
        <polygon
          points={targetPolygonString}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray="4 3"
          className="text-accent/60"
        />

        {/* Actual Data Polygon */}
        <polygon
          points={dataPolygonString}
          fill="currentColor"
          fillOpacity="0.25"
          stroke="currentColor"
          strokeWidth="2.5"
          className="text-accent transition-all duration-500"
        />

        {/* Data points dots */}
        {dataPoints.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r="4.5"
            fill="currentColor"
            className="text-accent ring-2 ring-surface"
          />
        ))}

        {/* Labels at outer edges */}
        {data.map((d, i) => {
          const labelCoord = getCoordinates(i, 4.4);
          return (
            <text
              key={i}
              x={labelCoord.x}
              y={labelCoord.y}
              textAnchor="middle"
              dominantBaseline="central"
              className="text-[10px] font-bold fill-ink"
            >
              {d.dimension}
            </text>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-4 text-[11px] text-ash">
        <div className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-accent" />
          <span>Skor Aktual</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 border-b-2 border-dashed border-accent" />
          <span>Target Standar (3.0)</span>
        </div>
      </div>
    </div>
  );
}
