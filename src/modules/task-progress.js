export function createTaskProgress({
  title = "Probíhá kontrola",
  description = "",
  total = 1,
} = {}) {
  document.querySelector(".operation-progress-overlay")?.remove();

  const safeTotal = Math.max(1, Number(total) || 1);
  const overlay = document.createElement("div");
  overlay.className = "operation-progress-overlay";

  const dialog = document.createElement("section");
  dialog.className = "operation-progress-dialog";
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");
  dialog.setAttribute("aria-labelledby", "operation-progress-title");

  const eyebrow = document.createElement("p");
  eyebrow.className = "eyebrow";
  eyebrow.textContent = "INTERNÍ KONTROLA";

  const heading = document.createElement("h2");
  heading.id = "operation-progress-title";
  heading.textContent = title;

  const intro = document.createElement("p");
  intro.className = "operation-progress-description";
  intro.textContent = description;

  const top = document.createElement("div");
  top.className = "operation-progress-top";
  const percent = document.createElement("strong");
  percent.className = "operation-progress-percent";
  percent.textContent = "0 %";
  const counter = document.createElement("span");
  counter.className = "operation-progress-counter";
  counter.textContent = `0 / ${safeTotal}`;
  top.append(percent, counter);

  const meter = document.createElement("div");
  meter.className = "operation-progress-meter";
  meter.setAttribute("role", "progressbar");
  meter.setAttribute("aria-valuemin", "0");
  meter.setAttribute("aria-valuemax", "100");
  meter.setAttribute("aria-valuenow", "0");
  const fill = document.createElement("span");
  meter.append(fill);

  const current = document.createElement("strong");
  current.className = "operation-progress-current";
  current.textContent = "Připravuji kontrolu…";

  const detail = document.createElement("p");
  detail.className = "operation-progress-detail";
  detail.textContent = "Výsledek se aktualizuje po skutečně dokončených krocích.";

  const close = document.createElement("button");
  close.className = "button primary operation-progress-close";
  close.type = "button";
  close.hidden = true;
  close.textContent = "Zavřít";

  dialog.append(eyebrow, heading, intro, top, meter, current, detail, close);
  overlay.append(dialog);
  document.body.append(overlay);

  let finished = false;
  const remove = () => {
    if (!finished) return;
    overlay.remove();
  };
  close.addEventListener("click", remove);
  overlay.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && finished) remove();
  });

  function update(completed, label = "", message = "") {
    const done = Math.min(safeTotal, Math.max(0, Number(completed) || 0));
    const value = Math.round((done / safeTotal) * 100);
    percent.textContent = `${value} %`;
    counter.textContent = `${done} / ${safeTotal}`;
    fill.style.width = `${value}%`;
    meter.setAttribute("aria-valuenow", String(value));
    if (label) current.textContent = label;
    if (message) detail.textContent = message;
  }

  function finish({ failed = 0, message = "" } = {}) {
    finished = true;
    update(
      safeTotal,
      failed ? `Dokončeno · ${failed} problémů` : "Dokončeno bez zjištěné chyby",
      message || (failed
        ? "Kontrola skončila. Podrobnosti jsou ve výsledcích na stránce."
        : "Všechny plánované kroky byly dokončeny."),
    );
    overlay.dataset.state = failed ? "warning" : "success";
    close.hidden = false;
    close.focus({ preventScroll: true });
  }

  function fail(error) {
    finished = true;
    overlay.dataset.state = "error";
    current.textContent = "Kontrola byla přerušena";
    detail.textContent = String(error?.message || error || "Neznámá chyba.");
    close.hidden = false;
    close.focus({ preventScroll: true });
  }

  return { update, finish, fail, close: remove };
}
