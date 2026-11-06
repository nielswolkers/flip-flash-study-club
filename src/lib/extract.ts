/** Browser-only: turn an uploaded file into text and/or image data URLs for the AI scan. */
export type Extracted = { text: string; images: string[] };

async function imageToDataUrl(src: CanvasImageSource & { width: number; height: number }, max = 1600) {
  const scale = Math.min(1, max / Math.max(src.width, src.height));
  const c = document.createElement("canvas");
  c.width = Math.round(src.width * scale);
  c.height = Math.round(src.height * scale);
  c.getContext("2d")!.drawImage(src, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.85);
}

async function fromImage(file: File): Promise<Extracted> {
  const bmp = await createImageBitmap(file);
  return { text: "", images: [await imageToDataUrl(bmp)] };
}

async function fromPdf(file: File): Promise<Extracted> {
  const pdfjs = await import("pdfjs-dist");
  const worker = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = worker;
  const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  let text = "";
  for (let p = 1; p <= Math.min(doc.numPages, 80); p++) {
    const page = await doc.getPage(p);
    const tc = await page.getTextContent();
    text += tc.items.map((i) => ("str" in i ? i.str : "")).join(" ") + "\n";
  }
  if (text.trim().length > 80) return { text, images: [] };
  // Scanned PDF: render first pages as images
  const images: string[] = [];
  for (let p = 1; p <= Math.min(doc.numPages, 6); p++) {
    const page = await doc.getPage(p);
    const vp = page.getViewport({ scale: 1.5 });
    const c = document.createElement("canvas");
    c.width = vp.width; c.height = vp.height;
    await page.render({ canvas: c, canvasContext: c.getContext("2d")!, viewport: vp }).promise;
    images.push(await imageToDataUrl(c));
  }
  return { text: "", images };
}

async function fromDocx(file: File): Promise<Extracted> {
  const mammoth = await import("mammoth");
  const r = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
  return { text: r.value, images: [] };
}

async function fromPptx(file: File): Promise<Extracted> {
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const slides = Object.keys(zip.files)
    .filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
    .sort((a, b) => Number(a.match(/\d+/)![0]) - Number(b.match(/\d+/)![0]));
  let text = "";
  for (const [i, n] of slides.entries()) {
    const xml = await zip.files[n]!.async("string");
    const parts = [...xml.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map((m) => m[1]);
    text += `Slide ${i + 1}: ${parts.join(" ")}\n`;
  }
  return { text, images: [] };
}

export const ACCEPT = ".pdf,.doc,.docx,.ppt,.pptx,.png,.jpg,.jpeg,.webp,.txt,.csv,image/*";

export async function extractFile(file: File): Promise<Extracted> {
  const name = file.name.toLowerCase();
  if (file.type.startsWith("image/") || /\.(png|jpe?g|webp|gif)$/.test(name)) return fromImage(file);
  if (name.endsWith(".pdf")) return fromPdf(file);
  if (name.endsWith(".docx")) return fromDocx(file);
  if (name.endsWith(".pptx")) return fromPptx(file);
  if (name.endsWith(".txt") || name.endsWith(".csv")) return { text: await file.text(), images: [] };
  if (name.endsWith(".doc") || name.endsWith(".ppt")) throw new Error("Old .doc/.ppt files aren't supported — save as .docx/.pptx or PDF first.");
  throw new Error("Unsupported file type.");
}
