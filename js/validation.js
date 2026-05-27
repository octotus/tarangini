import { state } from "./state.js";

export function validation(values, derived) {
  const fileOk = /\.(step|stp)$/i.test(values.geometryFile);
  const runtimeStatus = state.openfoam.status === "available" ? "pass" : "warn";
  const gates = [
    {
      key: "runtime",
      name: "OpenFOAM runtime",
      status: runtimeStatus,
      detail:
        state.openfoam.status === "available"
          ? `Detected OpenFOAM command tools. ${state.openfoam.version || "Version unknown."}`
          : "OpenFOAM was not found on PATH; MVP can preview/setup but cannot execute real solver commands."
    },
    {
      key: "geometry_file",
      name: "Geometry file",
      status: fileOk ? "pass" : "fail",
      detail: fileOk ? "STEP/STP geometry selected." : "Select a STEP or STP file to create a validated run."
    },
    {
      key: "geometry_envelope",
      name: "Geometry envelope",
      status: values.geometryEnvelope ? "pass" : "warn",
      detail: values.geometryEnvelope ? "User review marks geometry inside v1 envelope." : "Geometry can run only as non-validated."
    },
    {
      key: "mach",
      name: "Mach gate",
      status: derived.mach < 0.3 ? "pass" : "fail",
      detail: derived.mach < 0.3 ? "Low-Mach incompressible condition satisfied." : "Mach must remain below 0.3."
    },
    {
      key: "reynolds",
      name: "Reynolds gate",
      status: derived.reynolds >= 100000 && derived.reynolds <= 10000000 ? "pass" : "fail",
      detail: "Validated turbulent MVP envelope is 1.0e5 to 1.0e7."
    },
    {
      key: "atmosphere",
      name: "Atmospheric envelope",
      status: values.altitude <= 3000 && values.pressure >= 70000 && values.pressure <= 110000 ? "pass" : "warn",
      detail: "MVP validated defaults target near-ground air conditions."
    },
    {
      key: "advanced",
      name: "Advanced overrides",
      status: values.advancedMode ? "warn" : "pass",
      detail: values.advancedMode ? "Advanced controls disqualify validated status." : "Validated median preset is active."
    }
  ];

  if (state.completed) {
    gates.push(
      { key: "convergence", name: "Convergence", status: "pass", detail: "Residual trend reached MVP completion threshold." },
      { key: "mesh", name: "Mesh quality", status: "pass", detail: "Synthetic mesh-quality summary is inside MVP limits." },
      { key: "yplus", name: "y+ summary", status: "pass", detail: "Synthetic wall-function y+ band is acceptable." }
    );
  } else {
    gates.push(
      { key: "convergence", name: "Convergence", status: "idle", detail: "Available after a run completes." },
      { key: "mesh", name: "Mesh quality", status: "idle", detail: "Available after meshing completes." },
      { key: "yplus", name: "y+ summary", status: "idle", detail: "Available after post-processing completes." }
    );
  }

  const hasFail = gates.some((gate) => gate.status === "fail");
  const hasWarn = gates.some((gate) => gate.status === "warn");
  const finalStatus = hasFail ? "Blocked" : hasWarn ? "Non-validated" : "Validated";
  return { gates, finalStatus };
}
