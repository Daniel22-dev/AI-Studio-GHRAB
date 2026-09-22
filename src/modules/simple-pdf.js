const ASCII_REPLACEMENTS = new Map([
  ["→", "->"], ["·", "-"], ["–", "-"], ["—", "-"],
  ["“", "'"], ["”", "'"], ["„", "'"], ["’", "'"], ["‘", "'"],
]);

function ascii(value) {
  let text = String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  for (const [from, to] of ASCII_REPLACEMENTS) text = text.split(from).join(to);
  return text.replace(/[^\x20-\x7e]/g, "?");
}

function escapePdf(value) {
  return ascii(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function wrap(value, width = 90) {
  const words = ascii(value).split(/\s+/).filter(Boolean);
  if (!words.length) return [""];
  const lines = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length <= width) line = candidate;
    else {
      if (line) lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function buildPdf(lines) {
  const pageSize = 46;
  const pages = [];
  for (let i = 0; i < lines.length; i += pageSize) pages.push(lines.slice(i, i + pageSize));
  if (!pages.length) pages.push([""]);

  const objects = [null];
  const catalogId = objects.push("") - 1;
  const pagesId = objects.push("") - 1;
  const fontId = objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>") - 1;
  const pageIds = [];

  for (const pageLines of pages) {
    const commands = ["BT", "/F1 10 Tf", "48 794 Td", "14 TL"];
    pageLines.forEach((line, index) => {
      commands.push(`${index ? "T* " : ""}(${escapePdf(line)}) Tj`);
    });
    commands.push("ET");
    const stream = commands.join("\n");
    const streamId = objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`) - 1;
    const pageId = objects.push("") - 1;
    pageIds.push(pageId);
    objects[pageId] =
      `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 595 842] ` +
      `/Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${streamId} 0 R >>`;
  }

  objects[catalogId] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
  objects[pagesId] = `<< /Type /Pages /Count ${pageIds.length} /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] >>`;

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (let id = 1; id < objects.length; id += 1) {
    offsets[id] = pdf.length;
    pdf += `${id} 0 obj\n${objects[id]}\nendobj\n`;
  }
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let id = 1; id < objects.length; id += 1) {
    pdf += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return new Blob([pdf], { type: "application/pdf" });
}

export function downloadTextPdf({ filename = "report.pdf", sections = [] } = {}) {
  const lines = [];
  for (const section of sections) {
    if (section.heading) {
      lines.push(...wrap(String(section.heading).toUpperCase(), 78));
      lines.push("");
    }
    for (const paragraph of section.paragraphs || []) {
      lines.push(...wrap(paragraph, 90));
      lines.push("");
    }
    for (const item of section.items || []) {
      lines.push(...wrap(`- ${item}`, 88));
    }
    if ((section.items || []).length) lines.push("");
  }

  const blob = buildPdf(lines);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
