const STORAGE_KEY = "ghrab.manual.temporary-admin-adela.v1";
const checkboxes = [...document.querySelectorAll("[data-guide-step]")];
const progress = document.querySelector("#temporary-admin-progress");
const label = document.querySelector("#temporary-admin-progress-label");
const reset = document.querySelector("#temporary-admin-reset");

function readState() {
  try {
    const parsed = JSON.parse(
      window.GHRAB?.safeGetItem?.(STORAGE_KEY, "{}") || "{}",
    );
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeState() {
  try {
    const state = Object.fromEntries(
      checkboxes.map((input) => [input.dataset.guideStep, input.checked]),
    );
    window.GHRAB?.safeSetJson?.(STORAGE_KEY, state, { silent: true });
  } catch {}
}

function render() {
  const done = checkboxes.filter((input) => input.checked).length;
  if (progress) {
    progress.max = checkboxes.length;
    progress.value = done;
    progress.textContent = `${Math.round((done / Math.max(1, checkboxes.length)) * 100)} %`;
  }
  if (label) label.textContent = `${done} / ${checkboxes.length}`;
  document.documentElement.dataset.guideComplete =
    done === checkboxes.length ? "true" : "false";
}

const saved = readState();
for (const input of checkboxes) {
  input.checked = saved[input.dataset.guideStep] === true;
  input.addEventListener("change", () => {
    writeState();
    render();
  });
}

reset?.addEventListener("click", () => {
  for (const input of checkboxes) input.checked = false;
  try {
    window.GHRAB?.safeRemoveItem?.(STORAGE_KEY, { silent: true });
  } catch {}
  render();
});

render();
