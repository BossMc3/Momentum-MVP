// Browser-only: extract text from an uploaded bank statement (PDF, CSV, TXT).
export async function extractText(file: File): Promise<string> {
  if (!/\.(pdf|csv|txt)$/i.test(file.name)) throw new Error("Alege un fișier PDF, CSV sau TXT.");
  if (file.size > 20 * 1024 * 1024) throw new Error("Fișierul depășește 20 MB.");
  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (isPdf) {
    try {
      const pdfjs = await import("pdfjs-dist");
      const worker = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
      pdfjs.GlobalWorkerOptions.workerSrc = worker;
      const task = pdfjs.getDocument({ data: await file.arrayBuffer() });
      const doc = await task.promise;
      if (doc.numPages > 30) throw new Error("Alege un extras de maximum 30 de pagini.");
      const out: string[] = [];
      for (let p = 1; p <= Math.min(doc.numPages, 30); p++) {
        const page = await doc.getPage(p);
        const content = await page.getTextContent();
        // group by y position to rebuild lines
        const rows = new Map<number, string[]>();
        for (const it of content.items as { str: string; transform: number[] }[]) {
          const y = Math.round(it.transform[5] ?? 0);
          rows.set(y, [...(rows.get(y) ?? []), it.str]);
        }
        [...rows.entries()].sort((a, b) => b[0] - a[0]).forEach(([, s]) => out.push(s.join(" ")));
      }
      await task.destroy();
      if (!out.join("").trim()) throw new Error("PDF-ul nu conține text selectabil. Exportă extrasul în CSV sau PDF text.");
      return out.join("\n");
    } catch (e) {
      throw new Error(e instanceof Error ? e.message : "Nu putem citi acest PDF. Încearcă un export CSV.");
    }
  }
  return file.text();
}
