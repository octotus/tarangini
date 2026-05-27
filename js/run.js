import { derive } from "./physics.js";
import { collectInputs } from "./model.js";
import { render } from "./render.js";
import { state, stageDefs } from "./state.js";
import { validation } from "./validation.js";

export function startRun() {
  const values = collectInputs();
  const derived = derive(values);
  const validationState = validation(values, derived);

  if (validationState.finalStatus === "Blocked") {
    state.log.unshift(`[${new Date().toLocaleTimeString()}] Run blocked by validation gates.`);
    render();
    return;
  }

  clearInterval(state.runTimer);
  state.runState = "running";
  state.completed = false;
  state.activeStage = 0;
  state.log = [`[${new Date().toLocaleTimeString()}] Run started with ${validationState.finalStatus} status.`];
  state.log.unshift(`[${new Date().toLocaleTimeString()}] OpenFOAM ${state.openfoam.status}: ${state.openfoam.detail}`);

  state.runTimer = setInterval(() => {
    const stage = stageDefs[state.activeStage];
    if (stage) {
      state.log.unshift(`[${new Date().toLocaleTimeString()}] ${stage[1]} completed.`);
    }
    state.activeStage += 1;

    if (state.activeStage >= stageDefs.length) {
      clearInterval(state.runTimer);
      state.runTimer = null;
      state.activeStage = stageDefs.length;
      state.runState = "completed";
      state.completed = true;
      state.log.unshift(`[${new Date().toLocaleTimeString()}] Results synchronized to project workspace.`);
    }
    render();
  }, 900);

  render();
}

export function resetRun() {
  clearInterval(state.runTimer);
  state.runTimer = null;
  state.runState = "draft";
  state.activeStage = -1;
  state.completed = false;
  state.log = [];
  render();
}
