/**
 * Pure ECharts option-builder for Signal Insights chart payloads. Ported from
 * the hand-rolled chart-viewer.html (see git history) with no behavior
 * changes — only converted to typed, isDark-parameterized functions so it can
 * be shared between the guest viewer and the dev preview harness.
 */

export interface ChartPoint {
  0: number | string;
  1: number;
}

export interface ChartElement {
  label?: string;
  value?: number;
  group?: string;
  points?: [number | string, number][];
  angle?: number;
  min?: number;
  max?: number;
  first_quartile?: number;
  median?: number;
  third_quartile?: number;
}

export type ChartType =
  | "line"
  | "scatter"
  | "bar"
  | "pie"
  | "box_and_whisker"
  | "superchart"
  | "unknown";

export interface ChartData {
  type: ChartType;
  title?: string | null;
  x_label?: string;
  y_label?: string;
  elements?: ChartElement[];
}

const LABEL_PADDING = 12; // fixed gap between y-axis name and tick labels
const NAME_WIDTH = 14; // approximate width of rotated name text

function sharedOpts(isDark: boolean) {
  const textColor = isDark ? "#ccc" : "#555";
  return {
    backgroundColor: "transparent",
    textStyle: { color: textColor, fontSize: 11 },
  };
}

/** Estimate pixel width of a formatted number at font-size 11. */
function estimateLabelWidth(value: number): number {
  const text = Math.abs(value).toLocaleString();
  let width = 0;
  for (const ch of text) {
    if (ch === "," || ch === ".") width += 3.5;
    else if (ch === "-") width += 5;
    else width += 6.5;
  }
  return width;
}

/** Compute nameGap and grid.left from data values. */
function yAxisLayout(values: number[]): { nameGap: number; left: number } {
  let maxVal = 0;
  for (const v of values) {
    const abs = Math.abs(v);
    if (abs > maxVal) maxVal = abs;
  }
  const labelWidth = estimateLabelWidth(maxVal);
  const nameGap = Math.ceil(labelWidth + LABEL_PADDING);
  const left = Math.ceil(nameGap + NAME_WIDTH + 4);
  return { nameGap, left };
}

/** Extract all numeric y-values from chart data. */
function extractYValues(chart: ChartData): number[] {
  const values: number[] = [];
  if (chart.type === "line" || chart.type === "scatter") {
    for (const e of chart.elements ?? [])
      for (const p of e.points ?? []) values.push(Number(p[1]));
  } else if (chart.type === "bar") {
    for (const e of chart.elements ?? []) values.push(Number(e.value));
  } else if (chart.type === "box_and_whisker") {
    for (const e of chart.elements ?? []) {
      if (e.min != null) values.push(e.min);
      if (e.max != null) values.push(e.max);
    }
  }
  return values;
}

// Hide legend for single-series; show at bottom for multi-series.
function layoutOpts(
  isDark: boolean,
  seriesCount: number,
  left: number,
  hasXAxisName: boolean,
) {
  const textColor = isDark ? "#ccc" : "#555";
  const grid = { top: 40, right: 12, left, containLabel: false };
  if (seriesCount <= 1) {
    return {
      legend: { show: false },
      grid: { ...grid, bottom: hasXAxisName ? 45 : 30 },
    };
  }
  return {
    legend: { bottom: 5, textStyle: { color: textColor, fontSize: 11 } },
    grid: { ...grid, bottom: hasXAxisName ? 90 : 55 },
  };
}

function axisDefaults(isDark: boolean) {
  const lineColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
  const labelColor = isDark ? "#aaa" : "#666";
  return {
    axisLine: { lineStyle: { color: lineColor } },
    splitLine: { lineStyle: { color: lineColor } },
    axisLabel: { color: labelColor, fontSize: 11 },
    nameTextStyle: { color: labelColor, fontSize: 11 },
  };
}

/**
 * Builds ECharts options for a single (non-superchart) chart entry, or
 * `null` when the chart type/shape isn't supported (caller should fall back
 * to the PNG rendering, or render raw JSON as a last resort).
 */
// eslint-disable-next-line complexity -- ported 1:1 from the original hand-rolled implementation
export function buildEChartOptions(
  chart: ChartData,
  isDark: boolean,
): Record<string, unknown> | null {
  const shared = sharedOpts(isDark);
  const axis = axisDefaults(isDark);

  if (chart.type === "line" || chart.type === "scatter") {
    const yl = yAxisLayout(extractYValues(chart));
    const layout = layoutOpts(
      isDark,
      (chart.elements ?? []).length,
      yl.left,
      !!chart.x_label,
    );
    return {
      ...shared,
      ...layout,
      xAxis: {
        type: "category",
        name: chart.x_label,
        nameLocation: "middle",
        nameGap: 40,
        ...axis,
        axisLabel: { ...axis.axisLabel, rotate: 30 },
      },
      yAxis: {
        name: chart.y_label,
        nameLocation: "middle",
        nameGap: yl.nameGap,
        ...axis,
      },
      tooltip: { trigger: "axis" },
      series: (chart.elements ?? []).map((e) => ({
        name: e.label,
        type: chart.type,
        data: (e.points ?? []).map((p) => [p[0], p[1]]),
        smooth: chart.type === "line",
        symbolSize: chart.type === "scatter" ? 6 : 4,
      })),
    };
  }

  if (chart.type === "bar") {
    const groups: Record<string, ChartElement[]> = {};
    for (const e of chart.elements ?? []) {
      const key = e.group ?? "";
      (groups[key] ??= []).push(e);
    }
    const yl = yAxisLayout(extractYValues(chart));
    const layout = layoutOpts(
      isDark,
      Object.keys(groups).length,
      yl.left,
      !!chart.x_label,
    );
    return {
      ...shared,
      ...layout,
      xAxis: {
        type: "category",
        name: chart.x_label,
        nameLocation: "middle",
        nameGap: 40,
        ...axis,
        axisLabel: { ...axis.axisLabel, rotate: 30 },
      },
      yAxis: {
        name: chart.y_label,
        nameLocation: "middle",
        nameGap: yl.nameGap,
        ...axis,
      },
      tooltip: { trigger: "axis" },
      series: Object.entries(groups).map(([group, elems]) => ({
        name: group,
        type: "bar",
        data: elems.map((e) => [e.label, e.value]),
        barMaxWidth: 40,
      })),
    };
  }

  if (chart.type === "pie") {
    const textColor = isDark ? "#ccc" : "#555";
    return {
      ...shared,
      grid: { top: 40, right: 12, left: 100, bottom: 90, containLabel: false },
      legend: { bottom: 5, textStyle: { color: textColor, fontSize: 11 } },
      tooltip: { trigger: "item", formatter: "{b}: {c} ({d}%)" },
      series: [
        {
          type: "pie",
          radius: ["30%", "60%"],
          center: ["50%", "50%"],
          data: (chart.elements ?? []).map((e) => ({
            value: e.angle,
            name: e.label,
          })),
          label: { color: isDark ? "#ccc" : "#333", fontSize: 11 },
        },
      ],
    };
  }

  if (chart.type === "box_and_whisker") {
    const yl = yAxisLayout(extractYValues(chart));
    const layout = layoutOpts(
      isDark,
      (chart.elements ?? []).length,
      yl.left,
      !!chart.x_label,
    );
    return {
      ...shared,
      ...layout,
      xAxis: {
        type: "category",
        name: chart.x_label,
        nameLocation: "middle",
        nameGap: 40,
        ...axis,
      },
      yAxis: {
        name: chart.y_label,
        nameLocation: "middle",
        nameGap: yl.nameGap,
        min: "dataMin",
        max: "dataMax",
        ...axis,
      },
      tooltip: { trigger: "item" },
      series: (chart.elements ?? []).map((e) => ({
        name: e.label,
        type: "boxplot",
        data: [[e.min, e.first_quartile, e.median, e.third_quartile, e.max]],
      })),
    };
  }

  return null;
}
