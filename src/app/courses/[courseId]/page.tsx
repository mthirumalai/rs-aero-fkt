import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { COUNTRY_NAMES } from "@/lib/regions";
import { distanceNm } from "@/lib/gpx/validator";
import { CourseMap } from "@/components/map/CourseMap";
import { PointMap } from "@/components/map/PointMap";
import { FktAttemptsTable } from "@/components/tables/FktAttemptsTable";
import { getPublicPhotoUrl as getPhotoUrl } from "@/lib/storage";

interface Props {
  params: { courseId: string };
}

export async function generateMetadata({ params }: Props) {
  const course = await prisma.course.findUnique({ where: { id: params.courseId } });
  if (!course) return {};
  return { title: `${course.name} — RS Aero FKT` };
}

export default async function CourseDetailPage({ params }: Props) {
  const course = await prisma.course.findUnique({
    where: { id: params.courseId },
    include: {
      submittedBy: { select: { id: true, name: true } },
      photos: true,
      attempts: {
        where: { status: "APPROVED" },
        orderBy: { durationSec: "asc" },
        select: {
          id: true,
          rigSize: true,
          date: true,
          durationSec: true,
          avgSogKnots: true,
          maxSogKnots: true,
          sailorName: true,
          athlete: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!course) notFound();

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Link href="/courses" className="hover:underline">Courses</Link>
            <span>/</span>
            <span>{course.name}</span>
          </div>
          <h1 className="text-3xl font-bold">{course.name}</h1>
          <div className="flex items-center gap-3 mt-2">
            <Badge variant="secondary">
              {COUNTRY_NAMES[course.country] ?? course.country}
            </Badge>
            {course.status === "PENDING" && (
              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                Pending Approval
              </Badge>
            )}
            {course.approvedAt && (
              <span className="text-sm text-muted-foreground">
                Approved {new Date(course.approvedAt).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
        {course.status === "APPROVED" && (
          <Button asChild>
            <Link href={`/courses/${course.id}/submit-fkt`}>Submit an FKT</Link>
          </Button>
        )}
      </div>

      {/* Description */}
      {course.description && (
        <p className="text-muted-foreground mb-6">{course.description}</p>
      )}

      {/* Pending course notice */}
      {course.status === "PENDING" && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <h3 className="font-medium text-yellow-800 mb-1">Course Pending Approval</h3>
          <p className="text-sm text-yellow-700">
            This course is currently under review by an administrator. Once approved, sailors will be able to submit FKT attempts.
          </p>
        </div>
      )}

      {/* Course Details */}
      <div className="border rounded-lg p-4 space-y-3 mb-6">
        <h2 className="font-semibold">Course Details</h2>
        {course.courseType === "OUT_AND_BACK" ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Start/Finish</p>
                <p className="font-medium">{course.startName}</p>
                <p className="font-mono text-xs text-muted-foreground">
                  {course.startType === "LINE" ? "Line: " : "Point: "}
                  {course.startLat.toFixed(6)}, {course.startLng.toFixed(6)}
                  {course.startType === "LINE" && course.startLine2Lat && course.startLine2Lng && (
                    <> ↔ {course.startLine2Lat.toFixed(6)}, {course.startLine2Lng.toFixed(6)}</>
                  )}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Turning Mark</p>
                <p className="font-medium">{course.turningMarkName}</p>
                <p className="font-mono text-xs text-muted-foreground">
                  {course.turningMarkLat?.toFixed(6)}, {course.turningMarkLng?.toFixed(6)}
                </p>
              </div>
            </div>
            <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
              🔄 Out-and-back route: Start and finish at {course.startName}, round the turning mark at {course.turningMarkName}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Start</p>
              <p className="font-medium">{course.startName}</p>
              <p className="font-mono text-xs text-muted-foreground">
                {course.startType === "LINE" ? "Line: " : "Point: "}
                {course.startLat.toFixed(6)}, {course.startLng.toFixed(6)}
                {course.startType === "LINE" && course.startLine2Lat && course.startLine2Lng && (
                  <> ↔ {course.startLine2Lat.toFixed(6)}, {course.startLine2Lng.toFixed(6)}</>
                )}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Finish</p>
              <p className="font-medium">{course.finishName}</p>
              <p className="font-mono text-xs text-muted-foreground">
                {course.finishType === "LINE" ? "Line: " : "Point: "}
                {course.finishLat.toFixed(6)}, {course.finishLng.toFixed(6)}
                {course.finishType === "LINE" && course.finishLine2Lat && course.finishLine2Lng && (
                  <> ↔ {course.finishLine2Lat.toFixed(6)}, {course.finishLine2Lng.toFixed(6)}</>
                )}
              </p>
            </div>
          </div>
        )}
        <div className="text-sm">
          <span className="text-muted-foreground">
            {course.courseType === "OUT_AND_BACK" ? "Total distance: " : "Great-circle distance: "}
          </span>
          <span className="font-medium">
            {course.courseType === "OUT_AND_BACK" && course.turningMarkLat && course.turningMarkLng
              ? (2 * distanceNm(course.startLat, course.startLng, course.turningMarkLat, course.turningMarkLng)).toFixed(1) + " nm"
              : distanceNm(course.startLat, course.startLng, course.finishLat, course.finishLng) + " nm"
            }
          </span>
        </div>
        <div className="text-sm">
          <span className="text-muted-foreground">Submitted by: </span>
          <Link
            href={`/athletes/${course.submittedBy.id}`}
            className="font-medium text-primary hover:underline"
          >
            {course.submittedBy.name}
          </Link>
        </div>
      </div>

      {/* Full Width Course Map */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-4">Complete Course</h3>
        <div className="h-[400px] rounded-lg overflow-hidden border">
          <CourseMap
            startLat={course.startLat}
            startLng={course.startLng}
            finishLat={course.finishLat}
            finishLng={course.finishLng}
            startName={course.startName}
            finishName={course.finishName}
            courseType={course.courseType}
            startType={course.startType}
            startLine2Lat={course.startLine2Lat}
            startLine2Lng={course.startLine2Lng}
            finishType={course.finishType}
            finishLine2Lat={course.finishLine2Lat}
            finishLine2Lng={course.finishLine2Lng}
            turningMarkLat={course.turningMarkLat || undefined}
            turningMarkLng={course.turningMarkLng || undefined}
            turningMarkName={course.turningMarkName || undefined}
          />
        </div>
      </div>

      {/* Point Maps - different layout for out-and-back vs one-way */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div>
          <h3 className="text-lg font-semibold mb-4">
            {course.courseType === "OUT_AND_BACK" ? "Start / Finish Point" : "Start Point"}: {course.startName}
          </h3>
          <p className="text-sm text-muted-foreground mb-4 font-mono">
            {course.startType === "LINE" ? "Line: " : "Point: "}
            {course.startLat.toFixed(6)}, {course.startLng.toFixed(6)}
            {course.startType === "LINE" && course.startLine2Lat && course.startLine2Lng && (
              <> ↔ {course.startLine2Lat.toFixed(6)}, {course.startLine2Lng.toFixed(6)}</>
            )}
          </p>
          <div className="h-[300px] rounded-lg overflow-hidden border">
            <PointMap
              lat={course.startLat}
              lng={course.startLng}
              name={course.startName}
              type="start"
              pointType={course.startType}
              lat2={course.startLine2Lat || undefined}
              lng2={course.startLine2Lng || undefined}
            />
          </div>
        </div>
        <div>
          {course.courseType === "OUT_AND_BACK" ? (
            // For out-and-back: show turning mark
            course.turningMarkLat && course.turningMarkLng && course.turningMarkName ? (
              <>
                <h3 className="text-lg font-semibold mb-4">Turning Mark: {course.turningMarkName}</h3>
                <p className="text-sm text-muted-foreground mb-4 font-mono">
                  {course.turningMarkLat.toFixed(6)}, {course.turningMarkLng.toFixed(6)}
                </p>
                <div className="h-[300px] rounded-lg overflow-hidden border">
                  <PointMap
                    lat={course.turningMarkLat}
                    lng={course.turningMarkLng}
                    name={course.turningMarkName}
                    type="turning"
                  />
                </div>
              </>
            ) : (
              <div className="h-[300px] rounded-lg overflow-hidden border bg-muted flex items-center justify-center">
                <p className="text-muted-foreground">No turning mark defined</p>
              </div>
            )
          ) : (
            // For one-way: show finish point
            <>
              <h3 className="text-lg font-semibold mb-4">Finish Point: {course.finishName}</h3>
              <p className="text-sm text-muted-foreground mb-4 font-mono">
                {course.finishType === "LINE" ? "Line: " : "Point: "}
                {course.finishLat.toFixed(6)}, {course.finishLng.toFixed(6)}
                {course.finishType === "LINE" && course.finishLine2Lat && course.finishLine2Lng && (
                  <> ↔ {course.finishLine2Lat.toFixed(6)}, {course.finishLine2Lng.toFixed(6)}</>
                )}
              </p>
              <div className="h-[300px] rounded-lg overflow-hidden border">
                <PointMap
                  lat={course.finishLat}
                  lng={course.finishLng}
                  name={course.finishName}
                  type="end"
                  pointType={course.finishType}
                  lat2={course.finishLine2Lat || undefined}
                  lng2={course.finishLine2Lng || undefined}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Photos */}
      {course.photos.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Route Photos</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {course.photos.map((photo) => (
              <div key={photo.id} className="aspect-video rounded-lg overflow-hidden bg-muted">
                <img
                  src={getPhotoUrl(photo.s3Key)}
                  alt={photo.caption ?? "Route photo"}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FKT Attempts Table */}
      <div>
        <h2 className="text-xl font-semibold mb-4">FKT Attempts</h2>
        <FktAttemptsTable attempts={course.attempts} />
      </div>
    </div>
  );
}
