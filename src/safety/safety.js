const options = document.querySelector("#risk-options");
const result = document.querySelector("#risk-result");
const reset = document.querySelector("#risk-reset");

function update() {
  const values = [...options.querySelectorAll("input:checked")].map(
    (input) => input.value,
  );
  if (!values.length) {
    result.hidden = true;
    result.replaceChildren();
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
  strong.textContent =
    window.GHRAB.state.language === "cs" ? "Doporučení: " : "Recommendation: ";
  result.replaceChildren(
    strong,
    document.createTextNode(window.GHRAB.state.language === "cs" ? cs : en),
  );
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
