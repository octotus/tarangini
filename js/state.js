export const state = {
  section: "project",
  runState: "draft",
  runTimer: null,
  activeStage: -1,
  completed: false,
  viewerAngle: -0.45,
  viewerTilt: 0.2,
  viewerDragging: false,
  viewerLastX: 0,
  viewerLastY: 0,
  geometryPreview: {
    fileName: "",
    status: "empty",
    points: [],
    bounds: null,
    schema: "",
    productName: "",
    note: "No geometry selected."
  },
  openfoam: {
    status: "checking",
    detail: "Checking OpenFOAM runtime.",
    version: "unknown",
    commands: []
  },
  openfoamInstall: {
    status: "idle",
    detail: "OpenFOAM source install has not been requested.",
    installRoot: null,
    activationScript: null,
    repositories: []
  },
  telemetry: [],
  replay: {
    playing: false,
    timer: null,
    frame: 0,
    frameCount: 72
  },
  log: []
};

export const stageDefs = [
  ["geometry_check", "Geometry checks"],
  ["case_generation", "Case generation"],
  ["meshing", "Meshing"],
  ["solving", "Solving"],
  ["post_processing", "Post-processing"],
  ["artifact_sync", "Artifact sync"]
];

export const inputs = {};
