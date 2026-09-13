await window.GHRAB.accessReady;
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
      }).then((r) => {
        if (!r.ok) throw new Error(`Changelog HTTP ${r.status}`);
        return r.json();
      });
      const archives = Array.isArray(data.archives) ? data.archives : [];
      const archiveData = await Promise.all(
        archives.map((name) =>
          fetch(`../config/${name}`, { cache: "no-store" }).then((r) => {
            if (!r.ok) throw new Error(`Changelog archive HTTP ${r.status}`);
            return r.json();
          }),
        ),
      );
      const items = [data, ...archiveData].flatMap((part) => part.items || []);
      list.replaceChildren(...items.map(row));
      list.setAttribute("aria-busy", "false");
    } catch {
      list.setAttribute("aria-busy", "false");
      list.textContent = T.t(
        "Changelog se nepodařilo načíst.",
        "Could not load the changelog.",
      );
    }
  }
  document.addEventListener("ghrab:language", render);
  render();
