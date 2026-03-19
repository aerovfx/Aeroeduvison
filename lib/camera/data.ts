/**
 * Camera Assignments Data for Education Platform
 * Central data store for camera-to-classroom mappings
 * Synced across Teacher Camera View and Admin Camera Management
 */

import type { ClassroomCamera, ClassroomInfo, SchoolLocationInfo } from './types'

// ── Mock Classrooms ──
export const mockClassrooms: ClassroomInfo[] = [
  {
    classId: 'c1',
    className: 'Lớp 9A1',
    grade: 'Khối 9',
    schoolYear: '2025-2026',
    roomNumber: 'P.201',
    teacherId: 't001',
    teacherName: 'Nguyễn Thị Lan',
    studentCount: 35,
    cameraId: 'cam_class_001',
    cameraName: 'Camera Lớp 9A1',
  },
  {
    classId: 'c2',
    className: 'Lớp 9A2',
    grade: 'Khối 9',
    schoolYear: '2025-2026',
    roomNumber: 'P.202',
    teacherId: 't002',
    teacherName: 'Trần Văn Minh',
    studentCount: 33,
    cameraId: 'cam_class_002',
    cameraName: 'Camera Lớp 9A2',
  },
  {
    classId: 'c3',
    className: 'Lớp 10B1',
    grade: 'Khối 10',
    schoolYear: '2025-2026',
    roomNumber: 'P.301',
    teacherId: 't001',
    teacherName: 'Nguyễn Thị Lan',
    studentCount: 38,
    cameraId: 'cam_class_003',
    cameraName: 'Camera Lớp 10B1',
  },
  {
    classId: 'c4',
    className: 'Lớp 10B2',
    grade: 'Khối 10',
    schoolYear: '2025-2026',
    roomNumber: 'P.302',
    teacherId: 't003',
    teacherName: 'Lê Thị Hoa',
    studentCount: 36,
  },
  {
    classId: 'c5',
    className: 'Lớp 11C1',
    grade: 'Khối 11',
    schoolYear: '2025-2026',
    roomNumber: 'P.401',
    teacherId: 't004',
    teacherName: 'Phạm Văn Đức',
    studentCount: 34,
  },
  {
    classId: 'c6',
    className: 'Lớp 12D1',
    grade: 'Khối 12',
    schoolYear: '2025-2026',
    roomNumber: 'P.501',
    teacherId: 't002',
    teacherName: 'Trần Văn Minh',
    studentCount: 32,
    cameraId: 'cam_class_006',
    cameraName: 'Camera Lớp 12D1',
  },
]

// ── Mock Camera Assignments ──
export const mockCameraAssignments: ClassroomCamera[] = [
  // Classroom Cameras
  {
    id: 'cam_class_001',
    name: 'Camera Lớp 9A1',
    rtspUrl: 'rtsp://admin:Admin123@192.168.1.101:554/stream1',
    brand: 'HikVision',
    location: 'Phòng 201 - Tầng 2 - Tòa A',
    locationType: 'classroom',
    assignedTo: 'c1',
    classId: 'c1',
    roomNumber: 'P.201',
    status: 'online',
    streamId: 'class_c1',
    isActive: true,
    lastChecked: '2026-03-15T22:30:00+07:00',
  },
  {
    id: 'cam_class_002',
    name: 'Camera Lớp 9A2',
    rtspUrl: 'rtsp://admin:Admin123@192.168.1.102:554/stream1',
    brand: 'HikVision',
    location: 'Phòng 202 - Tầng 2 - Tòa A',
    locationType: 'classroom',
    assignedTo: 'c2',
    classId: 'c2',
    roomNumber: 'P.202',
    status: 'online',
    streamId: 'class_c2',
    isActive: true,
    lastChecked: '2026-03-15T22:30:00+07:00',
  },
  {
    id: 'cam_class_003',
    name: 'Camera Lớp 10B1',
    rtspUrl: 'rtsp://admin:Admin123@192.168.1.103:554/stream1',
    brand: 'KB Vision',
    location: 'Phòng 301 - Tầng 3 - Tòa A',
    locationType: 'classroom',
    assignedTo: 'c3',
    classId: 'c3',
    roomNumber: 'P.301',
    status: 'online',
    streamId: 'class_c3',
    isActive: true,
    lastChecked: '2026-03-15T22:30:00+07:00',
  },
  {
    id: 'cam_class_006',
    name: 'Camera Lớp 12D1',
    rtspUrl: 'rtsp://admin:Admin123@192.168.1.106:554/stream1',
    brand: 'HikVision',
    location: 'Phòng 501 - Tầng 5 - Tòa A',
    locationType: 'classroom',
    assignedTo: 'c6',
    classId: 'c6',
    roomNumber: 'P.501',
    status: 'offline',
    streamId: 'class_c6',
    isActive: true,
  },

  // Hallway Cameras
  {
    id: 'cam_hall_001',
    name: 'Camera Hành Lang Tầng 1',
    rtspUrl: 'rtsp://admin:Admin123@192.168.1.201:554/stream1',
    brand: 'Vivotek',
    location: 'Hành lang chính - Tầng 1 - Tòa A',
    locationType: 'hallway',
    assignedTo: 'hallway_1a',
    status: 'online',
    isActive: true,
    lastChecked: '2026-03-15T22:30:00+07:00',
  },
  {
    id: 'cam_hall_002',
    name: 'Camera Hành Lang Tầng 2',
    rtspUrl: 'rtsp://admin:Admin123@192.168.1.202:554/stream1',
    brand: 'Vivotek',
    location: 'Hành lang lớp học - Tầng 2 - Tòa A',
    locationType: 'hallway',
    assignedTo: 'hallway_2a',
    status: 'online',
    isActive: true,
    lastChecked: '2026-03-15T22:30:00+07:00',
  },

  // Entrance Cameras
  {
    id: 'cam_entrance_001',
    name: 'Camera Cổng Chính',
    rtspUrl: 'rtsp://admin:Admin123@192.168.1.210:554/stream1',
    brand: 'HikVision',
    location: 'Cổng chính trường - Lối vào',
    locationType: 'entrance',
    assignedTo: 'entrance_main',
    status: 'online',
    isActive: true,
    lastChecked: '2026-03-15T22:35:00+07:00',
  },

  // Lab Cameras
  {
    id: 'cam_lab_001',
    name: 'Camera Phòng TN Vật Lý',
    rtspUrl: 'rtsp://admin:Admin123@192.168.1.220:554/stream1',
    brand: 'KB Vision',
    location: 'Phòng thí nghiệm Vật Lý - Tầng 3 - Tòa B',
    locationType: 'lab',
    assignedTo: 'lab_physics',
    status: 'online',
    isActive: true,
    lastChecked: '2026-03-15T22:30:00+07:00',
  },
  {
    id: 'cam_lab_002',
    name: 'Camera Phòng TN Hoá Học',
    rtspUrl: 'rtsp://admin:Admin123@192.168.1.221:554/stream1',
    brand: 'KB Vision',
    location: 'Phòng thí nghiệm Hoá Học - Tầng 3 - Tòa B',
    locationType: 'lab',
    assignedTo: 'lab_chemistry',
    status: 'online',
    isActive: true,
    lastChecked: '2026-03-15T22:30:00+07:00',
  },
  {
    id: 'cam_lab_003',
    name: 'Camera Phòng Tin Học',
    rtspUrl: 'rtsp://admin:Admin123@192.168.1.222:554/stream1',
    brand: 'IMOU',
    location: 'Phòng Tin Học - Tầng 2 - Tòa B',
    locationType: 'lab',
    assignedTo: 'lab_cs',
    status: 'error',
    isActive: true,
  },

  // Library Camera
  {
    id: 'cam_library_001',
    name: 'Camera Thư Viện',
    rtspUrl: 'rtsp://admin:Admin123@192.168.1.230:554/stream1',
    brand: 'Ezviz',
    location: 'Thư viện - Tầng 1 - Tòa B',
    locationType: 'library',
    assignedTo: 'library_main',
    status: 'online',
    isActive: true,
    lastChecked: '2026-03-15T22:30:00+07:00',
  },

  // Gymnasium Camera
  {
    id: 'cam_gym_001',
    name: 'Camera Nhà Thi Đấu',
    rtspUrl: 'rtsp://admin:Admin123@192.168.1.240:554/stream1',
    brand: 'HikVision',
    location: 'Nhà thi đấu đa năng',
    locationType: 'gymnasium',
    assignedTo: 'gymnasium_main',
    status: 'online',
    isActive: true,
    lastChecked: '2026-03-15T22:30:00+07:00',
  },

  // Cafeteria Camera
  {
    id: 'cam_canteen_001',
    name: 'Camera Căn Tin',
    rtspUrl: 'rtsp://admin:Admin123@192.168.1.250:554/stream1',
    brand: 'Vantech',
    location: 'Căn tin học sinh - Tầng 1',
    locationType: 'cafeteria',
    assignedTo: 'cafeteria_main',
    status: 'online',
    isActive: true,
    lastChecked: '2026-03-15T22:30:00+07:00',
  },
]

// ── Mock School Locations ──
export const mockSchoolLocations: SchoolLocationInfo[] = [
  {
    locationId: 'hallway_1a',
    name: 'Hành lang chính - Tầng 1 - Tòa A',
    type: 'hallway',
    floor: '1',
    building: 'A',
    cameras: ['cam_hall_001'],
  },
  {
    locationId: 'hallway_2a',
    name: 'Hành lang lớp học - Tầng 2 - Tòa A',
    type: 'hallway',
    floor: '2',
    building: 'A',
    cameras: ['cam_hall_002'],
  },
  {
    locationId: 'entrance_main',
    name: 'Cổng chính trường',
    type: 'entrance',
    floor: '1',
    building: 'A',
    cameras: ['cam_entrance_001'],
  },
  {
    locationId: 'lab_physics',
    name: 'Phòng TN Vật Lý',
    type: 'lab',
    floor: '3',
    building: 'B',
    cameras: ['cam_lab_001'],
  },
  {
    locationId: 'lab_chemistry',
    name: 'Phòng TN Hoá Học',
    type: 'lab',
    floor: '3',
    building: 'B',
    cameras: ['cam_lab_002'],
  },
  {
    locationId: 'lab_cs',
    name: 'Phòng Tin Học',
    type: 'lab',
    floor: '2',
    building: 'B',
    cameras: ['cam_lab_003'],
  },
  {
    locationId: 'library_main',
    name: 'Thư viện trường',
    type: 'library',
    floor: '1',
    building: 'B',
    cameras: ['cam_library_001'],
  },
  {
    locationId: 'gymnasium_main',
    name: 'Nhà thi đấu đa năng',
    type: 'gymnasium',
    floor: '1',
    cameras: ['cam_gym_001'],
  },
  {
    locationId: 'cafeteria_main',
    name: 'Căn tin học sinh',
    type: 'cafeteria',
    floor: '1',
    cameras: ['cam_canteen_001'],
  },
]

// ── Helper Functions ──

/** Get camera by ID */
export function getCameraById(cameraId: string): ClassroomCamera | undefined {
  return mockCameraAssignments.find(cam => cam.id === cameraId)
}

/** Get camera assigned to a classroom */
export function getCameraForClass(classId: string): ClassroomCamera | undefined {
  return mockCameraAssignments.find(cam => cam.assignedTo === classId && cam.locationType === 'classroom')
}

/** Get all cameras for a location type */
export function getCamerasByType(type: ClassroomCamera['locationType']): ClassroomCamera[] {
  return mockCameraAssignments.filter(cam => cam.locationType === type && cam.isActive)
}

/** Get classrooms for a specific teacher */
export function getClassroomsForTeacher(teacherId: string): ClassroomInfo[] {
  return mockClassrooms.filter(cls => cls.teacherId === teacherId)
}

/** Get cameras for a specific teacher's classes */
export function getCamerasForTeacher(teacherId: string): ClassroomCamera[] {
  const teacherClasses = getClassroomsForTeacher(teacherId)
  const classIds = teacherClasses.map(cls => cls.classId)
  return mockCameraAssignments.filter(cam => cam.classId && classIds.includes(cam.classId))
}

/** Get classroom info by ID */
export function getClassroomById(classId: string): ClassroomInfo | undefined {
  return mockClassrooms.find(cls => cls.classId === classId)
}

/** Get all classrooms with cameras */
export function getClassroomsWithCameras(): ClassroomInfo[] {
  return mockClassrooms.filter(cls => cls.cameraId)
}

/** Get all classrooms without cameras */
export function getClassroomsWithoutCameras(): ClassroomInfo[] {
  return mockClassrooms.filter(cls => !cls.cameraId)
}

/** Get statistics */
export function getCameraStatistics() {
  const total = mockCameraAssignments.length
  const online = mockCameraAssignments.filter(cam => cam.status === 'online').length
  const offline = mockCameraAssignments.filter(cam => cam.status === 'offline').length
  const error = mockCameraAssignments.filter(cam => cam.status === 'error').length
  const assigned = mockCameraAssignments.filter(cam => cam.assignedTo).length
  const byType = {
    classroom: getCamerasByType('classroom').length,
    hallway: getCamerasByType('hallway').length,
    entrance: getCamerasByType('entrance').length,
    lab: getCamerasByType('lab').length,
    library: getCamerasByType('library').length,
    gymnasium: getCamerasByType('gymnasium').length,
    cafeteria: getCamerasByType('cafeteria').length,
    office: getCamerasByType('office').length,
    other: getCamerasByType('other').length,
  }

  return {
    total,
    online,
    offline,
    error,
    assigned,
    unassigned: total - assigned,
    byType,
  }
}
