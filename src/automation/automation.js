await window.GHRAB.accessReady;

if (
  window.GHRAB.canAccessAdminPage?.("automation") &&
  !window.GHRAB.isTeacherPreview?.()
) {
  const { t } = window.GHRAB;
  document
    .querySelector("#preview-monthly-reminder")
    ?.addEventListener("click", () =>
      window.GHRAB.setupMonthlyReportReminder({ force: true }),
    );

  const liveModeButton = document.querySelector("#telemetry-live");
  const testModeButton = document.querySelector("#telemetry-test");
  const telemetryStatus = document.querySelector("#telemetry-mode-status");
  const clearTestButton = document.querySelector("#telemetry-test-clear");

  function renderTelemetryMode() {
    const mode = window.GHRAB.getTelemetryMode();
    liveModeButton?.setAttribute("aria-pressed", String(mode === "live"));
    testModeButton?.setAttribute("aria-pressed", String(mode === "test"));
    if (!telemetryStatus) return;
    telemetryStatus.textContent =
      mode === "test"
        ? t(
            "Testovací data jsou oddělená a nejsou v měsíčním reportu.",
            "Test data are separated and excluded from the monthly report.",
          )
        : t(
            "Vaše běžné používání vstupuje do místních dat reportu.",
            "Your normal use is included in local report data.",
          );
  }

  liveModeButton?.addEventListener("click", () => {
    window.GHRAB.setTelemetryMode("live");
    renderTelemetryMode();
  });
  testModeButton?.addEventListener("click", () => {
    window.GHRAB.setTelemetryMode("test");
    renderTelemetryMode();
  });
  clearTestButton?.addEventListener("click", () => {
    if (
      confirm(
        t(
          "Vymazat všechna oddělená testovací spuštění, časy a výstupy?",
          "Clear all separated test launches, time and outputs?",
        ),
      )
    ) {
      window.GHRAB.clearTestTelemetry();
      window.GHRAB.showToast(
        t("Testovací data byla vymazána.", "Test data were cleared."),
      );
    }
  });

  renderTelemetryMode();
  document.addEventListener("ghrab:telemetry-mode", renderTelemetryMode);
}
