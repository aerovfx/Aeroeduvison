import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { mockCameraAssignments, mockClassrooms, getCamerasForTeacher } from "@/lib/camera/data"

export async function GET(request: Request) {
  try {
    // Get session to identify teacher
    const session = await getServerSession()
    
    // For now return all classroom cameras
    // In production, filter by teacher's assigned classes
    const classroomCameras = mockCameraAssignments
      .filter(cam => cam.locationType === 'classroom')
      .map(cam => {
        const classroom = mockClassrooms.find(cls => cls.classId === cam.classId)
        return {
          id: cam.id,
          name: cam.name,
          rtspUrl: cam.rtspUrl,
          brand: cam.brand,
          location: cam.location,
          locationType: cam.locationType,
          assignedTo: cam.assignedTo,
          classId: cam.classId,
          className: classroom?.className,
          roomNumber: cam.roomNumber || classroom?.roomNumber,
          status: cam.status,
          hlsUrl: cam.hlsUrl,
          streamId: cam.streamId,
          lastChecked: cam.lastChecked,
          studentCount: classroom?.studentCount,
        }
      })

    return NextResponse.json({
      cameras: classroomCameras,
      total: classroomCameras.length,
    })
  } catch (error: any) {
    console.error("Error fetching teacher cameras:", error)
    return NextResponse.json(
      { error: "Failed to fetch cameras" },
      { status: 500 }
    )
  }
}
