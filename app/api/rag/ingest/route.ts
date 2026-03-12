/**
 * POST /api/rag/ingest
 * Upload file (PDF/TXT/MD) HOẶC URL (GitHub, Markdown) → chunk → embedding → vector DB (RAG).
 * Body: formData { file } hoặc formData/JSON { url }. Có thể gửi nhiều url (url[] hoặc urls).
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ragIngest, ragIngestFromUrl } from '@/lib/rag/rag-service';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contentType = req.headers.get('content-type') || '';
    const isForm = contentType.includes('multipart/form-data');

    if (isForm) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      const url = (formData.get('url') as string)?.trim();
      const urlsRaw = formData.get('urls'); // JSON string array
      const chunkSize = formData.get('chunkSize');
      const chunkOverlap = formData.get('chunkOverlap');
      const opts = {
        chunkSize: chunkSize ? parseInt(String(chunkSize), 10) : undefined,
        chunkOverlap: chunkOverlap ? parseInt(String(chunkOverlap), 10) : undefined,
      };

      if (file && file.size > 0) {
        const buffer = Buffer.from(await file.arrayBuffer());
        const result = await ragIngest(buffer, file.name || 'document', file.type || undefined, opts);
        return NextResponse.json({
          success: true,
          documentId: result.documentId,
          source: result.source,
          chunksCount: result.chunksCount,
          chunkIds: result.chunkIds,
        });
      }

      const urlList: string[] = [];
      if (url) urlList.push(url);
      if (urlsRaw) {
        try {
          const parsed = typeof urlsRaw === 'string' ? JSON.parse(urlsRaw) : urlsRaw;
          if (Array.isArray(parsed)) urlList.push(...parsed.filter((u: string) => u?.trim()));
        } catch { /* ignore */ }
      }
      if (urlList.length === 0) {
        return NextResponse.json(
          { error: 'Missing "file" or "url" / "urls". Send file upload or URL(s).' },
          { status: 400 }
        );
      }
      const results = await Promise.all(urlList.map((u) => ragIngestFromUrl(u, opts)));
      return NextResponse.json({
        success: true,
        results: results.map((r) => ({ documentId: r.documentId, source: r.source, chunksCount: r.chunksCount })),
        totalChunks: results.reduce((sum, r) => sum + r.chunksCount, 0),
      });
    }

    const body = await req.json().catch(() => ({}));
    const url = (body.url as string)?.trim();
    const urls = Array.isArray(body.urls) ? body.urls.map((u: string) => String(u).trim()).filter(Boolean) : [];
    const allUrls = url ? [url, ...urls] : urls;
    if (allUrls.length === 0) {
      return NextResponse.json(
        { error: 'Missing "url" or "urls" in body.' },
        { status: 400 }
      );
    }
    const opts = {
      chunkSize: body.chunkSize ? parseInt(body.chunkSize, 10) : undefined,
      chunkOverlap: body.chunkOverlap ? parseInt(body.chunkOverlap, 10) : undefined,
    };
    const results = await Promise.all(allUrls.map((u) => ragIngestFromUrl(u, opts)));
    return NextResponse.json({
      success: true,
      results: results.map((r) => ({ documentId: r.documentId, source: r.source, chunksCount: r.chunksCount })),
      totalChunks: results.reduce((sum, r) => sum + r.chunksCount, 0),
    });
  } catch (e) {
    console.error('[RAG ingest]', e);
    return NextResponse.json(
      { error: (e as Error).message || 'Ingest failed' },
      { status: 500 }
    );
  }
}
