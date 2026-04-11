import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(
  req: NextRequest,
  { params }: { params: { courseId: string } }
) {
  const {
    token,
    name,
    description,
    country,
    startName,
    startLat,
    startLng,
    startType,
    startLine2Lat,
    startLine2Lng,
    finishName,
    finishLat,
    finishLng,
    finishType,
    finishLine2Lat,
    finishLine2Lng,
    turningMarkName,
    turningMarkLat,
    turningMarkLng
  } = await req.json();

  if (!token) {
    return NextResponse.json({ error: "Token required" }, { status: 400 });
  }

  // Verify the course exists and token is valid
  const course = await prisma.course.findFirst({
    where: { id: params.courseId, approvalToken: token },
  });

  if (!course) {
    return NextResponse.json({ error: "Invalid or already used token" }, { status: 404 });
  }

  if (course.status !== "PENDING") {
    return NextResponse.json({ error: "Course has already been processed" }, { status: 400 });
  }

  // Validate required fields
  if (!name?.trim() || !startName?.trim()) {
    return NextResponse.json({ error: "Course name and start point name are required" }, { status: 400 });
  }

  if (!startLat || !startLng) {
    return NextResponse.json({ error: "Start coordinates are required" }, { status: 400 });
  }

  // For ONE_WAY courses, finish point is required
  if (course.courseType === "ONE_WAY") {
    if (!finishName?.trim() || !finishLat || !finishLng) {
      return NextResponse.json({ error: "Finish point is required for one-way courses" }, { status: 400 });
    }
  }

  // For OUT_AND_BACK courses, turning mark is required
  if (course.courseType === "OUT_AND_BACK") {
    if (!turningMarkName?.trim() || !turningMarkLat || !turningMarkLng) {
      return NextResponse.json({ error: "Turning mark is required for out-and-back courses" }, { status: 400 });
    }
  }

  try {
    const updatedCourse = await prisma.course.update({
      where: { id: params.courseId },
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        country,
        startName: startName.trim(),
        startLat: parseFloat(startLat),
        startLng: parseFloat(startLng),
        startType: startType || "POINT",
        startLine2Lat: startType === "LINE" && startLine2Lat ? parseFloat(startLine2Lat) : null,
        startLine2Lng: startType === "LINE" && startLine2Lng ? parseFloat(startLine2Lng) : null,
        ...(course.courseType === "ONE_WAY" && {
          finishName: finishName?.trim(),
          finishLat: finishLat ? parseFloat(finishLat) : course.finishLat,
          finishLng: finishLng ? parseFloat(finishLng) : course.finishLng,
          finishType: finishType || "POINT",
          finishLine2Lat: finishType === "LINE" && finishLine2Lat ? parseFloat(finishLine2Lat) : null,
          finishLine2Lng: finishType === "LINE" && finishLine2Lng ? parseFloat(finishLine2Lng) : null,
        }),
        ...(course.courseType === "OUT_AND_BACK" && {
          turningMarkName: turningMarkName?.trim(),
          turningMarkLat: turningMarkLat ? parseFloat(turningMarkLat) : course.turningMarkLat,
          turningMarkLng: turningMarkLng ? parseFloat(turningMarkLng) : course.turningMarkLng,
          // For out-and-back, finish is same as start
          finishName: startName.trim(),
          finishLat: parseFloat(startLat),
          finishLng: parseFloat(startLng),
          finishType: startType || "POINT",
          finishLine2Lat: startType === "LINE" && startLine2Lat ? parseFloat(startLine2Lat) : null,
          finishLine2Lng: startType === "LINE" && startLine2Lng ? parseFloat(startLine2Lng) : null,
        }),
      },
      include: {
        submittedBy: { select: { name: true, email: true } }
      }
    });

    return NextResponse.json({
      success: true,
      course: updatedCourse
    });
  } catch (error) {
    console.error("Error updating course:", error);
    return NextResponse.json({ error: "Failed to update course" }, { status: 500 });
  }
}