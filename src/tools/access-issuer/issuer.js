await window.GHRAB.accessReady;

if (window.GHRAB.isAdmin() && !window.GHRAB.isColleaguePreview?.()) {
  const G = window.GHRAB;
  const encoder = new TextEncoder();
  let privateKeyInfo = null;
  let issuedFile = null;
  let policy = null;
  let publicKeyInfo = null;
  let privateKeyTimer = null;
  let replacementRecord = null;
  const PRIVATE_KEY_TTL_MS = 10 * 60 * 1000;

  const $ = (selector) => document.querySelector(selector);
  const b64u = (value) => {
    const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary)
      .replaceAll("+", "-")
      .replaceAll("/", "_")
      .replace(/=+$/u, "");
  };
  const slug = (value) =>
    String(value || "uzivatel")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase() || "uzivatel";

  function feedback(message, ok = false) {
    $("#issuer-feedback").textContent = message;
    $("#issuer-feedback").className =
      `form-feedback ${ok ? "success" : "error"}`;
  }

  function activePublicKeyId() {
    return publicKeyInfo?.activeKeyId || publicKeyInfo?.keyId || null;
  }

  function clearPrivateKey(message = "Soukromý klíč byl vymazán z paměti.") {
    privateKeyInfo = null;
    if (privateKeyTimer) clearTimeout(privateKeyTimer);
    privateKeyTimer = null;
    $("#private-key-file").value = "";
    $("#clear-private-key").disabled = true;
    $("#key-status").textContent = message;
    $("#key-status").className = "form-feedback";
  }

  function schedulePrivateKeyClear() {
    if (privateKeyTimer) clearTimeout(privateKeyTimer);
    privateKeyTimer = setTimeout(
      () =>
        clearPrivateKey(
          "Soukromý klíč byl po 10 minutách nečinnosti automaticky vymazán.",
        ),
      PRIVATE_KEY_TTL_MS,
    );
  }

  async function loadPolicy() {
    const [policyResponse, keyResponse] = await Promise.all([
      fetch("../../config/access-policy.json", { cache: "no-store" }),
      fetch("../../config/access-public-key.json", { cache: "no-store" }),
    ]);
    if (!policyResponse.ok || !keyResponse.ok) throw new Error("configuration");
    policy = await policyResponse.json();
    publicKeyInfo = await keyResponse.json();
    const host = $("#issuer-app-list");
    host.replaceChildren(
      ...Object.entries(policy.applications).map(([id, item]) => {
        const label = document.createElement("label");
        label.className = "access-option";
        const input = document.createElement("input");
        input.type = "checkbox";
        input.value = id;
        input.dataset.app = "";
        const span = document.createElement("span");
        const strong = document.createElement("strong");
        strong.textContent = item.label.cs;
        const small = document.createElement("small");
        small.textContent = `${item.trainingCode} · ${item.trainingVersion}`;
        span.append(strong, small);
        label.append(input, span);
        return label;
      }),
    );
  }

  $("#private-key-file").addEventListener("change", async () => {
    const file = $("#private-key-file").files?.[0];
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      if (
        parsed.schema !== "ghrab-access-private-key-v1" ||
        !parsed.privateKey?.d ||
        parsed.privateKey.kid !== activePublicKeyId()
      )
        throw new Error("bad");
      privateKeyInfo = parsed;
      $("#key-status").textContent = `Načten klíč ${parsed.privateKey.kid}.`;
      $("#key-status").className = "form-feedback success";
      $("#clear-private-key").disabled = false;
      schedulePrivateKeyClear();
    } catch {
      clearPrivateKey("Soubor neobsahuje platný soukromý klíč.");
      $("#key-status").textContent = "Soubor neobsahuje platný soukromý klíč.";
      $("#key-status").className = "form-feedback error";
    }
  });

  function defaultExpiry() {
    const date = new Date();
    date.setMonth(date.getMonth() + 12);
    $("#permit-expiry").value = date.toISOString().slice(0, 10);
  }

  function applyPrefill() {
    const params = new URLSearchParams(location.search);
    const subject = params.get("subject");
    if (!subject) return;
    const record = G.getIssuedAccessRecords().find(
      (item) => item.subject === subject || item.jti === subject,
    );
    if (!record) return;
    replacementRecord = record;
    $("#permit-name").value = record.displayName || "";
    $("#permit-subject").value = record.subject || "";
    $("#permit-role").value = ["admin", "operator"].includes(record.role) ? record.role : "teacher";
    const grantsAllApps = record.apps.includes("*");
    $("#permit-all").checked = grantsAllApps;
    document.querySelectorAll("[data-app]").forEach((input) => {
      input.checked = grantsAllApps || record.apps.includes(input.value);
    });
    feedback(
      `Načteny údaje uživatele ${record.displayName}. Po vydání se nový přístup automaticky zapíše do evidence.`,
      true,
    );
  }

  async function issue() {
    feedback("");
    if (!privateKeyInfo) {
      feedback("Nejprve načtěte soukromý klíč.");
      return;
    }
    const name = $("#permit-name").value.trim();
    const subject = $("#permit-subject").value.trim() || slug(name);
    const role = $("#permit-role").value;
    const expiry = $("#permit-expiry").value;
    if (!name || !subject || !expiry) {
      feedback("Doplňte jméno, identifikátor a datum platnosti.");
      return;
    }
    const selected = [...document.querySelectorAll("[data-app]:checked")].map(
      (input) => input.value,
    );
    const apps = $("#permit-all").checked ? ["*"] : selected;
    if (!apps.length) {
      feedback("Vyberte alespoň jednu aplikaci.");
      return;
    }
    const now = Math.floor(Date.now() / 1000);
    const exp = Math.floor(new Date(`${expiry}T23:59:59`).getTime() / 1000);
    if (exp <= now) {
      feedback("Datum platnosti musí být v budoucnosti.");
      return;
    }
    const maximum = Number(policy.maximumPermitDays || 400) * 86400;
    if (exp - now > maximum) {
      feedback(
        `Platnost nesmí překročit ${policy.maximumPermitDays || 400} dní.`,
      );
      return;
    }
    const training = {};
    const trainingIds = apps.includes("*")
      ? Object.keys(policy.applications)
      : selected;
    for (const id of trainingIds) {
      const item = policy.applications[id];
      training[id] = {
        code: item.trainingCode,
        version: item.trainingVersion,
        completedAt: new Date().toISOString().slice(0, 10),
      };
    }
    const payload = {
      schema: "ghrab-access-permit-v1",
      iss: policy.issuer,
      aud: policy.audience,
      sub: subject,
      displayName: name,
      role,
      apps,
      training,
      iat: now,
      nbf: now - 60,
      exp,
      jti: crypto.randomUUID(),
      kid: privateKeyInfo.privateKey.kid,
    };
    try {
      const key = await crypto.subtle.importKey(
        "jwk",
        privateKeyInfo.privateKey,
        { name: "ECDSA", namedCurve: "P-256" },
        false,
        ["sign"],
      );
      const encoded = b64u(encoder.encode(JSON.stringify(payload)));
      const signature = await crypto.subtle.sign(
        { name: "ECDSA", hash: "SHA-256" },
        key,
        encoder.encode(encoded),
      );
      const token = `ghrab1.${encoded}.${b64u(signature)}`;
      issuedFile = {
        schema: "ghrab-access-file-v1",
        createdAt: new Date().toISOString(),
        label: name,
        permitId: payload.jti,
        token,
      };
      const saved = G.recordIssuedAccess(payload, {
        source: "issued",
        createdAt: issuedFile.createdAt,
      });
      if (saved.ok && replacementRecord?.jti && replacementRecord.jti !== payload.jti) {
        G.updateIssuedAccessRecord(replacementRecord.jti, { supersededBy: payload.jti });
      }
      $("#permit-output").value = token;
      $("#download-permit").disabled = false;
      $("#copy-permit").disabled = false;
      $("#open-registry").hidden = false;
      schedulePrivateKeyClear();
      feedback(
        saved.ok
          ? replacementRecord?.jti
            ? `Nový přístup byl vytvořen a uložen do evidence. Původní přístup je označen jako nahrazený; až kolegyně potvrdí, že nový soubor funguje, připravte původní JTI ke zneplatnění. Nové JTI: ${payload.jti}`
            : `Přístup byl vytvořen a automaticky uložen do evidence. JTI: ${payload.jti}`
          : `Přístup byl vytvořen, ale evidenci se nepodařilo uložit. JTI si zaznamenejte: ${payload.jti}`,
        saved.ok,
      );
    } catch (error) {
      console.error(error);
      feedback(
        "Přístup se nepodařilo podepsat. Zkontrolujte soukromý klíč a podporu Web Crypto.",
      );
    }
  }

  $("#issue-permit").addEventListener("click", issue);

  $("#clear-private-key").addEventListener("click", () => clearPrivateKey());
  window.addEventListener("pagehide", () => {
    privateKeyInfo = null;
    if (privateKeyTimer) clearTimeout(privateKeyTimer);
  });
  $("#download-permit").addEventListener("click", () => {
    if (!issuedFile) return;
    const blob = new Blob([`${JSON.stringify(issuedFile, null, 2)}\n`], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `AI-STUDIO-PRISTUP-${slug(issuedFile.label)}.ghrab-access.json`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  $("#copy-permit").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText($("#permit-output").value);
      feedback("Přístupový kód byl zkopírován.", true);
    } catch {
      feedback("Kód se nepodařilo zkopírovat. Označte jej ručně.");
    }
  });
  function setExpiryDays(days) {
    const date = new Date();
    date.setDate(date.getDate() + Number(days || 0));
    $("#permit-expiry").value = date.toISOString().slice(0, 10);
  }
  function selectAllCurrentApps() {
    document.querySelectorAll("[data-app]").forEach((input) => {
      input.checked = true;
    });
  }

  function syncRoleUi() {
    const role = $("#permit-role").value;
    const temporary = $("#temporary-admin-tools");
    const operatorNote = $("#operator-role-note");
    temporary.hidden = role !== "admin";
    operatorNote.hidden = role !== "operator";
    if (role === "admin") {
      $("#permit-all").checked = true;
      selectAllCurrentApps();
    }
    if (role === "admin") {
      const expiry = new Date(`${$("#permit-expiry").value || "2999-12-31"}T23:59:59`);
      const maxPreferred = Date.now() + 31 * 86400 * 1000;
      if (!Number.isFinite(expiry.getTime()) || expiry.getTime() > maxPreferred) setExpiryDays(14);
    }
  }
  $("#permit-role").addEventListener("change", syncRoleUi);
  $("#permit-all").addEventListener("change", (event) => {
    if (event.currentTarget.checked) selectAllCurrentApps();
  });
  document.querySelectorAll("[data-admin-days]").forEach((button) =>
    button.addEventListener("click", () => setExpiryDays(button.dataset.adminDays)),
  );
  $("#permit-name").addEventListener("blur", () => {
    if (!$("#permit-subject").value.trim())
      $("#permit-subject").value = slug($("#permit-name").value);
  });

  await loadPolicy();
  defaultExpiry();
  applyPrefill();
  syncRoleUi();
}
