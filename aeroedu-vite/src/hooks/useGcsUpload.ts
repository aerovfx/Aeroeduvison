/**
 * useGcsUpload — Hook for uploading files directly to GCS via resumable sessions
 *
 * Flow:
 * 1. POST /api/upload/request → get session URI from media-service
 * 2. PUT session URI ← upload file bytes directly to GCS (no auth needed)
 * 3. Return public URL when done
 *
 * Works for videos, images, documents — the backend routes to the correct bucket.
 */

import { useState, useCallback, useRef } from 'react'
import { api } from '@/services/api'

export interface GcsUploadOptions {
  folder?: string           // GCS path prefix: "courses/abc123", "avatars", etc.
  onProgress?: (pct: number) => void
  onComplete?: (url: string, objectName: string) => void
  onError?: (err: string) => void
}

export interface GcsUploadState {
  uploading: boolean
  progress: number           // 0-100
  url: string | null         // public URL when done
  error: string | null
  cancel: () => void
}

interface UploadRequestResponse {
  success: boolean
  session_uri: string
  public_url: string
  object_name: string
  bucket: string
  storage_type: string
}

export function useGcsUpload(opts: GcsUploadOptions = {}) {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const xhrRef = useRef<XMLHttpRequest | null>(null)

  const cancel = useCallback(() => {
    xhrRef.current?.abort()
    setUploading(false)
    setProgress(0)
  }, [])

  const upload = useCallback(async (file: File): Promise<string | null> => {
    setUploading(true)
    setProgress(0)
    setUrl(null)
    setError(null)

    try {
      // Step 1: Request a resumable session URI from the backend
      const { data } = await api.post<UploadRequestResponse>('/upload/request', {
        filename: file.name,
        content_type: file.type || 'application/octet-stream',
        folder: opts.folder,
      })

      if (!data.success || !data.session_uri) {
        throw new Error('Không nhận được session URI từ server')
      }

      const { session_uri, public_url } = data

      // Step 2: Upload file directly to GCS using the session URI
      const publicUrl = await new Promise<string>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhrRef.current = xhr

        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 100)
            setProgress(pct)
            opts.onProgress?.(pct)
          }
        })

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(public_url)
          } else {
            reject(new Error(`GCS upload failed: ${xhr.status} ${xhr.statusText}`))
          }
        })

        xhr.addEventListener('error', () => reject(new Error('Lỗi kết nối khi upload')))
        xhr.addEventListener('abort', () => reject(new Error('Upload đã bị huỷ')))

        // GCS resumable upload: PUT the file to the session URI
        xhr.open('PUT', session_uri)
        xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream')
        xhr.send(file)
      })

      setUrl(publicUrl)
      setProgress(100)
      opts.onComplete?.(publicUrl, data.object_name)
      return publicUrl

    } catch (err: any) {
      const msg = err.message || 'Upload thất bại'
      setError(msg)
      opts.onError?.(msg)
      return null
    } finally {
      setUploading(false)
      xhrRef.current = null
    }
  }, [opts])

  return { upload, uploading, progress, url, error, cancel }
}
