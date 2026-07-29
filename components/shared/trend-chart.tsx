import type { LucideIcon } from "lucide-react";

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const WIDTH = 720;
const HEIGHT = 260;
const MARGIN = { top: 18, right: 16, bottom: 42, left: 58 };
const PLOT_WIDTH = WIDTH - MARGIN.left - MARGIN.right;
const PLOT_HEIGHT = HEIGHT - MARGIN.top - MARGIN.bottom;
const GRID_STEPS = 4;

interface TrendChartProps {
  id: string;
  title: string;
  description: string;
  summary: string;
  data: Array<{ period: string; value: number }>;
  icon: LucideIcon;
  kind: "area" | "bar";
  valueLabel: string;
  formatValue: (value: number) => string;
}

function niceCeiling(value: number): number {
  if (value <= 1) return 1;

  const power = 10 ** Math.floor(Math.log10(value));
  const fraction = value / power;
  const niceFraction = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;

  return niceFraction * power;
}

function xPosition(index: number, count: number): number {
  if (count <= 1) return MARGIN.left + PLOT_WIDTH / 2;
  return MARGIN.left + (index / (count - 1)) * PLOT_WIDTH;
}

function yPosition(value: number, ceiling: number): number {
  return MARGIN.top + PLOT_HEIGHT - (value / ceiling) * PLOT_HEIGHT;
}

function periodLabel(period: string): string {
  const month = Number(period.slice(5, 7));
  const year = period.slice(2, 4);
  return `T${month}/${year}`;
}

export function TrendChart({
  id,
  title,
  description,
  summary,
  data,
  icon: Icon,
  kind,
  valueLabel,
  formatValue,
}: TrendChartProps) {
  const maxValue = Math.max(...data.map((point) => point.value), 0);
  const ceiling = niceCeiling(maxValue);
  const hasData = maxValue > 0;
  const points = data.map((point, index) => ({
    ...point,
    x: xPosition(index, data.length),
    y: yPosition(point.value, ceiling),
  }));
  const linePath = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
  const areaPath =
    points.length > 0
      ? `${linePath} L ${points.at(-1)?.x ?? MARGIN.left} ${MARGIN.top + PLOT_HEIGHT} L ${points[0].x} ${MARGIN.top + PLOT_HEIGHT} Z`
      : "";
  const slotWidth = data.length > 0 ? PLOT_WIDTH / data.length : PLOT_WIDTH;
  const barWidth = Math.min(34, slotWidth * 0.58);

  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle id={`${id}-title`} className="flex items-center gap-2">
          <Icon className="text-primary size-4" aria-hidden="true" />
          {title}
        </CardTitle>
        <CardDescription id={`${id}-description`}>{description}</CardDescription>
        <CardAction className="text-right">
          <p className="text-muted-foreground text-xs">Tổng trong kỳ</p>
          <p className="font-semibold tabular-nums">{summary}</p>
        </CardAction>
      </CardHeader>

      <CardContent>
        <div className="w-full overflow-hidden">
          <svg
            className="h-auto min-h-56 w-full"
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            role="img"
            aria-labelledby={`${id}-title ${id}-description`}
          >
            {kind === "area" && (
              <defs>
                <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.02" />
                </linearGradient>
              </defs>
            )}

            {Array.from({ length: GRID_STEPS + 1 }, (_, index) => {
              const y = MARGIN.top + (index / GRID_STEPS) * PLOT_HEIGHT;
              const tickValue = ceiling * (1 - index / GRID_STEPS);

              return (
                <g key={index}>
                  <line
                    x1={MARGIN.left}
                    x2={WIDTH - MARGIN.right}
                    y1={y}
                    y2={y}
                    stroke="var(--border)"
                    strokeDasharray={index === GRID_STEPS ? undefined : "4 5"}
                  />
                  <text
                    x={MARGIN.left - 10}
                    y={y + 4}
                    fill="var(--muted-foreground)"
                    fontSize="11"
                    textAnchor="end"
                  >
                    {formatValue(tickValue)}
                  </text>
                </g>
              );
            })}

            {kind === "area" && areaPath && (
              <>
                <path d={areaPath} fill={`url(#${id}-fill)`} />
                <path
                  d={linePath}
                  fill="none"
                  stroke="var(--primary)"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="3"
                />
                {points.map((point) => (
                  <circle
                    key={point.period}
                    cx={point.x}
                    cy={point.y}
                    r="4"
                    fill="var(--background)"
                    stroke="var(--primary)"
                    strokeWidth="3"
                  >
                    <title>
                      {periodLabel(point.period)}: {formatValue(point.value)} {valueLabel}
                    </title>
                  </circle>
                ))}
              </>
            )}

            {kind === "bar" &&
              points.map((point) => {
                const height = Math.max(0, MARGIN.top + PLOT_HEIGHT - point.y);

                return (
                  <rect
                    key={point.period}
                    x={point.x - barWidth / 2}
                    y={point.y}
                    width={barWidth}
                    height={height}
                    rx="5"
                    fill="var(--secondary)"
                    opacity={point.value > 0 ? 0.9 : 0.3}
                  >
                    <title>
                      {periodLabel(point.period)}: {formatValue(point.value)}
                    </title>
                  </rect>
                );
              })}

            {data.map((point, index) => {
              if (index % 2 !== 0 && index !== data.length - 1) return null;

              return (
                <text
                  key={point.period}
                  x={xPosition(index, data.length)}
                  y={HEIGHT - 14}
                  fill="var(--muted-foreground)"
                  fontSize="11"
                  textAnchor="middle"
                >
                  {periodLabel(point.period)}
                </text>
              );
            })}

            {!hasData && (
              <text
                x={MARGIN.left + PLOT_WIDTH / 2}
                y={MARGIN.top + PLOT_HEIGHT / 2}
                fill="var(--muted-foreground)"
                fontSize="13"
                textAnchor="middle"
              >
                Chưa có dữ liệu trong 12 tháng gần nhất
              </text>
            )}
          </svg>
        </div>

        <table className="sr-only">
          <caption>{title} trong 12 tháng gần nhất</caption>
          <thead>
            <tr>
              <th scope="col">Tháng</th>
              <th scope="col">{valueLabel}</th>
            </tr>
          </thead>
          <tbody>
            {data.map((point) => (
              <tr key={point.period}>
                <th scope="row">{periodLabel(point.period)}</th>
                <td>{formatValue(point.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
