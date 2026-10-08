/*
 * AI Studio GHRAB · Protected-manual PDF export v1
 * No CDN, no network, no stored PDF endpoint and no privileged data transfer.
 * The browser paints complete manual text onto A4 canvases, then assembles a
 * valid PDF with clickable source links. Because pages are rasterised,
 * searchable/selectable text and assistive PDF tags are not provided.
 */
function manualBlocks(doc, extras) {
  const root = doc.querySelector("main") || doc.body;
  const selector = "h1,h2,h3,h4,p,li,dt,dd,summary,.acc .ans,.mini-step,.stat,.notice";
  const out = [];
  for (const el of root.querySelectorAll(selector)) {
    if (el.closest("nav,footer,script,style,.search-overlay,.mobile-nav,.top-actions,.toc")) continue;
    if (el.matches("p,li,dt,dd") && el.closest(".acc .ans")) continue;
    if (el.matches("p,li") && el.closest(".notice")) continue;
    if (el.matches("summary") && !el.closest("details")) continue;
    const value = (el.textContent || "").replace(/\s+/g, " ").trim();
    if (!value || value.length < 2) continue;
    const tag = el.tagName.toLowerCase();
    const type = /^h[1-4]$/.test(tag) ? tag : tag === "li" ? "list" : tag === "summary" ? "h3" : "body";
    out.push({ type, text: value });
  }
  for (const item of extras || []) {
    if (item && typeof item.text === "string") out.push({ type: item.type || "body", text: item.text });
  }
  const urls = [];
  const seen = new Set();
  for (const a of root.querySelectorAll("a[href]")) {
    try {
      const url = new URL(a.getAttribute("href"), doc.baseURI);
      if (!["https:", "http:"].includes(url.protocol) || seen.has(url.href)) continue;
      seen.add(url.href);
      urls.push({ type: "link", text: (a.textContent || url.href).trim() || url.href, url: url.href });
    } catch { /* ignore malformed links */ }
  }
  if (urls.length) {
    out.push({ type: "h2", text: "Užitečné odkazy" });
    out.push(...urls.slice(0, 100));
  }
  return out;
}
function pdfEscape(s) {
  return String(s).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)").replace(/[\r\n]/g, " ");
}
function pdfBytes(chunks) {
  let length = 0;
  for (const c of chunks) length += c.length;
  const out = new Uint8Array(length);
  let offset = 0;
  for (const c of chunks) { out.set(c, offset); offset += c.length; }
  return out;
}
function createPdf(pages) {
  const encoder = new TextEncoder();
  const str = (s) => encoder.encode(s);
  const objects = [];
  const add = () => { objects.push(null); return objects.length; };
  const put = (id, parts) => { objects[id - 1] = parts; };
  const catalog = add(), tree = add();
  const refs = pages.map((p) => ({ page: add(), image: add(), content: add(), annots: p.links.map(() => add()) }));
  put(catalog, [str("<< /Type /Catalog /Pages " + tree + " 0 R >>")]);
  put(tree, [str("<< /Type /Pages /Kids [" + refs.map((r) => r.page + " 0 R").join(" ") + "] /Count " + pages.length + " >>")]);
  pages.forEach((p, i) => {
    const r = refs[i], W = 595.28, H = 841.89;
    const image = Uint8Array.from(atob(p.jpeg.split(",")[1]), (c) => c.charCodeAt(0));
    const content = str("q\n" + W + " 0 0 " + H + " 0 0 cm\n/Im0 Do\nQ\n");
    put(r.image, [str("<< /Type /XObject /Subtype /Image /Width " + p.width +
      " /Height " + p.height + " /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length " + image.length + " >>\nstream\n"), image, str("\nendstream")]);
    put(r.content, [str("<< /Length " + content.length + " >>\nstream\n"), content, str("endstream")]);
    const aRefs = r.annots.map((id) => id + " 0 R").join(" ");
    put(r.page, [str("<< /Type /Page /Parent " + tree + " 0 R /MediaBox [0 0 " + W + " " + H +
      "] /Resources << /XObject << /Im0 " + r.image + " 0 R >> >> /Contents " + r.content +
      " 0 R" + (aRefs ? " /Annots [" + aRefs + "]" : "") + " >>")]);
    p.links.forEach((a, j) => {
      const x1 = Math.max(0, a.x1 * W / p.width), x2 = Math.min(W, a.x2 * W / p.width);
      const y1 = Math.max(0, (p.height - a.y2) * H / p.height), y2 = Math.min(H, (p.height - a.y1) * H / p.height);
      put(r.annots[j], [str("<< /Type /Annot /Subtype /Link /Rect [" + [x1, y1, x2, y2].map(v => v.toFixed(2)).join(" ") +
        "] /Border [0 0 0] /A << /S /URI /URI (" + pdfEscape(a.url) + ") >> >>")]);
    });
  });
  const stream = [str("%PDF-1.4\n% GHRAB protected manual export\n")];
  const offsets = [0]; let size = stream[0].length;
  for (let i = 0; i < objects.length; i++) {
    offsets.push(size);
    const parts = [str((i + 1) + " 0 obj\n"), ...objects[i], str("\nendobj\n")];
    stream.push(...parts);
    for (const p of parts) size += p.length;
  }
  const xref = size, row = (v) => String(v).padStart(10, "0") + " 00000 n \n";
  stream.push(str("xref\n0 " + (objects.length + 1) + "\n0000000000 65535 f \n" + offsets.slice(1).map(row).join("") +
    "trailer\n<< /Size " + (objects.length + 1) + " /Root " + catalog + " 0 R >>\nstartxref\n" + xref + "\n%%EOF"));
  return pdfBytes(stream);
}
export async function downloadManualPdf(doc, options = {}) {
  if (!doc || !doc.querySelector) throw new Error("Dokument manuálu není dostupný.");
  const title = String(options.title || doc.title || "Manuál AI Studia").replace(/\s+/g, " ").trim();
  const name = String(options.filename || "AI-Studio-manual.pdf").replace(/[^a-z0-9_.-]/gi, "_");
  const blocks = manualBlocks(doc, options.extras);
  if (blocks.length < 5) throw new Error("Manuál nemá dostatek obsahu k exportu.");
  const canvas = doc.createElement("canvas"), W = 1240, H = 1754;
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) throw new Error("Prohlížeč nepodporuje kreslení PDF.");
  const margin = 86, bottom = H - 108, pages = []; let y = 165, anchors = [];
  const paintHeader = () => {
    ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#06779d"; ctx.fillRect(margin, 70, 68, 7);
    ctx.fillStyle = "#526374"; ctx.font = "18px Arial, sans-serif";
    ctx.fillText("GYMNÁZIUM OSTRAVA-HRABŮVKA  |  AI STUDIO", margin + 85, 81);
    ctx.fillStyle = "#14263a"; ctx.font = "bold 22px Arial, sans-serif";
    const cap = title.length > 70 ? title.slice(0, 67) + "…" : title;
    ctx.fillText(cap, margin, 120);
    ctx.strokeStyle = "#d4e3ed"; ctx.beginPath(); ctx.moveTo(margin, 140); ctx.lineTo(W - margin, 140); ctx.stroke();
  };
  const finish = () => {
    ctx.strokeStyle = "#d4e3ed"; ctx.beginPath(); ctx.moveTo(margin, H - 81); ctx.lineTo(W - margin, H - 81); ctx.stroke();
    ctx.fillStyle = "#536477"; ctx.font = "18px Arial, sans-serif";
    ctx.fillText("AI Studio GHRAB  •  pracovní příručka", margin, H - 52);
    ctx.fillText("Strana " + (pages.length + 1), W - margin - 100, H - 52);
    pages.push({ jpeg: canvas.toDataURL("image/jpeg", .90), width: W, height: H, links: anchors });
    anchors = [];
  };
  const next = () => { finish(); y = 165; paintHeader(); };
  const colors = { h1: "#102b40", h2: "#006f92", h3: "#163a53", list: "#1b3346", body: "#24394b", link: "#006f92" };
  const fonts = { h1: "bold 40px Arial, sans-serif", h2: "bold 30px Arial, sans-serif", h3: "bold 25px Arial, sans-serif",
    list: "22px Arial, sans-serif", body: "22px Arial, sans-serif", link: "20px Arial, sans-serif" };
  const sizes = { h1: 53, h2: 43, h3: 37, list: 33, body: 32, link: 32 };
  const spaced = { h1: 25, h2: 17, h3: 12, list: 9, body: 15, link: 13 };
  function wrap(text, limit) {
    const words = String(text).split(/\s+/).filter(Boolean), lines = []; let line = "";
    for (const word of words) {
      if (!line) { line = word; continue; }
      if (ctx.measureText(line + " " + word).width <= limit) { line += " " + word; continue; }
      lines.push(line); line = word;
    }
    if (line) lines.push(line);
    const result = [];
    for (const l of lines) {
      if (ctx.measureText(l).width <= limit) { result.push(l); continue; }
      let p = "";
      for (const c of l) {
        if (p && ctx.measureText(p + c).width > limit) { result.push(p); p = c; } else p += c;
      }
      if (p) result.push(p);
    }
    return result;
  }
  paintHeader();
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i], kind = fonts[b.type] ? b.type : "body";
    ctx.font = fonts[kind]; const text = b.type === "list" ? "•  " + b.text : b.text;
    const lines = wrap(text, W - margin * 2);
    const lineHeight = sizes[kind], required = Math.min(lines.length, 2) * lineHeight + spaced[kind];
    if (y + required > bottom) next();
    ctx.fillStyle = colors[kind];
    for (const line of lines) {
      if (y + lineHeight > bottom) next();
      ctx.font = fonts[kind]; ctx.fillStyle = colors[kind]; ctx.fillText(line, margin, y);
      if (b.type === "link") anchors.push({ x1: margin, y1: y - lineHeight + 4, x2: Math.min(W - margin, margin + ctx.measureText(line).width), y2: y + 5, url: b.url });
      y += lineHeight;
    }
    y += spaced[kind];
    if (i % 100 === 0) await new Promise((resolve) => setTimeout(resolve, 0));
  }
  finish();
  const blob = new Blob([createPdf(pages)], { type: "application/pdf" });
  const href = URL.createObjectURL(blob), a = doc.createElement("a");
  a.href = href; a.download = name; a.style.display = "none"; doc.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 30000);
  return { pages: pages.length, bytes: blob.size, name };
}
