const options = document.querySelector("#risk-options");
const result = document.querySelector("#risk-result");
function update() {
  const values = [...options.querySelectorAll("input:checked")].map(
    (i) => i.value,
  );
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
  } else if (values.some((v) => ["name", "studentwork"].includes(v))) {
    level = "orange";
    cs =
      "Nejprve materiál anonymizujte a odstraňte vše, co není pro úkol nezbytné.";
    en =
      "Anonymise the material first and remove everything that is not necessary for the task.";
  } else if (!values.length) {
    cs =
      "Před použitím vždy zkontrolujte, že materiál neobsahuje identifikovatelné osoby.";
    en =
      "Before use, always check that the material does not contain identifiable people.";
  }
  result.dataset.level = level;
  result.innerHTML = `<strong>${window.GHRAB.state.language === "cs" ? "Doporučení:" : "Recommendation:"}</strong> ${window.GHRAB.state.language === "cs" ? cs : en}`;
}
options.addEventListener("change", update);
document.addEventListener("ghrab:language", update);
update();
document
  .querySelector('[data-nav="safety"]')
  ?.setAttribute("aria-current", "page");
