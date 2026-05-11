import { DOC_EXTS, FileEntry, getExt, TEXT_EXTS } from "./types";

export function canExtractText(entry: FileEntry): boolean {
  const ext = getExt(entry.name);
  return TEXT_EXTS.has(ext) || DOC_EXTS.has(ext);
}

/** Extracts plain text from a file. Returns empty string for unsupported types. */
export async function extractTextFromFile(entry: FileEntry): Promise<string> {
  const ext = getExt(entry.name);
  const fileObj = await entry.handle.getFile();

  if (TEXT_EXTS.has(ext)) {
    return fileObj.text();
  }

  if (DOC_EXTS.has(ext)) {
    const buf = await fileObj.arrayBuffer();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mod = (await import("mammoth/mammoth.browser")) as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const m: any = mod.default ?? mod;

    try {
      const result = await m.extractRawText({ arrayBuffer: buf });
      if (result.value) return result.value as string;
    } catch {
      /* fall through to XML extraction */
    }

    // Fallback: extract raw text from XML
    try {
      const JSZip = (await import("jszip")).default;
      const zip = await JSZip.loadAsync(buf);
      const entry = zip.file("word/document.xml");
      if (!entry) return "";
      const xml = await entry.async("text");
      return xml
        .replace(/<w:br[^>]*\/?>/gi, "\n")
        .replace(/<\/w:p>/gi, "\n")
        .replace(/<[^>]+>/g, "")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#x([0-9a-fA-F]+);/g, (_, h) =>
          String.fromCharCode(parseInt(h, 16)),
        )
        .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
        .replace(/\n{3,}/g, "\n\n")
        .trim();
    } catch {
      return "";
    }
  }

  return "";
}
