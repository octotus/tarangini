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

export async function installOpenFoam() {
  const approved = window.confirm(
    "Download the official OpenFOAM-13 and ThirdParty-13 source repositories into .tarangini/openfoam/? This can take time and uses network access."
  );

  if (!approved) {
    state.openfoamInstall = {
      status: "denied",
      detail: "OpenFOAM source install was cancelled by the user.",
      installRoot: null,
      activationScript: null,
      repositories: []
    };
    render();
    return;
  }

  state.openfoamInstall = {
    status: "installing",
    detail: "Downloading or updating official OpenFOAM source repositories.",
    installRoot: null,
    activationScript: null,
    repositories: []
  };
  render();

  try {
    const response = await fetch("/api/openfoam/install", {
      method: "POST",
      headers: {
        "X-Tarangini-Install": "openfoam-source"
      }
    });
    state.openfoamInstall = await response.json();
  } catch (error) {
    state.openfoamInstall = {
      status: "failed",
      detail: `OpenFOAM source install failed: ${error.message}`,
      installRoot: null,
      activationScript: null,
      repositories: []
    };
  }

  await refreshOpenFoam();
  render();
}
