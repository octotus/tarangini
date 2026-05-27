import { render } from "./render.js";
import { state } from "./state.js";

export async function refreshOpenFoam() {
  state.openfoam = {
    status: "checking",
    detail: "Checking OpenFOAM runtime.",
    version: "unknown",
    commands: []
  };
  render();

  try {
    const response = await fetch("/api/openfoam", { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    state.openfoam = await response.json();
  } catch (error) {
    state.openfoam = {
      status: "missing",
      detail: `OpenFOAM runtime check failed: ${error.message}`,
      version: "unknown",
      commands: []
    };
  }

  render();
}
