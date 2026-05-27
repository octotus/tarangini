import { numberValue } from "./dom.js";
import { inputs, state } from "./state.js";
import { render } from "./render.js";

export function syncViewerFromOrientation() {
  state.viewerAngle = (numberValue("yaw") * Math.PI) / 180;
  state.viewerTilt = (numberValue("pitch") * Math.PI) / 180;
}

export function resetOrientation() {
  inputs.yaw.value = "0";
  inputs.pitch.value = "0";
  inputs.roll.value = "0";
  syncViewerFromOrientation();
  render();
}

export function useViewerOrientation() {
  inputs.yaw.value = Math.round((state.viewerAngle * 180) / Math.PI);
  inputs.pitch.value = Math.round((state.viewerTilt * 180) / Math.PI);
  render();
}
