await window.GHRAB.accessReady;

if (window.GHRAB.isAdmin()) {
  const G = window.GHRAB;
  const body = document.querySelector("#registry-body");
  const empty = document.querySelector("#registry-empty");
  const stats = document.querySelector("#registry-stats");
  const search = document.querySelector("#registry-search");
  const statusFilter = document.querySelector("#registry-status");
  const feedback = document.querySelector("#registry-feedback");
  const detail = document.querySelector("#registry-detail");
  const detailContent = document.querySelector("#registry-detail-content");
  const note = document.querySelector("#registry-note");
  const renew = document.querySelector("#renew-access");
  const toggleRevocation = document.querySelector("#toggle-revocation");
  const importFiles = document.querySelector("#import-files");
  const dropZone = document.querySelector("#registry-drop-zone");
  let records = [];
  let deployedRevocations = { revokedJti: [], revokedBefore: null };
  let currentJti = null;

  const policy = G.getAccessSnapshot().policy;
  const locale = () => (G.state.language === "en" ? "en-GB" : "cs-CZ");
  const dateText = (value) =>
    value ? new Date(value).toLocaleDateString(locale()) : "—";
  const dateTimeText = (value) =>
    value ? new Date(value).toLocaleString(locale()) : "—";
  const csv = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;

  function setFeedback(message, ok = true) {
    feedback.textContent = message;
    feedback.className = `form-feedback ${ok ? "success" : "error"}`;
  }

  function download(name, content, type = "application/json") {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = name;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function statusOf(record) {
    if (deployedRevocations.revokedJti?.includes(record.jti)) return "revoked";
    if (
      deployedRevocations.revokedBefore &&
      record.iat &&
      record.iat <=
        Math.floor(Date.parse(deployedRevocations.revokedBefore) / 1000)
    )
      return "revoked";
    if (record.exp && record.exp * 1000 <= Date.now()) return "expired";
    if (record.pendingRevocation) return "pending";
    if (record.supersededBy) return "superseded";
    if (!record.exp && !record.expiresAt) return "unknown";
    return "active";
  }

  function statusLabel(status) {
    return (
      {
        active: "Aktivní",
        pending: "Připraveno ke zneplatnění",
        superseded: "Nahrazeno novějším",
        expired: "Platnost skončila",
        revoked: "Centrálně zneplatněno",
        unknown: "Chybí údaj o platnosti",
      }[status] || status
    );
  }

  function appLabels(record) {
    if (record.apps.includes("*"))
      return ["Všechny současné i budoucí aplikace"];
    return record.apps.map((id) => policy?.applications?.[id]?.label?.cs || id);
  }

  function filteredRecords() {
    const query = search.value.trim().toLocaleLowerCase("cs");
    const wanted = statusFilter.value;
    return records.filter((record) => {
      const status = statusOf(record);
      if (wanted !== "all" && status !== wanted) return false;
      if (!query) return true;
      const haystack = [
        record.displayName,
        record.subject,
        record.jti,
        record.role,
        ...appLabels(record),
      ]
        .join(" ")
        .toLocaleLowerCase("cs");
      return haystack.includes(query);
    });
  }

  function statCard(value, label) {
    const card = document.createElement("article");
    card.className = "registry-stat";
    const strong = document.createElement("strong");
    strong.textContent = String(value);
    const span = document.createElement("span");
    span.textContent = label;
    card.append(strong, span);
    return card;
  }

  function renderStats() {
    const statuses = records.map(statusOf);
    stats.replaceChildren(
      statCard(records.length, "vydaných přístupů"),
      statCard(
        statuses.filter((item) => item === "active").length,
        "aktuálně aktivních",
      ),
      statCard(
        statuses.filter((item) => item === "pending").length,
        "čeká na zneplatnění",
      ),
      statCard(
        new Set(records.map((item) => item.subject).filter(Boolean)).size,
        "evidovaných uživatelů",
      ),
    );
  }

  function rowFor(record) {
    const tr = document.createElement("tr");
    const status = statusOf(record);
    const user = document.createElement("td");
    user.className = "registry-user";
    const name = document.createElement("strong");
    name.textContent = record.displayName;
    const subject = document.createElement("small");
    subject.textContent = record.subject || "bez interního ID";
    user.append(name, subject);

    const apps = document.createElement("td");
    apps.className = "registry-apps";
    const labels = appLabels(record);
    apps.textContent = labels.slice(0, 2).join(", ");
    if (labels.length > 2) {
      const more = document.createElement("small");
      more.textContent = `+ ${labels.length - 2} další`;
      apps.append(document.createElement("br"), more);
    }

    const validity = document.createElement("td");
    validity.textContent = dateText(record.expiresAt);
    if (record.supersededBy) {
      const small = document.createElement("small");
      small.className = "registry-source-note";
      small.textContent = `Vydáno ${dateText(record.issuedAt)}`;
      validity.append(document.createElement("br"), small);
    }

    const state = document.createElement("td");
    const badge = document.createElement("span");
    badge.className = `registry-badge ${status}`;
    badge.textContent = statusLabel(status);
    state.append(badge);

    const jti = document.createElement("td");
    jti.className = "registry-jti";
    jti.textContent = record.jti;

    const actions = document.createElement("td");
    const wrap = document.createElement("div");
    wrap.className = "registry-row-actions";
    const detailButton = document.createElement("button");
    detailButton.type = "button";
    detailButton.className = "button secondary";
    detailButton.dataset.action = "detail";
    detailButton.dataset.jti = record.jti;
    detailButton.textContent = "Detail";
    const copyButton = document.createElement("button");
    copyButton.type = "button";
    copyButton.className = "button ghost";
    copyButton.dataset.action = "copy";
    copyButton.dataset.jti = record.jti;
    copyButton.textContent = "Kopírovat JTI";
    wrap.append(detailButton, copyButton);
    actions.append(wrap);

    tr.append(user, apps, validity, state, jti, actions);
    return tr;
  }

  function render() {
    records = G.getIssuedAccessRecords();
    const visible = filteredRecords();
    body.replaceChildren(...visible.map(rowFor));
    empty.hidden = records.length > 0;
    document.querySelector(".table-scroll").hidden = records.length === 0;
    renderStats();
  }

  function openDetail(jti) {
    const record = records.find((item) => item.jti === jti);
    if (!record) return;
    currentJti = jti;
    const status = statusOf(record);
    const heading = document.createElement("div");
    const eyebrow = document.createElement("p");
    eyebrow.className = "eyebrow";
    eyebrow.textContent = "DETAIL PŘÍSTUPU";
    const title = document.createElement("h2");
    title.textContent = record.displayName;
    const source = document.createElement("p");
    source.className = "registry-source-note";
    source.textContent =
      record.source === "issued"
        ? "Vytvořeno přímo v tomto Studiu."
        : "Do evidence importováno.";
    heading.append(eyebrow, title, source);
    const grid = document.createElement("div");
    grid.className = "registry-detail-grid";
    const values = [
      ["Interní ID", record.subject || "—"],
      ["Role", record.role === "admin" ? "Správce" : "Proškolený učitel"],
      ["Vydáno", dateTimeText(record.issuedAt)],
      ["Platnost do", dateTimeText(record.expiresAt)],
      ["Stav", statusLabel(status)],
      ["JTI", record.jti],
      ["Aplikace", appLabels(record).join(", ")],
      ["Nahrazeno JTI", record.supersededBy || "—"],
    ];
    for (const [label, value] of values) {
      const item = document.createElement("div");
      item.className = "registry-detail-item";
      const span = document.createElement("span");
      span.textContent = label;
      const strong = document.createElement("strong");
      strong.textContent = value;
      item.append(span, strong);
      grid.append(item);
    }
    detailContent.replaceChildren(heading, grid);
    note.value = record.note || "";
    renew.href = `../access-issuer/?subject=${encodeURIComponent(record.subject || record.jti)}`;
    toggleRevocation.textContent = record.pendingRevocation
      ? "Zrušit přípravu zneplatnění"
      : "Připravit zneplatnění";
    detail.showModal();
  }

  body.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    if (button.dataset.action === "detail") openDetail(button.dataset.jti);
    if (button.dataset.action === "copy") {
      try {
        await navigator.clipboard.writeText(button.dataset.jti);
        G.showToast("JTI bylo zkopírováno.");
      } catch {
        setFeedback("JTI se nepodařilo zkopírovat.", false);
      }
    }
  });

  document.querySelector("#save-note").addEventListener("click", () => {
    if (!currentJti) return;
    G.updateIssuedAccessRecord(currentJti, { note: note.value.trim() });
    setFeedback("Poznámka byla uložena.");
    render();
  });

  toggleRevocation.addEventListener("click", () => {
    const record = records.find((item) => item.jti === currentJti);
    if (!record) return;
    G.updateIssuedAccessRecord(currentJti, {
      pendingRevocation: !record.pendingRevocation,
    });
    detail.close();
    render();
    setFeedback(
      record.pendingRevocation
        ? "Příprava zneplatnění byla zrušena."
        : "JTI bylo přidáno do připravovaného seznamu zneplatnění.",
    );
  });

  document.querySelector("#delete-record").addEventListener("click", () => {
    const record = records.find((item) => item.jti === currentJti);
    if (
      !record ||
      !confirm(
        `Odstranit ${record.displayName} z místní evidence? Samotný přístup tím nebude zneplatněn.`,
      )
    )
      return;
    G.removeIssuedAccessRecord(currentJti);
    detail.close();
    render();
    setFeedback("Záznam byl odstraněn pouze z místní evidence.");
  });

  function decodeBase64Url(value) {
    const source = String(value || "")
      .replace(/-/g, "+")
      .replace(/_/g, "/");
    const padded = source.padEnd(Math.ceil(source.length / 4) * 4, "=");
    const bytes = Uint8Array.from(atob(padded), (character) =>
      character.charCodeAt(0),
    );
    return new TextDecoder().decode(bytes);
  }

  function decodePermitPayload(token) {
    const parts = String(token || "")
      .trim()
      .split(".");
    if (parts.length !== 3 || parts[0] !== "ghrab1")
      throw new Error("Přístupový kód má neplatný formát.");
    try {
      const payload = JSON.parse(decodeBase64Url(parts[1]));
      if (
        !payload ||
        payload.schema !== "ghrab-access-permit-v1" ||
        !payload.jti
      )
        throw new Error();
      return payload;
    } catch {
      throw new Error(
        "Přístupový kód je poškozený nebo v něm chybí povinné údaje.",
      );
    }
  }

  function registryRecordFromPermit(permit, wrapper = {}) {
    const iat = Number.isFinite(Number(permit?.iat))
      ? Number(permit.iat)
      : null;
    const nbf = Number.isFinite(Number(permit?.nbf))
      ? Number(permit.nbf)
      : null;
    const exp = Number.isFinite(Number(permit?.exp))
      ? Number(permit.exp)
      : null;
    return {
      schema: "ghrab-issued-access-record-v1",
      jti: String(permit?.jti || wrapper?.permitId || "").trim(),
      subject: String(permit?.sub || "").trim(),
      displayName: String(
        permit?.displayName ||
          wrapper?.label ||
          permit?.sub ||
          "Neoznačený uživatel",
      ).trim(),
      role: String(permit?.role || "teacher").trim(),
      apps: Array.isArray(permit?.apps) ? permit.apps.map(String) : [],
      training:
        permit?.training && typeof permit.training === "object"
          ? permit.training
          : {},
      iat,
      nbf,
      exp,
      issuedAt:
        wrapper?.createdAt ||
        (iat != null
          ? new Date(iat * 1000).toISOString()
          : new Date().toISOString()),
      expiresAt: exp != null ? new Date(exp * 1000).toISOString() : null,
      source: "imported",
      importedAt: new Date().toISOString(),
    };
  }

  function assertCompleteImportedRecord(record) {
    if (!record)
      throw new Error("Záznam se po importu nepodařilo v evidenci dohledat.");
    const missing = [];
    if (!record.subject) missing.push("interní ID");
    if (!record.expiresAt || !record.exp) missing.push("platnost");
    if (!Array.isArray(record.apps) || !record.apps.length)
      missing.push("aplikace");
    if (missing.length)
      throw new Error(`Import proběhl neúplně. Chybí: ${missing.join(", ")}.`);
    return record;
  }

  async function readFileText(file) {
    if (!file) throw new Error("Nebyl vybrán soubor.");
    if (file.size > 512 * 1024) throw new Error("Soubor je příliš velký.");
    if (typeof file.text === "function") return file.text();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.addEventListener("load", () =>
        resolve(String(reader.result || "")),
      );
      reader.addEventListener("error", () =>
        reject(new Error("Soubor se nepodařilo přečíst.")),
      );
      reader.readAsText(file);
    });
  }

  async function importPayload(parsed, label = "soubor") {
    // Přístupový soubor obsahuje vedle tokenu také permitId. Token musí mít
    // absolutní přednost; jedině v něm jsou interní ID, aplikace a platnost.
    const token = typeof parsed === "string" ? parsed : parsed?.token;
    if (token) {
      const decoded = decodePermitPayload(token);
      if (parsed?.permitId && String(parsed.permitId) !== String(decoded.jti)) {
        throw new Error(
          "JTI v obalu souboru neodpovídá JTI v podepsaném přístupu.",
        );
      }
      const inspected = await G.inspectPermitToken(token);
      if (!inspected.ok || !inspected.permit)
        throw new Error(
          G.formatReason(inspected.reason || "invalid-file", "cs"),
        );

      // Sestavení kompletního evidenčního záznamu děláme výslovně zde. Tím
      // se starý neúplný záznam se stejným JTI spolehlivě přepíše.
      const completeRecord = registryRecordFromPermit(inspected.permit, parsed);
      const result = G.importIssuedAccessRecords([completeRecord]);
      if (!result.ok)
        throw new Error(
          result.reason === "storage-error"
            ? "Prohlížeč nepovolil uložení evidence."
            : "Přístup se nepodařilo uložit.",
        );
      const stored = assertCompleteImportedRecord(
        G.getIssuedAccessRecords().find(
          (item) => item.jti === completeRecord.jti,
        ),
      );
      return { imported: 1, kind: "permit", record: stored };
    }

    const recordsPayload = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.records)
        ? parsed.records
        : parsed?.jti || parsed?.permitId
          ? [parsed]
          : null;

    if (recordsPayload) {
      const result = G.importIssuedAccessRecords(recordsPayload);
      if (!result.ok)
        throw new Error(
          result.reason === "storage-error"
            ? "Prohlížeč nepovolil uložení evidence."
            : "Záloha neobsahuje platné záznamy.",
        );
      return { imported: result.imported, kind: "registry", record: null };
    }

    throw new Error("Studio v souboru nenašlo přístup ani zálohu evidence.");
  }

  async function importSelectedFiles(fileList) {
    const files = [...(fileList || [])];
    if (!files.length) return;
    setFeedback(
      `Načítám ${files.length === 1 ? files[0].name : `${files.length} souborů`}…`,
    );
    let imported = 0;
    const failures = [];
    const summaries = [];
    for (const file of files) {
      try {
        const parsed = JSON.parse(await readFileText(file));
        const result = await importPayload(parsed, file.name);
        imported += result.imported;
        if (result.record) {
          summaries.push(
            `${result.record.displayName} · ID ${result.record.subject} · platnost do ${dateText(result.record.expiresAt)} · ${result.record.apps.length} aplikací`,
          );
        }
      } catch (error) {
        failures.push(`${file.name}: ${error.message}`);
      }
    }
    importFiles.value = "";
    render();
    if (imported > 0) {
      const detailText = summaries.length
        ? ` Načteno: ${summaries.join(" | ")}.`
        : "";
      setFeedback(
        `Hotovo. Do evidence bylo načteno ${imported} ${imported === 1 ? "záznam" : imported < 5 ? "záznamy" : "záznamů"}.${detailText}${failures.length ? ` Nezdařilo se: ${failures.join(" | ")}` : ""}`,
      );
      document
        .querySelector(".registry-list-panel")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      setFeedback(
        `Import se nezdařil. ${failures.join(" | ") || "Soubor nebyl rozpoznán."}`,
        false,
      );
    }
  }

  importFiles.addEventListener("change", (event) =>
    importSelectedFiles(event.target.files),
  );
  dropZone.addEventListener("click", () => importFiles.click());
  dropZone.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      importFiles.click();
    }
  });
  for (const name of ["dragenter", "dragover"]) {
    dropZone.addEventListener(name, (event) => {
      event.preventDefault();
      dropZone.classList.add("is-dragging");
    });
  }
  for (const name of ["dragleave", "drop"]) {
    dropZone.addEventListener(name, (event) => {
      event.preventDefault();
      dropZone.classList.remove("is-dragging");
    });
  }
  dropZone.addEventListener("drop", (event) =>
    importSelectedFiles(event.dataTransfer?.files),
  );

  async function importFromPrivateLink() {
    const marker = "#registryImport=";
    if (!location.hash.startsWith(marker)) return;
    const encoded = location.hash.slice(marker.length);
    history.replaceState(null, "", `${location.pathname}${location.search}`);
    try {
      const parsed = JSON.parse(decodeBase64Url(encoded));
      const result = await importPayload(parsed, "soukromý odkaz");
      render();
      setFeedback(
        `Soukromý import proběhl úspěšně. Načteno ${result.imported} záznamů.`,
      );
    } catch (error) {
      setFeedback(`Soukromý import se nezdařil: ${error.message}`, false);
    }
  }

  document.querySelector("#export-backup").addEventListener("click", () => {
    const payload = G.issuedAccessBackup();
    download(
      `AI-STUDIO-EVIDENCE-PRISTUPU-${new Date().toISOString().slice(0, 10)}.json`,
      `${JSON.stringify(payload, null, 2)}\n`,
    );
    setFeedback("Záloha evidence byla stažena.");
  });

  document.querySelector("#export-csv").addEventListener("click", () => {
    const header = [
      "Jméno",
      "Interní ID",
      "Role",
      "Aplikace",
      "Vydáno",
      "Platnost do",
      "Stav",
      "JTI",
      "Poznámka",
    ];
    const lines = records.map((record) =>
      [
        record.displayName,
        record.subject,
        record.role,
        appLabels(record).join("; "),
        record.issuedAt,
        record.expiresAt,
        statusLabel(statusOf(record)),
        record.jti,
        record.note,
      ]
        .map(csv)
        .join(","),
    );
    download(
      `AI-STUDIO-PREHLED-PRISTUPU-${new Date().toISOString().slice(0, 10)}.csv`,
      `\ufeff${header.map(csv).join(",")}\n${lines.join("\n")}\n`,
      "text/csv;charset=utf-8",
    );
    setFeedback("Přehled CSV byl stažen.");
  });

  document
    .querySelector("#export-revocations")
    .addEventListener("click", () => {
      const pending = records
        .filter((record) => record.pendingRevocation)
        .map((record) => record.jti);
      const revokedJti = [
        ...new Set([...(deployedRevocations.revokedJti || []), ...pending]),
      ].sort();
      const payload = {
        schema: "ghrab-access-revocation-list-v1",
        updatedAt: new Date().toISOString(),
        revokedBefore: deployedRevocations.revokedBefore || null,
        revokedJti,
      };
      download("revoked-access.json", `${JSON.stringify(payload, null, 2)}\n`);
      setFeedback(
        pending.length
          ? `Stažen hotový seznam s ${pending.length} nově připravenými JTI. Nahraďte jím src/config/revoked-access.json.`
          : "Stažen aktuální seznam. Žádné nové JTI zatím není označeno ke zneplatnění.",
      );
    });

  search.addEventListener("input", render);
  statusFilter.addEventListener("change", render);
  document.addEventListener("ghrab:issued-access-changed", render);

  try {
    const response = await fetch("../../config/revoked-access.json", {
      cache: "no-store",
    });
    if (response.ok) deployedRevocations = await response.json();
  } catch {
    /* evidence remains usable offline */
  }
  render();
  await importFromPrivateLink();
}
