import { state } from "./state.js";

const charts = [
  {
    key: "residual",
    title: "Residual",
    unit: "log10",
    series: [{ key: "residual", label: "Residual", color: "#0f6f95", transform: (value) => Math.log10(Math.max(value, 1e-8)) }]
  },
  {
    key: "forces",
    title: "Forces",
    unit: "N",
    series: [
      { key: "drag", label: "Drag", color: "#1f7a6d", transform: (value) => value },
      { key: "lift", label: "Lift", color: "#8a5a12", transform: (value) => value }
    ]
  },
  {
    key: "coefficients",
    title: "Coefficients",
    unit: "",
    series: [
      { key: "cd", label: "Cd", color: "#5b5fc7", transform: (value) => value },
      { key: "cl", label: "Cl", color: "#b42318", transform: (value) => value }
    ]
  }
];

export function renderTelemetryGraphs(container) {
  const samples = state.telemetry;
  container.innerHTML = samples.length
    ? charts.map((chart) => chartSvg(chart, samples, 360, 220)).join("")
    : `<div class="empty-graph">Run graphs appear here after a run starts.</div>`;
}

export function exportTelemetrySvg() {
  if (!state.completed || !state.telemetry.length) return;
  downloadBlob("tarangini-run-graphs.svg", "image/svg+xml", combinedSvg());
}

export function exportTelemetryPng() {
  if (!state.completed || !state.telemetry.length) return;
  const image = new Image();
  const svg = combinedSvg();
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));

  image.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 980;
    canvas.height = 760;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0);
    URL.revokeObjectURL(url);
    canvas.toBlob((blob) => {
      if (blob) downloadBlob("tarangini-run-graphs.png", "image/png", blob);
    }, "image/png");
  };

  image.src = url;
}

function combinedSvg() {
  const width = 980;
  const chartWidth = 900;
  const chartHeight = 210;
  const headerHeight = 64;
  const gap = 18;
  const height = headerHeight + charts.length * chartHeight + (charts.length - 1) * gap + 34;
  const body = charts
    .map((chart, index) => `<g transform="translate(40 ${headerHeight + index * (chartHeight + gap)})">${chartSvg(chart, state.telemetry, chartWidth, chartHeight, false)}</g>`)
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect width="100%" height="100%" fill="#ffffff"/>
    <text x="40" y="34" fill="#1e2424" font-family="system-ui, sans-serif" font-size="22" font-weight="800">Tarangini Run Graphs</text>
    <text x="40" y="54" fill="#667174" font-family="system-ui, sans-serif" font-size="12">Telemetry samples: ${state.telemetry.length}</text>
    ${body}
  </svg>`;
}

function chartSvg(chart, samples, width, height, wrapped = true) {
  const margin = { top: 34, right: 18, bottom: 34, left: 58 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const xMax = Math.max(1, ...samples.map((sample) => sample.iteration));
  const values = chart.series.flatMap((series) => samples.map((sample) => series.transform(sample[series.key])));
  let yMin = Math.min(...values);
  let yMax = Math.max(...values);
  if (yMin === yMax) {
    yMin -= 1;
    yMax += 1;
  }
  const padding = (yMax - yMin) * 0.12;
  yMin -= padding;
  yMax += padding;

  const x = (iteration) => margin.left + (iteration / xMax) * plotWidth;
  const y = (value) => margin.top + (1 - (value - yMin) / (yMax - yMin)) * plotHeight;
  const lines = chart.series
    .map((series) => {
      const points = samples.map((sample) => `${x(sample.iteration).toFixed(2)},${y(series.transform(sample[series.key])).toFixed(2)}`).join(" ");
      return `<polyline points="${points}" fill="none" stroke="${series.color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`;
    })
    .join("");
  const legend = chart.series
    .map((series, index) => {
      const lx = margin.left + index * 92;
      return `<g transform="translate(${lx} ${height - 8})"><rect width="10" height="10" rx="2" fill="${series.color}"/><text x="16" y="10" fill="#354043" font-family="system-ui, sans-serif" font-size="11">${escapeXml(series.label)}</text></g>`;
    })
    .join("");
  const inner = `
    <rect width="${width}" height="${height}" rx="8" fill="#fbfcfc" stroke="#dbe3e0"/>
    <text x="${margin.left}" y="22" fill="#1e2424" font-family="system-ui, sans-serif" font-size="14" font-weight="800">${escapeXml(chart.title)}</text>
    <text x="${width - margin.right}" y="22" text-anchor="end" fill="#667174" font-family="system-ui, sans-serif" font-size="11">${escapeXml(chart.unit)}</text>
    <line x1="${margin.left}" y1="${margin.top + plotHeight}" x2="${margin.left + plotWidth}" y2="${margin.top + plotHeight}" stroke="#cbd4d1"/>
    <line x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${margin.top + plotHeight}" stroke="#cbd4d1"/>
    <text x="${margin.left}" y="${height - 12}" text-anchor="middle" fill="#667174" font-family="system-ui, sans-serif" font-size="11">0</text>
    <text x="${margin.left + plotWidth}" y="${height - 12}" text-anchor="middle" fill="#667174" font-family="system-ui, sans-serif" font-size="11">${xMax}</text>
    <text x="${margin.left - 8}" y="${margin.top + 4}" text-anchor="end" fill="#667174" font-family="system-ui, sans-serif" font-size="11">${formatAxis(yMax)}</text>
    <text x="${margin.left - 8}" y="${margin.top + plotHeight}" text-anchor="end" fill="#667174" font-family="system-ui, sans-serif" font-size="11">${formatAxis(yMin)}</text>
    ${lines}
    ${legend}
  `;
  return wrapped ? `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeXml(chart.title)} graph">${inner}</svg>` : inner;
}

function formatAxis(value) {
  if (Math.abs(value) >= 1000) return value.toExponential(1);
  if (Math.abs(value) < 0.01 && value !== 0) return value.toExponential(1);
  return value.toFixed(Math.abs(value) >= 10 ? 1 : 3);
}

function downloadBlob(filename, type, content) {
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
