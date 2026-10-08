import { downloadManualPdf } from "./pdf-export.js";

const button = document.querySelector("#studio-guide-pdf");
button?.addEventListener("click", async () => {
  if (!window.GHRAB) return;
  button.disabled = true;
  const previous = button.textContent;
  button.textContent = "Připravuji PDF…";
  try {
    await window.GHRAB.accessReady;
    const role = document.body.dataset.page;
    const doc = document;
    const title = role === "manual-admin" ? "AI Studio – manuál administrátora" : "AI Studio – manuál učitele";
    await downloadManualPdf(doc, { title, filename: role === "manual-admin" ? "GHRAB-Studio-administrator.pdf" : "GHRAB-Studio-ucitel.pdf" });
  } catch (error) {
    button.textContent = "PDF nelze vytvořit";
    button.title = String(error?.message || error);
  } finally {
    button.disabled = false;
    if (button.textContent !== "PDF nelze vytvořit") button.textContent = previous;
  }
});
