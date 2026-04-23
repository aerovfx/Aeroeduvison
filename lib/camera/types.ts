/**
 * Camera Management System Type Definitions
 * Defines interfaces for cameras, classrooms, and school locations
 */

/** Camera location types */
export type CameraLocationType = 'classroom' | 'hallway' | 'entrance' | 'lab' | 'library' | 'gymnasium' | 'cafeteria' | 'office' | 'other'

/** Camera status */
export type CameraStatus = 'online' | 'offline' | 'error'

/**
 * ClassroomCamera
 * Represents a camera assigned to a location (classroom, hallway, lab, etc.)
 */
export interface ClassroomCamera {
  /** Unique camera identifier */
  id: string

  /** Camera display name */
  name: string

  /** RTSP stream URL */
  rtspUrl: string

  /** Camera brand/manufacturer */
  brand: string

  /** Physical location description */
  location: string

  /** Type of location where camera is installed */
  locationType: CameraLocationType

  /** ID of assigned location/entity */
  assignedTo: string

  /** Stream ID for internal reference */
  streamId?: string

  /** Class ID if camera is in a classroom */
  classId?: string

  /** Room number if applicable */
  roomNumber?: string

  /** Current camera status */
  status?: CameraStatus

  /** Whether camera is active/enabled */
  isActive: boolean

  /** Last time camera status was checked (ISO 8601 format) */
  lastChecked?: string
}

/**
 * ClassroomInfo
 * Represents a classroom with its associated information and camera
 */
export interface ClassroomInfo {
  /** Unique classroom identifier */
  classId: string

  /** Classroom name (e.g., "Lớp 9A1") */
  className: string

  /** Grade/level (e.g., "Khối 9") */
  grade: string

  /** School year (e.g., "2025-2026") */
  schoolYear: string

  /** Room/building number (e.g., "P.201") */
  roomNumber: string

  /** ID of teacher teaching this class */
  teacherId: string

  /** Name of the teacher */
  teacherName: string

  /** Number of students in the class */
  studentCount: number

  /** ID of assigned camera (optional) */
  cameraId?: string

  /** Name of assigned camera (optional) */
  cameraName?: string
}

/**
 * SchoolLocationInfo
 * Represents a location in the school building with its cameras
 */
export interface SchoolLocationInfo {
  /** Unique location identifier */
  locationId: string

  /** Location display name */
  name: string

  /** Type of location */
  type: CameraLocationType

  /** Floor number */
  floor: string

  /** Building identifier (e.g., "A", "B") */
  building?: string

  /** Array of camera IDs in this location */
  cameras: string[]
}
