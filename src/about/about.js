await window.GHRAB.accessReady;

const details = document.querySelector("#changelog");
const list = document.querySelector("#changelog-list");
const T = window.GHRAB;
let changelogData = null;
let loading = null;

function loc(value) {
  return T.localised(value);
}

function row(item) {
  const article = document.createElement("article");
  article.className = "change-card panel";

  const head = document.createElement("div");
  head.className = "change-head";

  const version = document.createElement("span");
  version.className = "chip version-chip";
  version.textContent = `v${item.version}`;

  const date = document.createElement("time");
  date.dateTime = item.date;
  date.textContent = new Date(item.date).toLocaleDateString(
    T.state.language === "cs" ? "cs-CZ" : "en-GB",
  );

  head.append(version, date);

  const heading = document.createElement("h2");
  heading.textContent = loc(item.title);

  const changes = document.createElement("ul");
  changes.className = "change-list";
  for (const change of item.changes || []) {
    const entry = document.createElement("li");
    entry.textContent = loc(change);
    changes.append(entry);
  }

  article.append(head, heading, changes);
  return article;
}

async function loadChangelog() {
  if (changelogData) return changelogData;
  if (loading) return loading;

  loading = (async () => {
    const data = await fetch("../config/changelog.json", { cache: "no-store" }).then((response) => {
      if (!response.ok) throw new Error(`Changelog HTTP ${response.status}`);
      return response.json();
    });
    const archives = Array.isArray(data.archives) ? data.archives : [];
    const archiveData = await Promise.all(
      archives.map((name) =>
        fetch(`../config/${name}`, { cache: "no-store" }).then((response) => {
          if (!response.ok) throw new Error(`Changelog archive HTTP ${response.status}`);
          return response.json();
        }),
      ),
    );
    changelogData = [data, ...archiveData].flatMap((part) => part.items || []);
    return changelogData;
  })();

  try {
    return await loading;
  } finally {
    loading = null;
  }
}

async function render() {
  if (!list || !details?.open) return;
  list.setAttribute("aria-busy", "true");
  try {
    const items = await loadChangelog();
    list.replaceChildren(...items.map(row));
  } catch {
    list.textContent = T.t(
      "Katalog změn se nepodařilo načíst.",
      "Could not load the change catalogue.",
    );
  } finally {
    list.setAttribute("aria-busy", "false");
  }
}

if (details) {
  details.addEventListener("toggle", () => {
    if (details.open) render();
  });
}

document.addEventListener("ghrab:language", () => {
  if (details?.open && changelogData) render();
});

if (location.hash === "#changelog" && details) {
  details.open = true;
  requestAnimationFrame(() => details.scrollIntoView({ block: "start" }));
} else if (details?.open) {
  render();
}
