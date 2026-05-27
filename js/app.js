import { bindApp } from "./bindings.js";
import { render } from "./render.js";
import { refreshOpenFoam } from "./runtime.js";

export function initApp() {
  bindApp();
  refreshOpenFoam();
  render();
}
