const options = document.querySelector("#risk-options");
const result = document.querySelector("#risk-result");
const reset = document.querySelector("#risk-reset");
const traffic = document.querySelector("#risk-traffic-light");
const trafficLabel = document.querySelector("#risk-traffic-label");
const trafficNote = document.querySelector("#risk-traffic-note");

function language() {
  return window.GHRAB?.state?.language === "en" ? "en" : "cs";
}

function setTraffic(level) {
  if (!traffic || !trafficLabel || !trafficNote) return;
  const copy = {
    idle: {
      cs: ["Čeká na volbu", "Zaškrtněte typ dat vlevo."],
      en: ["Waiting for a choice", "Select a data type on the left."],
    },
    green: {
      cs: ["ZELENÁ · lze použít", "Pouze pokud je obsah skutečně veřejný, smyšlený nebo bezpečně anonymizovaný."],
      en: ["GREEN · can be used", "Only if the content is genuinely public, fictional or safely anonymised."],
    },
    orange: {
      cs: ["ORANŽOVÁ · nejprve anonymizovat", "Odstraňte identifikátory a vše, co pro úkol není nutné."],
      en: ["ORANGE · anonymise first", "Remove identifiers and anything not needed for the task."],
    },
    red: {
      cs: ["ČERVENÁ · do externí AI nevkládat", "Použijte jiný pracovní postup nebo konzultaci s odpovědnou osobou."],
      en: ["RED · do not enter into external AI", "Use another workflow or consult the responsible person."],
    },
  };
  const selected = copy[level] || copy.idle;
  traffic.dataset.level = level;
  trafficLabel.textContent = selected[language()][0];
  trafficNote.textContent = selected[language()][1];
  traffic.setAttribute("aria-label", `${trafficLabel.textContent}. ${trafficNote.textContent}`);
}

function update() {
  const values = [...options.querySelectorAll("input:checked")].map(
    (input) => input.value,
  );
  if (!values.length) {
    result.hidden = true;
    result.replaceChildren();
    setTraffic("idle");
    return;
  }
  let level = "green";
  let cs =
    "Materiál lze použít, pokud je skutečně veřejný, smyšlený nebo bezpečně anonymizovaný.";
  let en =
    "The material can be used if it is genuinely public, fictional or safely anonymised.";
  if (values.includes("sensitive") || values.includes("secret")) {
    level = "red";
    cs =
      "Tento obsah do externí AI nevkládejte. Zvolte jiný pracovní postup nebo konzultaci s odpovědnou osobou.";
    en =
      "Do not enter this content into an external AI service. Use another workflow or consult the responsible person.";
  } else if (values.some((value) => ["name", "studentwork"].includes(value))) {
    level = "orange";
    cs =
      "Nejprve materiál anonymizujte a odstraňte vše, co není pro úkol nezbytné.";
    en =
      "Anonymise the material first and remove everything that is not necessary for the task.";
  }
  result.dataset.level = level;
  result.hidden = false;
  const strong = document.createElement("strong");
  strong.textContent = language() === "cs" ? "Doporučení: " : "Recommendation: ";
  result.replaceChildren(
    strong,
    document.createTextNode(language() === "cs" ? cs : en),
  );
  setTraffic(level);
}

options.addEventListener("change", update);
reset.addEventListener("click", () => {
  options.querySelectorAll("input:checked").forEach((input) => {
    input.checked = false;
  });
  update();
});
document.addEventListener("ghrab:language", update);
update();
document
  .querySelector('[data-nav="safety"]')
  ?.setAttribute("aria-current", "page");
