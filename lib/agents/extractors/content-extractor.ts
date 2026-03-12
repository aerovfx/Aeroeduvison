/**
 * Content Extractor Service
 * Extracts content from multiple sources for question generation
 */

export interface ExtractedContent {
  source: string
  sourceType: SourceType
  title: string
  content: string
  metadata: Record<string, any>
  timestamp: Date
}

export type SourceType = 
  | 'youtube'
  | 'website'
  | 'pdf'
  | 'doc'
  | 'docx'
  | 'text'
  | 'image'

export class ContentExtractor {
  /**
   * Extract content from any source
   */
  static async extract(source: string, sourceType: SourceType): Promise<ExtractedContent> {
    console.log(`📥 Extracting content from ${sourceType}: ${source}`)

    switch (sourceType) {
      case 'youtube':
        return this.extractFromYouTube(source)
      case 'website':
        return this.extractFromWebsite(source)
      case 'pdf':
        return this.extractFromPDF(source)
      case 'doc':
      case 'docx':
        return this.extractFromDoc(source)
      case 'text':
        return this.extractFromText(source)
      case 'image':
        return this.extractFromImage(source)
      default:
        throw new Error(`Unsupported source type: ${sourceType}`)
    }
  }

  /**
   * Extract from YouTube video (transcript)
   */
  static async extractFromYouTube(url: string): Promise<ExtractedContent> {
    try {
      // Extract video ID
      const videoId = this.extractYouTubeId(url)
      
      // Call YouTube transcript API
      const response = await fetch(`/api/extract/youtube`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId }),
      })

      if (!response.ok) throw new Error('Failed to extract YouTube transcript')
      const data = await response.json()

      return {
        source: url,
        sourceType: 'youtube',
        title: data.title || 'YouTube Video',
        content: data.transcript || '',
        metadata: {
          videoId,
          duration: data.duration,
          channel: data.channel,
        },
        timestamp: new Date(),
      }
    } catch (error: any) {
      console.error('YouTube extraction error:', error)
      throw new Error(`Failed to extract YouTube: ${error.message}`)
    }
  }

  /**
   * Extract from website URL
   */
  static async extractFromWebsite(url: string): Promise<ExtractedContent> {
    try {
      const response = await fetch(`/api/extract/website`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })

      if (!response.ok) throw new Error('Failed to extract website')
      const data = await response.json()

      return {
        source: url,
        sourceType: 'website',
        title: data.title || 'Website Content',
        content: data.content || '',
        metadata: {
          url,
          domain: new URL(url).hostname,
        },
        timestamp: new Date(),
      }
    } catch (error: any) {
      console.error('Website extraction error:', error)
      throw new Error(`Failed to extract website: ${error.message}`)
    }
  }

  /**
   * Extract from PDF file
   */
  static async extractFromPDF(filePath: string): Promise<ExtractedContent> {
    try {
      const response = await fetch(`/api/extract/pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath }),
      })

      if (!response.ok) throw new Error('Failed to extract PDF')
      const data = await response.json()

      return {
        source: filePath,
        sourceType: 'pdf',
        title: data.title || 'PDF Document',
        content: data.content || '',
        metadata: {
          filePath,
          pages: data.pages,
        },
        timestamp: new Date(),
      }
    } catch (error: any) {
      console.error('PDF extraction error:', error)
      throw new Error(`Failed to extract PDF: ${error.message}`)
    }
  }

  /**
   * Extract from DOC/DOCX file
   */
  static async extractFromDoc(filePath: string): Promise<ExtractedContent> {
    try {
      const response = await fetch(`/api/extract/doc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath }),
      })

      if (!response.ok) throw new Error('Failed to extract DOC')
      const data = await response.json()

      return {
        source: filePath,
        sourceType: filePath.endsWith('docx') ? 'docx' : 'doc',
        title: data.title || 'Document',
        content: data.content || '',
        metadata: { filePath },
        timestamp: new Date(),
      }
    } catch (error: any) {
      console.error('DOC extraction error:', error)
      throw new Error(`Failed to extract DOC: ${error.message}`)
    }
  }

  /**
   * Extract from plain text
   */
  static async extractFromText(text: string): Promise<ExtractedContent> {
    return {
      source: 'text',
      sourceType: 'text',
      title: 'Text Content',
      content: text,
      metadata: {},
      timestamp: new Date(),
    }
  }

  /**
   * Extract from image (OCR)
   */
  static async extractFromImage(imagePath: string): Promise<ExtractedContent> {
    try {
      const response = await fetch(`/api/extract/ocr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imagePath }),
      })

      if (!response.ok) throw new Error('Failed to extract image')
      const data = await response.json()

      return {
        source: imagePath,
        sourceType: 'image',
        title: 'Image Content',
        content: data.text || '',
        metadata: { imagePath },
        timestamp: new Date(),
      }
    } catch (error: any) {
      console.error('Image extraction error:', error)
      throw new Error(`Failed to extract image: ${error.message}`)
    }
  }

  /**
   * Extract YouTube video ID from URL
   */
  private static extractYouTubeId(url: string): string {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/
    const match = url.match(regex)
    return match ? match[1] : url
  }

  /**
   * Batch extract from multiple sources
   */
  static async extractBatch(sources: Array<{ url: string; type: SourceType }>): Promise<ExtractedContent[]> {
    const results: ExtractedContent[] = []
    
    for (const source of sources) {
      try {
        const content = await this.extract(source.url, source.type)
        results.push(content)
        console.log(`✅ Extracted from ${source.type}: ${source.url}`)
      } catch (error: any) {
        console.error(`❌ Failed to extract from ${source.url}:`, error.message)
        results.push({
          source: source.url,
          sourceType: source.type,
          title: 'Extraction Failed',
          content: '',
          metadata: { error: error.message },
          timestamp: new Date(),
        })
      }
    }

    return results
  }

  /**
   * Combine multiple extracted contents
   */
  static combineContents(contents: ExtractedContent[]): string {
    return contents
      .filter(c => c.content)
      .map(c => `## ${c.title}\n\n${c.content}`)
      .join('\n\n---\n\n')
  }
}

export const contentExtractor = new ContentExtractor()
