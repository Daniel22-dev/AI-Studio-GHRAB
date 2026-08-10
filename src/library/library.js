import { validateMaterialFile } from "../shared/material-validator.js";
import { createMaterialRepository } from "./material-service.js";

const G = window.GHRAB;
const repository = createMaterialRepository(G);
let catalog = { items: [] };
let serverCaps = { prepared: false, connected: false };
let commissions = [];
let selectedCommissionId = "";

const grid = document.querySelector("#library-grid");
const workspace = document.querySelector("#library-workspace");
const subject = document.querySelector("#subject-filter");
const type = document.querySelector("#type-filter");
const search = document.querySelector("#library-search");
const serverState = document.querySelector("#material-server-state");
const sharedSection = document.querySelector("#server-shared-section");
const sharedGrid = document.querySelector("#shared-materials-grid");
const commissionFilter = document.querySelector("#commission-filter");

const label = (value) =>
  typeof value === "string"
    ? value
    : value?.[G.state.language] || value?.cs || value?.en || "";

const option = (value, text) => {
  const element = document.createElement("option");
  element.value = value;
  element.textContent = text;
  return element;
};

function setEmptyState(host, text) {
  const empty = document.createElement("div");
  empty.className = "empty-state";
  empty.textContent = text;
  host.replaceChildren(empty);
}

function uniqueOptions(key, labelKey) {
  const map = new Map();
  catalog.items.forEach((item) => map.set(item[key], label(item[labelKey])));
  return [...map.entries()].sort((a, b) =>
    a[1].localeCompare(b[1], G.state.language),
  );
}

function renderFilters() {
  const subjectValue = subject.value || "all";
  const typeValue = type.value || "all";
  subject.replaceChildren(option("all", G.t("Všechny", "All")));
  type.replaceChildren(option("all", G.t("Všechny", "All")));
  uniqueOptions("subjectKey", "subject").forEach((item) =>
    subject.append(option(...item)),
  );
  uniqueOptions("typeKey", "type").forEach((item) =>
    type.append(option(...item)),
  );
  subject.value = [...subject.options].some(
    (item) => item.value === subjectValue,
  )
    ? subjectValue
    : "all";
  type.value = [...type.options].some((item) => item.value === typeValue)
    ? typeValue
    : "all";
}

async function loadMaterial(item) {
  const response = await fetch(`../${item.download}`, { cache: "no-store" });
  if (!response.ok) throw new Error(String(response.status));
  const material = await response.json();
  const result = G.validateMaterialPackage(material);
  if (!result.valid) {
    throw new Error(result.errors[0]?.code || "invalid-material");
  }
  return material;
}

function qualityClass(quality) {
  return quality?.includes("komis") || quality?.includes("Commission")
    ? "commission"
    : quality?.includes("výuce") || quality?.includes("Classroom")
      ? "tested"
      : quality?.includes("učite") || quality?.includes("Teacher")
        ? "reviewed"
        : "draft";
}

function card(item) {
  const article = document.createElement("article");
  article.className = "material-card";
  const quality = document.createElement("span");
  quality.className = `quality ${qualityClass(label(item.quality))}`;
  quality.textContent = label(item.quality);
  const heading = document.createElement("h2");
  heading.textContent = label(item.title);
  const description = document.createElement("p");
  description.textContent = label(item.description);
  const meta = document.createElement("div");
  meta.className = "app-meta";
  [label(item.subject), item.level, label(item.type)].forEach((value) => {
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.textContent = value;
    meta.append(chip);
  });
  const actions = document.createElement("div");
  actions.className = "app-actions";
  const download = document.createElement("a");
  download.className = "button ghost";
  download.href = `../${item.download}`;
  download.download = "";
  download.textContent = G.t("Stáhnout", "Download");
  const save = document.createElement("button");
  save.type = "button";
  save.className = "button secondary";
  save.textContent = G.t("Uložit místně", "Save locally");
  save.addEventListener("click", async () => {
    try {
      const material = await loadMaterial(item);
      G.saveWorkspaceMaterial(material);
      renderWorkspace();
      G.showToast(
        G.t("Materiál byl uložen místně.", "The resource was saved locally."),
      );
    } catch {
      G.showToast(
        G.t(
          "Materiál se nepodařilo načíst.",
          "The resource could not be loaded.",
        ),
      );
    }
  });
  actions.append(save, download);
  article.append(quality, heading, description, meta, actions);
  return article;
}

function render() {
  const query = search.value.trim().toLocaleLowerCase();
  const items = catalog.items.filter(
    (item) =>
      (subject.value === "all" || item.subjectKey === subject.value) &&
      (type.value === "all" || item.typeKey === type.value) &&
      (!query ||
        [
          item.title.cs,
          item.title.en,
          item.description.cs,
          item.description.en,
          item.topic.cs,
          item.topic.en,
        ]
          .join(" ")
          .toLocaleLowerCase()
          .includes(query)),
  );
  if (!items.length) {
    setEmptyState(
      grid,
      G.t("Žádný materiál neodpovídá filtrům.", "No resource matches the filters."),
    );
    return;
  }
  grid.replaceChildren(...items.map(card));
}

function localShareButton(material) {
  const share = document.createElement("button");
  share.type = "button";
  share.className = "button secondary server-share-button";
  const canShare = serverCaps.connected && Boolean(selectedCommissionId);
  share.disabled = !canShare;
  share.textContent = serverCaps.connected
    ? selectedCommissionId
      ? G.t("Sdílet s komisí", "Share with department")
      : G.t("Vyberte komisi", "Select a department")
    : G.t("Sdílet s komisí · po serveru", "Share with department · after server");
  share.title = serverCaps.connected
    ? G.t(
        "Materiál se uloží do katalogu vybrané komise jako nová serverová verze.",
        "The resource will be stored in the selected department catalogue as a new server version.",
      )
    : G.t(
        "Funkce je připravena, ale aktivuje se až po připojení školního serveru.",
        "The feature is prepared but activates only after the school server is connected.",
      );
  share.addEventListener("click", async () => {
    try {
      await repository.publishToCommission(material, selectedCommissionId);
      G.showToast(
        G.t(
          "Materiál byl sdílen s komisí.",
          "The resource was shared with the department.",
        ),
      );
      await renderSharedMaterials();
    } catch (error) {
      G.showToast(error.message || G.t("Sdílení selhalo.", "Sharing failed."));
    }
  });
  return share;
}

function renderWorkspace() {
  const list = G.getWorkspace();
  if (!list.length) {
    setEmptyState(
      workspace,
      G.t("Pracovní prostor je zatím prázdný.", "The workspace is empty."),
    );
    return;
  }
  workspace.replaceChildren(
    ...list.map((material) => {
      const article = document.createElement("article");
      article.className = "workspace-card";
      const quality = document.createElement("span");
      quality.className = "quality";
      quality.textContent = material.quality?.status || "ai-draft";
      const heading = document.createElement("h3");
      heading.textContent = material.title || G.t("Bez názvu", "Untitled");
      const description = document.createElement("p");
      description.textContent = [
        material.subject,
        material.level,
        material.yearGroup,
      ]
        .filter(Boolean)
        .join(" · ");
      const actions = document.createElement("div");
      actions.className = "app-actions";
      const exp = document.createElement("button");
      exp.type = "button";
      exp.className = "button ghost";
      exp.textContent = G.t("Export", "Export");
      exp.addEventListener("click", () => {
        void G.downloadArtifact(
          material,
          `${material.title || "material"}.ghrab.json`,
          {
            artifactType: "studio-material",
            contentKind: "teaching-material",
            sensitivity: material.provenance?.containsPersonalData
              ? "restricted"
              : "internal",
          },
        ).catch((error) => G.showToast(error.message));
      });
      actions.append(localShareButton(material), exp);
      article.append(quality, heading, description, actions);
      return article;
    }),
  );
}

function recordQualityLabel(record) {
  const status = record?.quality?.status || "shared";
  if (status === "commission-reviewed") {
    return G.t("Doporučeno komisí", "Department-recommended");
  }
  if (status === "classroom-tested") {
    const count = Math.max(0, Number(record?.quality?.classroomTests || 0));
    return G.t(
      `Ověřeno ve výuce${count ? ` · ${count}×` : ""}`,
      `Classroom-tested${count ? ` · ${count}×` : ""}`,
    );
  }
  if (status === "teacher-reviewed") {
    return G.t("Zkontrolováno učitelem", "Teacher-reviewed");
  }
  return G.t("Sdíleno s komisí", "Shared with department");
}

function sharedMaterialCard(record) {
  const article = document.createElement("article");
  article.className = "material-card shared-material-card";
  const quality = document.createElement("span");
  quality.className = `quality ${qualityClass(recordQualityLabel(record))}`;
  quality.textContent = recordQualityLabel(record);
  const heading = document.createElement("h2");
  heading.textContent = record.title || G.t("Bez názvu", "Untitled");
  const author = document.createElement("p");
  author.textContent = [
    record.owner?.displayName,
    record.subject,
    record.level,
    record.materialVersion ? `v${record.materialVersion}` : "",
  ]
    .filter(Boolean)
    .join(" · ");
  const actions = document.createElement("div");
  actions.className = "app-actions";
  if (record.permissions?.canFork !== false) {
    const fork = document.createElement("button");
    fork.type = "button";
    fork.className = "button primary";
    fork.textContent = G.t("Vytvořit vlastní kopii", "Create own copy");
    fork.addEventListener("click", async () => {
      try {
        const material = await repository.forkToWorkspace(record.id);
        G.saveWorkspaceMaterial(material);
        renderWorkspace();
        G.showToast(
          G.t(
            "Vlastní kopie byla uložena do pracovního prostoru.",
            "Your copy was saved to the workspace.",
          ),
        );
      } catch (error) {
        G.showToast(error.message || G.t("Kopii nelze vytvořit.", "The copy could not be created."));
      }
    });
    actions.append(fork);
  }
  if (record.permissions?.canMarkClassroomTested) {
    const tested = document.createElement("button");
    tested.type = "button";
    tested.className = "button secondary";
    tested.textContent = G.t("Ověřeno ve výuce", "Classroom-tested");
    tested.addEventListener("click", async () => {
      try {
        await repository.recordQuality(record.id, "classroom-tested");
        await renderSharedMaterials();
      } catch (error) {
        G.showToast(error.message || G.t("Stav nelze uložit.", "The status could not be saved."));
      }
    });
    actions.append(tested);
  }
  if (record.permissions?.canCommissionReview) {
    const commissionReview = document.createElement("button");
    commissionReview.type = "button";
    commissionReview.className = "button ghost";
    commissionReview.textContent = G.t(
      "Doporučit komisí",
      "Recommend by department",
    );
    commissionReview.addEventListener("click", async () => {
      try {
        await repository.recordQuality(record.id, "commission-reviewed");
        await renderSharedMaterials();
      } catch (error) {
        G.showToast(error.message || G.t("Stav nelze uložit.", "The status could not be saved."));
      }
    });
    actions.append(commissionReview);
  }
  article.append(quality, heading, author, actions);
  return article;
}

async function renderSharedMaterials() {
  if (!serverCaps.connected || !selectedCommissionId) return;
  setEmptyState(
    sharedGrid,
    G.t("Načítám materiály komise…", "Loading department resources…"),
  );
  try {
    const items = await repository.listSharedMaterials({
      commissionId: selectedCommissionId,
    });
    if (!items.length) {
      setEmptyState(
        sharedGrid,
        G.t(
          "Tato komise zatím nemá sdílené materiály.",
          "This department has no shared resources yet.",
        ),
      );
      return;
    }
    sharedGrid.replaceChildren(...items.map(sharedMaterialCard));
  } catch (error) {
    setEmptyState(
      sharedGrid,
      G.t(
        "Serverový katalog se nepodařilo načíst.",
        "The server catalogue could not be loaded.",
      ),
    );
    console.warn("Material catalogue load failed", error);
  }
}

function renderCommissionFilter() {
  commissionFilter.replaceChildren();
  if (!commissions.length) {
    commissionFilter.append(
      option("", G.t("Žádná dostupná komise", "No available department")),
    );
    selectedCommissionId = "";
    return;
  }
  commissionFilter.append(
    option("", G.t("Vyberte komisi", "Select a department")),
  );
  commissions.forEach((commission) => {
    commissionFilter.append(
      option(
        commission.id,
        label(commission.name) || commission.name || commission.id,
      ),
    );
  });
  commissionFilter.value = selectedCommissionId;
}

async function initialiseServerMaterials() {
  try {
    serverCaps = await repository.capabilities();
  } catch (error) {
    console.warn("Material server capability check failed", error);
    serverCaps = { prepared: false, connected: false };
  }
  serverState.dataset.mode = serverCaps.connected ? "server" : "local";
  serverState.textContent = serverCaps.connected
    ? G.t(
        "Školní server je připojen · sdílení komisí je aktivní",
        "School server connected · department sharing is active",
      )
    : serverCaps.prepared
      ? G.t(
          "Server není připojen · sdílení komisí je připraveno, ale neaktivní",
          "Server not connected · department sharing is prepared but inactive",
        )
      : G.t(
          "Serverové sdílení není v tomto profilu dostupné",
          "Server sharing is not available in this profile",
        );
  sharedSection.hidden = !serverCaps.connected;
  if (serverCaps.connected) {
    try {
      commissions = await repository.listCommissions();
    } catch (error) {
      console.warn("Commission catalogue load failed", error);
      commissions = [];
    }
    renderCommissionFilter();
  }
  renderWorkspace();
}

fetch("../library/catalog.json")
  .then((response) => response.json())
  .then((data) => {
    catalog = data;
    renderFilters();
    render();
  })
  .catch(() => {
    setEmptyState(
      grid,
      G.t("Katalog se nepodařilo načíst.", "The catalogue could not be loaded."),
    );
  });

[subject, type, search].forEach((element) =>
  element.addEventListener("input", render),
);

commissionFilter.addEventListener("change", async () => {
  selectedCommissionId = commissionFilter.value;
  renderWorkspace();
  await renderSharedMaterials();
});

document
  .querySelector("#library-import")
  .addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const fileCheck = validateMaterialFile(file);
    if (!fileCheck.valid) {
      const error = fileCheck.errors[0];
      G.showToast(G.t(error.cs, error.en));
      event.target.value = "";
      return;
    }
    try {
      const material = await G.parseArtifactJson(await file.text());
      const result = G.validateMaterialPackage(material);
      if (!result.valid) {
        const error = result.errors[0];
        throw new Error(
          G.t(`${error.cs} (${error.path})`, `${error.en} (${error.path})`),
        );
      }
      if (!G.saveWorkspaceMaterial(material)) {
        throw new Error(
          G.t(
            "Materiál se nepodařilo uložit do místního úložiště.",
            "The resource could not be saved to local storage.",
          ),
        );
      }
      renderWorkspace();
      G.showToast(
        G.t(
          "Vlastní balíček byl ověřen a přidán.",
          "Your package was validated and added.",
        ),
      );
    } catch (error) {
      G.showToast(
        error instanceof SyntaxError
          ? G.t(
              "Soubor neobsahuje platný JSON.",
              "The file does not contain valid JSON.",
            )
          : error.message ||
              G.t(
                "Soubor není platný GHRAB Material v1.",
                "The file is not a valid GHRAB Material v1 package.",
              ),
      );
    }
    event.target.value = "";
  });

document.addEventListener("ghrab:language", () => {
  renderFilters();
  render();
  renderWorkspace();
  renderCommissionFilter();
  void renderSharedMaterials();
  void initialiseServerMaterials();
});

document
  .querySelector('[data-nav="library"]')
  ?.setAttribute("aria-current", "page");

renderWorkspace();
void initialiseServerMaterials();
