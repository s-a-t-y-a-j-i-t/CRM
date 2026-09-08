/** Minimal A4 PDF writer. Works in browser and Node. No binary stored in Firestore. */

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 48;

function escapePdf(text: string): string {
  return text.replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)");
}

export class A4Document {
  private lines: string[] = [];
  private y = PAGE_H - MARGIN;
  private pageStarts: number[] = [0];

  get pageWidth() {
    return PAGE_W;
  }

  moveTo(x: number, y: number) {
    this.y = y;
    this.lines.push(`${x.toFixed(2)} ${y.toFixed(2)} Td`);
  }

  text(value: string, x = MARGIN, size = 10, font: "F1" | "F2" = "F1") {
    if (this.y < MARGIN + 24) this.newPage();
    this.lines.push(`BT /${font} ${size} Tf ${x.toFixed(2)} ${this.y.toFixed(2)} Td (${escapePdf(value)}) Tj ET`);
    this.y -= size + 4;
  }

  heading(value: string) {
    this.text(value, MARGIN, 16, "F2");
    this.y -= 4;
  }

  rule() {
    this.lines.push(`0.7 w ${MARGIN} ${this.y.toFixed(2)} m ${PAGE_W - MARGIN} ${this.y.toFixed(2)} l S`);
    this.y -= 10;
  }

  spacer(amount = 8) {
    this.y -= amount;
  }

  row(cells: string[], widths: number[], size = 8) {
    if (this.y < MARGIN + 20) this.newPage();
    let x = MARGIN;
    cells.forEach((cell, index) => {
      const width = widths[index] ?? 80;
      this.lines.push(`BT /F1 ${size} Tf ${x.toFixed(2)} ${this.y.toFixed(2)} Td (${escapePdf(cell.slice(0, 42))}) Tj ET`);
      x += width;
    });
    this.y -= size + 6;
  }

  newPage() {
    this.pageStarts.push(this.lines.length);
    this.y = PAGE_H - MARGIN;
  }

  build(): Uint8Array {
    const pages = [...this.pageStarts, this.lines.length];
    const contentStreams = pages.slice(0, -1).map((start, index) => {
      const end = pages[index + 1] ?? this.lines.length;
      return this.lines.slice(start, end).join("\n");
    });
    const objects: string[] = [];
    objects.push("1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj");
    const pageIds = contentStreams.map((_, index) => 4 + index * 2);
    objects.push(`2 0 obj << /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${contentStreams.length} >> endobj`);
    objects.push("3 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj");
    objects.push("4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> endobj");
    let nextId = 5;
    const fontMap = "3 0 R";
    const boldMap = "4 0 R";
    contentStreams.forEach((stream) => {
      const pageId = nextId;
      const contentId = nextId + 1;
      objects.push(`${pageId} 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Contents ${contentId} 0 R /Resources << /Font << /F1 ${fontMap} /F2 ${boldMap} >> >> >> endobj`);
      objects.push(`${contentId} 0 obj << /Length ${stream.length} >> stream\n${stream}\nendstream endobj`);
      nextId += 2;
    });
    // Fix page object ids: first page should be 5, but pageIds assumed 4+2i. Rebuild kids from actual objects.
    const rebuiltKids = contentStreams.map((_, index) => `${5 + index * 2} 0 R`).join(" ");
    objects[1] = `2 0 obj << /Type /Pages /Kids [${rebuiltKids}] /Count ${contentStreams.length} >> endobj`;

    let body = "%PDF-1.4\n";
    const offsets = [0];
    objects.forEach((object) => {
      offsets.push(body.length);
      body += `${object}\n`;
    });
    const xref = body.length;
    body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    offsets.slice(1).forEach((offset) => {
      body += `${String(offset).padStart(10, "0")} 00000 n \n`;
    });
    body += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
    return new TextEncoder().encode(body);
  }
}
