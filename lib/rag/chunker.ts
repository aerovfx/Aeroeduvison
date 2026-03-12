/**
 * Chunk tài liệu cho RAG – tương đương RecursiveCharacterTextSplitter.
 * LLM hoạt động tốt khi dữ liệu chia nhỏ (300–800 tokens, khuyến nghị ~500).
 */

export interface ChunkOptions {
  chunkSize?: number;
  chunkOverlap?: number;
}

const DEFAULT_CHUNK_SIZE = 500;
const DEFAULT_CHUNK_OVERLAP = 50;

export interface TextChunk {
  text: string;
  index: number;
  startChar: number;
  endChar: number;
}

/**
 * Chia văn bản thành các đoạn nhỏ: ưu tiên \n\n → \n → space.
 */
export function splitTextIntoChunks(
  text: string,
  options: ChunkOptions = {}
): TextChunk[] {
  const chunkSize = options.chunkSize ?? DEFAULT_CHUNK_SIZE;
  const overlap = Math.min(
    options.chunkOverlap ?? DEFAULT_CHUNK_OVERLAP,
    chunkSize - 1
  );

  const chunks: TextChunk[] = [];
  const separators = ['\n\n', '\n', ' ', ''];

  function splitRecursive(
    current: string,
    startIndex: number,
    separatorsIndex: number
  ): void {
    if (current.length <= chunkSize) {
      if (current.trim()) {
        chunks.push({
          text: current.trim(),
          index: chunks.length,
          startChar: startIndex,
          endChar: startIndex + current.length,
        });
      }
      return;
    }

    const sep = separators[separatorsIndex];
    let splitIndex = -1;

    if (sep === '') {
      splitIndex = chunkSize;
    } else {
      const searchStart = Math.max(0, chunkSize - overlap - 100);
      const slice = current.slice(searchStart, chunkSize + 50);
      const idx = slice.lastIndexOf(sep);
      splitIndex = idx >= 0 ? searchStart + idx + sep.length : chunkSize;
    }

    const part = current.slice(0, splitIndex).trim();
    if (part) {
      chunks.push({
        text: part,
        index: chunks.length,
        startChar: startIndex,
        endChar: startIndex + part.length,
      });
    }

    const nextStart = startIndex + splitIndex;
    const nextOverlap =
      overlap > 0 && splitIndex > overlap
        ? current.slice(splitIndex - overlap, splitIndex)
        : '';
    const remainder = nextOverlap + current.slice(splitIndex);

    if (remainder.trim()) {
      splitRecursive(
        remainder,
        nextStart - nextOverlap.length,
        separatorsIndex
      );
    }
  }

  const normalized = text.replace(/\r\n/g, '\n').trim();
  if (normalized) {
    splitRecursive(normalized, 0, 0);
  }

  return chunks;
}
