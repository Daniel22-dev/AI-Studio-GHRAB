const G = window.GHRAB;

async function guardAdministratorGuide() {
  if (!G) return;
  await G.accessReady;
  const main = document.querySelector("#main");
  if (!main) return;
  if (G.isAdmin()) {
    main.hidden = false;
    return;
  }
  main.replaceChildren();

  const section = document.createElement("section");
  section.className = "hero";
  const eyebrow = document.createElement("p");
  eyebrow.className = "eyebrow";
  eyebrow.textContent = "SPRÁVCOVSKÝ MANUÁL";
  const title = document.createElement("h1");
  title.textContent = "Tato verze manuálu je určena administrátorovi AI Studia.";
  const text = document.createElement("p");
  text.textContent = "Pro běžnou práci otevřete manuál učitele. Správcovský manuál navíc popisuje přístupy, pilotní reporting, prezentaci a release workflow.";
  const link = document.createElement("a");
  link.className = "button primary";
  link.href = "./ai-studio-teacher.html";
  link.textContent = "Otevřít manuál učitele →";
  section.append(eyebrow, title, text, link);
  main.append(section);
  main.hidden = false;
}

guardAdministratorGuide();
