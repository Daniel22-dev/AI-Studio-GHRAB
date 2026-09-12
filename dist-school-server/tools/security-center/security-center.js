import {
  createSecurityUpdatePack,
  verifySignedBundle,
} from "./security-center-core.js?v=0.21.59";

await window.GHRAB.accessReady;

if (window.GHRAB.isAdmin() && !window.GHRAB.isColleaguePreview?.()) {
  const G = window.GHRAB;
  const PRIVATE_KEY_TTL_MS = 10 * 60 * 1000;
  const MAX_KEY_FILE_BYTES = 64 * 1024;
  const $ = (selector) => document.querySelector(selector);
  let currentBundle = null;
  let currentSignature = null;
  let verifyKey = null;
  let privateKeyDocument = null;
  let privateKeyTimer = null;
  let publicUpdatePack = null;
  let publicUpdateName = "";

  function feedback(message, ok = false) {
    const node = $("#security-feedback");
    node.textContent = message;
    node.className = `form-feedback ${ok ? "success" : "error"}`;
  }

  function setKeyFeedback(message, ok = false) {
    const node = $("#key-feedback");
    node.textContent = message;
    node.className = `form-feedback ${ok ? "success" : "error"}`;
  }

  function privateJwk(document) {
    if (document?.schema === "ghrab-access-config-private-key-v1") {
      return document.privateKey;
    }
    return document?.privateKey?.d ? document.privateKey : document;
  }

  function updateCreateButton() {
    $("#create-update-pack").disabled = !(
      currentBundle &&
      currentSignature &&
      verifyKey &&
      privateKeyDocument
    );
  }

  function clearPrivateKey(message = "Soukromý klíč byl vymazán z paměti.") {
    privateKeyDocument = null;
    if (privateKeyTimer) clearTimeout(privateKeyTimer);
    privateKeyTimer = null;
    $("#config-private-key").value = "";
    $("#clear-config-key").disabled = true;
    setKeyFeedback(message, true);
    updateCreateButton();
  }

  function schedulePrivateKeyClear() {
    if (privateKeyTimer) clearTimeout(privateKeyTimer);
    privateKeyTimer = setTimeout(
      () =>
        clearPrivateKey(
          "Soukromý klíč byl po 10 minutách automaticky vymazán z paměti.",
        ),
      PRIVATE_KEY_TTL_MS,
    );
  }

  function pendingRecords() {
    const deployed = new Set(currentBundle?.revocations?.revokedJti || []);
    return G.getIssuedAccessRecords().filter(
      (record) => record.pendingRevocation && record.jti && !deployed.has(record.jti),
    );
  }

  function renderPending() {
    const host = $("#pending-revocations");
    const records = pendingRecords();
    if (!records.length) {
      const empty = document.createElement("div");
      empty.className = "pending-empty";
      empty.textContent =
        "Není připraveno žádné nové JTI. Můžete pouze obnovit platnost podepsané konfigurace, nebo nejprve označit starý přístup v evidenci.";
      host.replaceChildren(empty);
      return;
    }
    host.replaceChildren(
      ...records.map((record) => {
        const row = document.createElement("div");
        row.className = "pending-revocation";
        const user = document.createElement("div");
        const name = document.createElement("strong");
        name.textContent = record.displayName || "Neznámý uživatel";
        const subject = document.createElement("small");
        subject.textContent = record.subject || "bez interního ID";
        user.append(name, subject);
        const code = document.createElement("code");
        code.textContent = record.jti;
        const state = document.createElement("span");
        state.className = "pending-state";
        state.textContent = "PŘIPRAVENO";
        row.append(user, code, state);
        return row;
      }),
    );
  }

  function summaryCard(label, value, detail) {
    const card = document.createElement("article");
    card.className = "security-summary-card";
    const span = document.createElement("span");
    span.textContent = label;
    const strong = document.createElement("strong");
    strong.textContent = value;
    const small = document.createElement("small");
    small.textContent = detail;
    card.append(span, strong, small);
    return card;
  }

  function renderSummary() {
    const issued = Date.parse(currentBundle.issuedAt || currentBundle.generatedAt);
    const expiry = new Date(
      issued + Number(currentBundle.maxSignedBundleAgeDays || 30) * 86400000,
    );
    const remainingDays = Math.ceil((expiry.getTime() - Date.now()) / 86400000);
    $("#security-summary").replaceChildren(
      summaryCard("Podpis konfigurace", "Platný", currentSignature.algorithm),
      summaryCard(
        "Platnost konfigurace",
        remainingDays >= 0 ? `${remainingDays} dní` : "Prošlá",
        expiry.toLocaleString("cs-CZ"),
      ),
      summaryCard(
        "Čeká na zneplatnění",
        String(pendingRecords().length),
        "JTI v tomto prohlížeči",
      ),
      summaryCard(
        "Konfigurační klíč",
        verifyKey.keyId,
        currentBundle.version,
      ),
    );
  }

  function saveJson(filename, value) {
    const blob = new Blob([`${JSON.stringify(value, null, 2)}\n`], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function downloadPublicPack() {
    if (publicUpdatePack && publicUpdateName) {
      saveJson(publicUpdateName, publicUpdatePack);
    }
  }

  async function loadCurrentConfiguration() {
    const [bundleResponse, signatureResponse, keyResponse] = await Promise.all([
      fetch("../../config/access-config-bundle.json", { cache: "no-store" }),
      fetch("../../config/access-config-bundle.sig.json", { cache: "no-store" }),
      fetch("../../config/access-config-verify-key.json", { cache: "no-store" }),
    ]);
    if (!bundleResponse.ok || !signatureResponse.ok || !keyResponse.ok) {
      throw new Error("Bezpečnostní konfiguraci se nepodařilo načíst.");
    }
    const [bundle, signature, key] = await Promise.all([
      bundleResponse.json(),
      signatureResponse.json(),
      keyResponse.json(),
    ]);
    const valid = await verifySignedBundle({ bundle, signature, verifyKey: key });
    if (!valid) throw new Error("Současná bezpečnostní konfigurace nemá platný podpis.");
    currentBundle = bundle;
    currentSignature = signature;
    verifyKey = key;
    renderPending();
    renderSummary();
    updateCreateButton();
  }

  $("#config-private-key").addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      if (file.size > MAX_KEY_FILE_BYTES) throw new Error("Soubor je příliš velký.");
      const parsed = JSON.parse(await file.text());
      const key = privateJwk(parsed);
      if (
        !key?.d ||
        key?.kty !== "EC" ||
        key?.crv !== "P-256" ||
        key?.kid !== verifyKey?.keyId ||
        key?.x !== verifyKey?.publicKey?.x ||
        key?.y !== verifyKey?.publicKey?.y
      ) {
        throw new Error(
          "Tento soubor není odpovídající soukromý konfigurační klíč.",
        );
      }
      privateKeyDocument = parsed;
      $("#clear-config-key").disabled = false;
      setKeyFeedback(
        `Klíč ${key.kid} je načten pouze v paměti tohoto okna.`,
        true,
      );
      schedulePrivateKeyClear();
      updateCreateButton();
    } catch (error) {
      clearPrivateKey("Klíč nebyl načten.");
      setKeyFeedback(error?.message || "Soubor není platný konfigurační klíč.");
    }
  });

  $("#clear-config-key").addEventListener("click", () => clearPrivateKey());
  $("#download-update-pack").addEventListener("click", downloadPublicPack);
  $("#create-update-pack").addEventListener("click", async () => {
    const button = $("#create-update-pack");
    button.disabled = true;
    feedback("Ověřuji konfiguraci a vytvářím místní podpis…", true);
    try {
      const now = new Date();
      publicUpdatePack = await createSecurityUpdatePack({
        currentBundle,
        currentSignature,
        verifyKey,
        privateKeyDocument,
        pendingJti: pendingRecords().map((record) => record.jti),
        sourceAppVersion: document.documentElement.dataset.ghrabAppVersion,
        now,
      });
      const stamp = now.toISOString().replace(/\D/g, "").slice(0, 14) + "Z";
      publicUpdateName = `VEREJNA-AKTUALIZACE-ZABEZPECENI-AI-STUDIO-${stamp}.json`;
      downloadPublicPack();
      $("#download-update-pack").hidden = false;
      clearPrivateKey(
        "Soukromý klíč byl po vytvoření podpisu ihned vymazán z paměti.",
      );
      const added = publicUpdatePack.changeSummary.addedRevocationCount;
      feedback(
        added
          ? `Hotovo. Veřejný balíček obsahuje ${added} nové zneplatnění. Nahrajte pouze tento veřejný JSON spolu s aktuálním zdrojákem.`
          : "Hotovo. Veřejný balíček obnovuje platnost podepsané konfigurace; nepřidává žádné nové zneplatnění.",
        true,
      );
    } catch (error) {
      feedback(error?.message || "Veřejný balíček se nepodařilo vytvořit.");
      updateCreateButton();
    }
  });

  document.addEventListener("ghrab:issued-access-changed", () => {
    if (!currentBundle) return;
    renderPending();
    renderSummary();
  });
  window.addEventListener("pagehide", () => clearPrivateKey(), { once: true });

  try {
    await loadCurrentConfiguration();
  } catch (error) {
    feedback(error?.message || "Centrum zabezpečení se nepodařilo připravit.");
    $("#create-update-pack").disabled = true;
  }
}
