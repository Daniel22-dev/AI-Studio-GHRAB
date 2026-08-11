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
      cs: ["ORANŽOVÁ · nejprve anonymizovat", "Odstraňte identifikátory i nepotřebné kontextové detaily a použijte jen minimum nutných údajů."],
      en: ["ORANGE · anonymise first", "Remove identifiers and unnecessary contextual details and use only the minimum data required."],
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

function highestRisk(inputs) {
  const weight = { green: 1, orange: 2, red: 3 };
  return inputs.reduce((highest, input) =>
    (weight[input.dataset.risk] || 0) > (weight[highest] || 0) ? input.dataset.risk : highest, "green");
}

function update() {
  const selected = [...options.querySelectorAll("input:checked")];
  if (!selected.length) {
    result.hidden = true;
    result.replaceChildren();
    setTraffic("idle");
    return;
  }
  const level = highestRisk(selected);
  const copy = {
    green: {
      cs: "Materiál lze použít, pokud je skutečně veřejný, smyšlený nebo bezpečně anonymizovaný.",
      en: "The material can be used if it is genuinely public, fictional or safely anonymised.",
    },
    orange: {
      cs: "Nejprve materiál anonymizujte. Odstraňte přímé i nepřímé identifikátory a vše, co není pro úkol nezbytné.",
      en: "Anonymise the material first. Remove direct and indirect identifiers and everything that is not necessary for the task.",
    },
    red: {
      cs: "Tento obsah do běžné externí AI nevkládejte. Zvolte jiný pracovní postup nebo konzultaci s odpovědnou osobou.",
      en: "Do not enter this content into a normal external AI service. Use another workflow or consult the responsible person.",
    },
  };
  result.dataset.level = level;
  result.hidden = false;
  const strong = document.createElement("strong");
  strong.textContent = language() === "cs" ? "Doporučení: " : "Recommendation: ";
  result.replaceChildren(strong, document.createTextNode(copy[level][language()]));
  setTraffic(level);
}

options.addEventListener("change", (event) => {
  const changed = event.target?.closest?.('input[type="checkbox"]');
  if (changed?.checked) {
    const safe = options.querySelector('input[data-exclusive="true"]');
    if (changed === safe) {
      options.querySelectorAll('input[type="checkbox"]:checked').forEach((input) => {
        if (input !== safe) input.checked = false;
      });
    } else if (safe) {
      safe.checked = false;
    }
  }
  update();
});
reset.addEventListener("click", () => {
  options.querySelectorAll("input:checked").forEach((input) => { input.checked = false; });
  update();
});
document.addEventListener("ghrab:language", update);
update();
document.querySelector('[data-nav="safety"]')?.setAttribute("aria-current", "page");
