const link = document.querySelector("[data-support-email-link]");
if (link) {
  try {
    const response = await fetch("../config/support.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const config = await response.json();
    const email = String(config?.administratorEmail || "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      throw new Error("invalid support email");
    const subject = "Anonymní souhrn AI Studio GHRAB";
    const body =
      "Dobrý den,\n\nv příloze posílám anonymní měsíční souhrn z AI Studia.\n\nDěkuji.";
    link.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  } catch {
    link.setAttribute("aria-disabled", "true");
    link.removeAttribute("href");
  }
}
