import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { sendCourseApprovalEmail } from "@/lib/email/ses";
import { getCountriesForRegion, type Region } from "@/lib/regions";
import { randomUUID } from "crypto";
import { recordCourseStatusChange } from "@/lib/course-status-history";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const region = searchParams.get("region") as Region | null;

  const where: Record<string, unknown> = { status: "APPROVED" };

  if (region) {
    const countries = getCountriesForRegion(region);
    where.country = { in: countries };
  }

  const courses = await prisma.course.findMany({
    where,
    orderBy: { approvedAt: "desc" },
    include: {
      submittedBy: { select: { id: true, name: true } },
      _count: { select: { attempts: true } },
    },
  });

  return NextResponse.json(courses);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const {
    name,
    description,
    country,
    startName,
    finishName,
    startLat,
    startLng,
    finishLat,
    finishLng,
    courseType = "POINT_TO_POINT",
    turningMarkName,
    turningMarkLat,
    turningMarkLng
  } = body;

  if (!name || !country || !startName || !finishName || startLat == null || startLng == null || finishLat == null || finishLng == null) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Additional validation for out-and-back routes
  if (courseType === "OUT_AND_BACK") {
    if (!turningMarkName || turningMarkLat == null || turningMarkLng == null) {
      return NextResponse.json({ error: "Out-and-back routes require turning mark name and coordinates" }, { status: 400 });
    }
  }

  const approvalToken = randomUUID();

  const courseData = {
    name,
    description,
    country,
    startName,
    finishName,
    startLat: parseFloat(startLat),
    startLng: parseFloat(startLng),
    finishLat: parseFloat(finishLat),
    finishLng: parseFloat(finishLng),
    courseType: courseType as "POINT_TO_POINT" | "OUT_AND_BACK",
    submittedById: session.user.id,
    approvalToken,
    status: "PENDING" as const,
  };

  // Add turning mark data for out-and-back routes
  if (courseType === "OUT_AND_BACK") {
    Object.assign(courseData, {
      turningMarkName,
      turningMarkLat: parseFloat(turningMarkLat),
      turningMarkLng: parseFloat(turningMarkLng),
    });
  }

  const course = await prisma.course.create({
    data: courseData,
  });

  // Record the initial submission in status history
  await recordCourseStatusChange(
    course.id,
    null, // fromStatus (new course)
    "PENDING", // toStatus
    "Initial course submission",
    session.user.id, // changedById
    approvalToken
  );

  // Send approval email
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  try {
    await sendCourseApprovalEmail({
      courseId: course.id,
      courseName: course.name,
      submitterName: session.user.name ?? "Unknown",
      submitterEmail: session.user.email ?? "",
      approvalToken,
      baseUrl,
    });
  } catch (err) {
    console.error("Failed to send approval email:", err);
  }

  return NextResponse.json(course, { status: 201 });
}
