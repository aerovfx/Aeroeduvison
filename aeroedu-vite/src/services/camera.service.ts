/**
 * Camera Service — frontend client cho Camera management API
 *
 * Cấu trúc:
 *  - cameraService.list()                            → teacher list
 *  - cameraService.get(id)                           → teacher detail
 *  - cameraService.copyUrl(id)                       → teacher copy RTSP URL
 *  - cameraService.admin.list()                      → admin list full
 *  - cameraService.admin.create(payload)             → admin tạo mới
 *  - cameraService.admin.update(id, payload)         → admin cập nhật
 *  - cameraService.admin.remove(id)                  → admin xoá
 *  - cameraService.admin.test(id)                    → admin test TCP probe
 *  - cameraService.admin.discover(networkRange?)     → admin ONVIF discovery (mock V1)
 */
import api from './api'

export interface Camera {
  id: string
  name: string
  brand: string
  model: string
  ipAddress: string
  rtspUrl?: string                   // teacher view (built sẵn có cred)
  hlsUrl?: string | null
  snapshotUrl?: string | null
  location: string
  locationType: string
  classId?: string | null
  roomNumber?: string
  enabled: boolean
  status: 'online' | 'offline' | 'error' | 'unknown'
  hasPTZ: boolean
  hasAudio: boolean
}

export interface CameraAdmin extends Camera {
  // Admin-only fields
  serialNumber?: string
  httpPort: number
  rtspPort: number
  onvifPort: number
  username: string
  passwordMask: string | null         // không bao giờ trả raw password
  mainProfile?: string
  subProfile?: string
  rtspMainUrl?: string                // built version (read-only)
  rtspSubUrl?: string
  schoolId?: string | null
  hasMotion: boolean
  lastSeenAt?: string
  lastError?: string | null
  createdAt?: string
  updatedAt?: string
}

export interface CameraCreatePayload {
  name: string
  ipAddress: string
  brand?: string
  model?: string
  serialNumber?: string
  httpPort?: number
  rtspPort?: number
  onvifPort?: number
  username?: string
  password?: string                   // raw, server obfuscate
  mainProfile?: string
  subProfile?: string
  rtspMainUrl?: string                // optional override khi không match brand pattern
  rtspSubUrl?: string
  hlsUrl?: string
  snapshotUrl?: string
  location?: string
  locationType?: 'classroom' | 'hallway' | 'lab' | 'gate' | 'parking' | 'office' | string
  schoolId?: string
  classId?: string
  roomNumber?: string
  enabled?: boolean
  hasPTZ?: boolean
  hasAudio?: boolean
  hasMotion?: boolean
}

export interface CopyUrlResponse {
  rtspMain: string
  rtspSub: string
  hls: string | null
  snapshot: string | null
  name: string
}

export interface TestResponse {
  ok: boolean
  message: string
  status: 'online' | 'offline'
  rtspMain: string
  rtspSub: string
}

export interface DiscoverResponse {
  discovered: Array<{
    ipAddress: string
    port?: number
    brand?: string
    model?: string
    serialNumber?: string
  }>
  message?: string
  hint?: {
    sadpDownload?: string
    dahuaTool?: string
    nxWitness?: string
    commonRtspPaths?: Record<string, string>
  }
}

export const cameraService = {
  // ── Teacher endpoints ─────────────────────────────────────
  list: () =>
    api.get<{ cameras: Camera[]; count: number }>('/cameras').then(r => r.data),

  get: (id: string) =>
    api.get<Camera>(`/cameras/${id}`).then(r => r.data),

  copyUrl: (id: string) =>
    api.post<CopyUrlResponse>(`/cameras/${id}/copy-url`).then(r => r.data),

  // ── Admin endpoints ───────────────────────────────────────
  admin: {
    list: () =>
      api.get<{ cameras: CameraAdmin[]; count: number }>('/admin/cameras').then(r => r.data),

    create: (data: CameraCreatePayload) =>
      api.post<{ camera: CameraAdmin }>('/admin/cameras', data).then(r => r.data.camera),

    update: (id: string, data: Partial<CameraCreatePayload>) =>
      api.patch<{ camera: CameraAdmin }>(`/admin/cameras/${id}`, data).then(r => r.data.camera),

    remove: (id: string) =>
      api.delete<{ ok: boolean }>(`/admin/cameras/${id}`).then(r => r.data),

    test: (id: string) =>
      api.post<TestResponse>(`/admin/cameras/${id}/test`).then(r => r.data),

    discover: (networkRange?: string) =>
      api.post<DiscoverResponse>('/admin/cameras/discover', { networkRange }).then(r => r.data),
  },
}
