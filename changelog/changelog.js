await window.GHRAB.accessReady;
if (window.GHRAB.isAdmin()) {
  const list = document.querySelector("#changelog-list");
  const T = window.GHRAB;
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
    const h = document.createElement("h2");
    h.textContent = loc(item.title);
    const ul = document.createElement("ul");
    ul.className = "change-list";
    for (const change of item.changes || []) {
      const li = document.createElement("li");
      li.textContent = loc(change);
      ul.append(li);
    }
    article.append(head, h, ul);
    return article;
  }
  async function render() {
    if (!list) return;
    try {
      const data = await fetch("../config/changelog.json", {
        cache: "no-store",
      }).then((r) => r.json());
      list.replaceChildren(...(data.items || []).map(row));
    } catch {
      list.textContent = T.t(
        "Changelog se nepodařilo načíst.",
        "Could not load the changelog.",
      );
    }
  }
  document.addEventListener("ghrab:language", render);
  render();
}
