/**
 * Camera Management Types for Aeroeduvison Education Platform
 * Adapted from OptiCare_webapp camera module for classroom monitoring
 */

export interface ClassroomCamera {
  id: string
  name: string
  rtspUrl: string
  brand: string
  location: string
  locationType: 'classroom' | 'hallway' | 'entrance' | 'lab' | 'library' | 'gymnasium' | 'cafeteria' | 'office' | 'other'
  assignedTo?: string // classId or location identifier
  classId?: string
  roomNumber?: string
  status: 'online' | 'offline' | 'error' | 'testing'
  hlsUrl?: string
  streamId?: string
  lastChecked?: string
  isActive: boolean
}

export interface ClassroomInfo {
  classId: string
  className: string
  grade: string
  schoolYear: string
  roomNumber: string
  teacherId?: string
  teacherName?: string
  studentCount: number
  cameraId?: string
  cameraName?: string
}

export interface SchoolLocationInfo {
  locationId: string
  name: string
  type: 'hallway' | 'entrance' | 'lab' | 'library' | 'gymnasium' | 'cafeteria' | 'office' | 'other'
  floor: string
  building?: string
  cameras: string[]
}

export type CameraLocationType = ClassroomCamera['locationType']
export type CameraStatus = ClassroomCamera['status']
