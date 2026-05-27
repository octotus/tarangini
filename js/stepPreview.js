import { state } from "./state.js";
import { inputs } from "./state.js";
import { render } from "./render.js";

export function readGeometryFile() {
  const file = inputs.geometryFile.files[0];
  state.geometryPreview = {
    fileName: file ? file.name : "",
    status: file ? "reading" : "empty",
    points: [],
    bounds: null,
    schema: "",
    productName: "",
    note: file ? "Reading STEP/STP header and coordinate entities." : "No geometry selected."
  };
  render();

  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    state.geometryPreview = parseStepPreview(file.name, String(reader.result || ""));
    render();
  };
  reader.onerror = () => {
    state.geometryPreview = {
      fileName: file.name,
      status: "error",
      points: [],
      bounds: null,
      schema: "",
      productName: "",
      note: "Could not read the selected file in the browser."
    };
    render();
  };
  reader.readAsText(file.slice(0, 2_000_000));
}

export function parseStepPreview(fileName, text) {
  const schemaMatch = text.match(/FILE_SCHEMA\s*\(\s*\(\s*'([^']+)'/i);
  const nameMatch = text.match(/FILE_NAME\s*\(\s*'([^']*)'/i);
  const points = [];
  const pointPattern = /CARTESIAN_POINT\s*\(\s*'[^']*'\s*,\s*\(\s*([-+0-9.Ee]+)\s*,\s*([-+0-9.Ee]+)\s*,\s*([-+0-9.Ee]+)\s*\)\s*\)/gi;
  let match = pointPattern.exec(text);

  while (match && points.length < 2500) {
    const point = {
      x: Number(match[1]),
      y: Number(match[2]),
      z: Number(match[3])
    };
    if (Number.isFinite(point.x) && Number.isFinite(point.y) && Number.isFinite(point.z)) {
      points.push(point);
    }
    match = pointPattern.exec(text);
  }

  const bounds = points.length > 0 ? pointBounds(points) : null;
  const truncated = /CARTESIAN_POINT/i.test(text) && points.length === 2500;
  const note =
    points.length > 0
      ? `${points.length}${truncated ? "+" : ""} STEP coordinate points parsed for preview.`
      : "No CARTESIAN_POINT coordinates found in the readable STEP segment.";

  return {
    fileName,
    status: points.length > 0 ? "parsed" : "fallback",
    points,
    bounds,
    schema: schemaMatch ? schemaMatch[1] : "",
    productName: nameMatch ? nameMatch[1] : "",
    note
  };
}

function pointBounds(points) {
  return points.reduce(
    (bounds, point) => ({
      minX: Math.min(bounds.minX, point.x),
      maxX: Math.max(bounds.maxX, point.x),
      minY: Math.min(bounds.minY, point.y),
      maxY: Math.max(bounds.maxY, point.y),
      minZ: Math.min(bounds.minZ, point.z),
      maxZ: Math.max(bounds.maxZ, point.z)
    }),
    {
      minX: Infinity,
      maxX: -Infinity,
      minY: Infinity,
      maxY: -Infinity,
      minZ: Infinity,
      maxZ: -Infinity
    }
  );
}
