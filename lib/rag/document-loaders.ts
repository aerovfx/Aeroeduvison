/**
 * Đọc dữ liệu từ PDF, TXT, Markdown – trích xuất văn bản thuần.
 * Hỗ trợ: buffer (file) hoặc URL (GitHub raw, Markdown, TXT).
 * Dùng cho pipeline RAG: Documents → Text Extraction → Chunking → Embedding → Vector DB.
 */

export interface LoadedDocument {
  text: string;
  source: string;
  pageCount?: number;
}

/**
 * Chuyển GitHub blob URL sang raw URL để fetch nội dung.
 * Ví dụ: github.com/owner/repo/blob/main/docs/file.md → raw.githubusercontent.com/owner/repo/main/docs/file.md
 */
export function toGitHubRawUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.hostname !== 'github.com' && u.hostname !== 'www.github.com') return url;
    const pathParts = u.pathname.split('/').filter(Boolean);
    const blobIndex = pathParts.indexOf('blob');
    if (blobIndex === -1 || blobIndex + 2 >= pathParts.length) return url;
    const owner = pathParts[0];
    const repo = pathParts[1];
    const branch = pathParts[blobIndex + 1];
    const filePath = pathParts.slice(blobIndex + 2).join('/');
    return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`;
  } catch {
    return url;
  }
}

/**
 * Tải tài liệu từ URL (GitHub raw, hoặc bất kỳ URL trả về text/markdown).
 */
export async function loadDocumentFromUrl(url: string): Promise<LoadedDocument> {
  const rawUrl = toGitHubRawUrl(url);
  const res = await fetch(rawUrl, {
    headers: { 'User-Agent': 'AeroeduVision-RAG/1.0' },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch URL: ${res.status} ${res.statusText}`);
  }
  const contentType = (res.headers.get('content-type') || '').toLowerCase();
  const text = await res.text();
  const normalized = text.replace(/\r\n/g, '\n').trim();
  const fileName = rawUrl.split('/').pop() || 'document';
  const source = url !== rawUrl ? `${url} (raw)` : url;
  return { text: normalized, source: source || rawUrl };
}

/**
 * Trích xuất text từ buffer theo loại file (PDF / TXT / MD).
 */
export async function loadDocumentFromBuffer(
  buffer: Buffer,
  filename: string,
  mimeType?: string
): Promise<LoadedDocument> {
  const ext = (filename.split('.').pop() || '').toLowerCase();
  const mime = (mimeType || '').toLowerCase();

  if (ext === 'txt' || mime === 'text/plain') {
    return loadTxt(buffer, filename);
  }
  if (ext === 'md' || ext === 'markdown' || mime === 'text/markdown') {
    return loadMd(buffer, filename);
  }
  if (ext === 'pdf' || mime === 'application/pdf') {
    return loadPdf(buffer, filename);
  }

  throw new Error(`Unsupported format: ${filename} (${mimeType}). Use PDF, TXT, or MD.`);
}

function loadTxt(buffer: Buffer, source: string): LoadedDocument {
  const text = buffer.toString('utf-8').replace(/\r\n/g, '\n').trim();
  return { text, source };
}

function loadMd(buffer: Buffer, source: string): LoadedDocument {
  const text = buffer.toString('utf-8').replace(/\r\n/g, '\n').trim();
  return { text, source };
}

async function loadPdf(buffer: Buffer, source: string): Promise<LoadedDocument> {
  try {
    const pdfParse = await import('pdf-parse').catch(() => null);
    if (!pdfParse?.default) {
      throw new Error(
        'PDF support requires: npm install pdf-parse. Then restart the server.'
      );
    }
    const data = await pdfParse.default(buffer);
    const text = (data.text || '').replace(/\r\n/g, '\n').trim();
    return {
      text,
      source,
      pageCount: data.numpages,
    };
  } catch (e) {
    if ((e as Error).message?.includes('pdf-parse')) throw e;
    throw new Error(`Failed to parse PDF "${source}": ${(e as Error).message}`);
  }
}
