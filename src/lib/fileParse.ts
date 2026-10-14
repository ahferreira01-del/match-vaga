// Extração de texto de PDF/DOCX no navegador.
export async function extractTextFromFile(file: File): Promise<{ text: string; pages?: number }> {
  const name = file.name.toLowerCase();
  const buf = await file.arrayBuffer();
  if (name.endsWith(".pdf")) {
    const pdfjs = await import("pdfjs-dist");
    const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
    pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
    const doc = await pdfjs.getDocument({ data: buf }).promise;
    const lines: string[] = [];
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      const content = await page.getTextContent();
      let lastY: number | null = null;
      let line = "";
      for (const item of content.items as { str: string; transform: number[] }[]) {
        const y = item.transform[5];
        if (lastY !== null && Math.abs(y - lastY) > 2) {
          lines.push(line.trim());
          line = "";
        }
        line += item.str + " ";
        lastY = y;
      }
      if (line.trim()) lines.push(line.trim());
    }
    return { text: lines.filter(Boolean).join("\n"), pages: doc.numPages };
  }
  if (name.endsWith(".docx")) {
    const mammoth = await import("mammoth");
    const res = await mammoth.extractRawText({ arrayBuffer: buf });
    return { text: res.value };
  }
  throw new Error("Formato não suportado. Envie PDF ou DOCX.");
}
