import { prisma } from "@/lib/prisma";
import { ApprovalPageWithEditing } from "./ApprovalPageWithEditing";
import { ApprovalMap } from "@/components/map/ApprovalMap";
import { PageHeader } from "@/components/PageHeader";
import { COUNTRY_NAMES } from "@/lib/regions";
import { distanceNm } from "@/lib/gpx/validator";
import { getRejectionHistory } from "@/lib/course-status-history";

interface Props {
  searchParams: { token?: string; action?: string };
}

export default async function ApproveCoursePage({ searchParams }: Props) {
  const { token } = searchParams;

  if (!token) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-red-600">Invalid Link</h1>
        <p className="text-muted-foreground mt-2">No approval token provided.</p>
      </div>
    );
  }

  const [course, rejectionHistory] = await Promise.all([
    prisma.course.findFirst({
      where: { approvalToken: token },
      select: {
        id: true,
        name: true,
        description: true,
        country: true,
        courseType: true,
        startName: true,
        startLat: true,
        startLng: true,
        finishName: true,
        finishLat: true,
        finishLng: true,
        turningMarkName: true,
        turningMarkLat: true,
        turningMarkLng: true,
        submittedAt: true,
        status: true,
        submittedBy: { select: { name: true, email: true } },
      },
    }),
    // Get rejection history to show admin context
    token ? getRejectionHistory(
      (await prisma.course.findFirst({
        where: { approvalToken: token },
        select: { id: true }
      }))?.id ?? ""
    ) : []
  ]);

  if (!course) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-red-600">Invalid or Used Token</h1>
        <p className="text-muted-foreground mt-2">
          This link has already been used or is invalid.
        </p>
      </div>
    );
  }

  if (course.status !== "PENDING") {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">Course Already Processed</h1>
        <p className="text-muted-foreground mt-2">
          This course has already been <strong>{course.status.toLowerCase()}</strong>.
        </p>
      </div>
    );
  }

  return (
    <>
      <PageHeader title="Course Approval Request" />
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      <h1 className="font-display text-5xl uppercase tracking-wide mb-8">
        Approval Request for Course: <span className="text-primary">{course.name}</span>
      </h1>

      {/* Course Information */}
      <div className="bg-card border rounded-lg p-6 space-y-5 mb-8">
        {course.description && (
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Description</p>
            <p className="text-base">{course.description}</p>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Country</p>
            <p className="text-base font-medium">{COUNTRY_NAMES[course.country] ?? course.country}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Distance</p>
            <p className="text-base font-medium">
              {course.courseType === "OUT_AND_BACK" && course.turningMarkLat && course.turningMarkLng
                ? distanceNm(course.startLat, course.startLng, course.turningMarkLat, course.turningMarkLng) + " nm"
                : distanceNm(course.startLat, course.startLng, course.finishLat, course.finishLng) + " nm"
              }
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Submitted by</p>
            <p className="text-base font-medium">{course.submittedBy.name}</p>
            <p className="text-sm text-muted-foreground">{course.submittedBy.email}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Submission Date</p>
            <p className="text-base">{new Date(course.submittedAt).toLocaleString()}</p>
          </div>
        </div>

        {/* Rejection History */}
        {rejectionHistory.length > 0 && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <h4 className="font-semibold text-red-800 mb-3">Previous Rejections</h4>
            <div className="space-y-3">
              {rejectionHistory.map((rejection, index) => (
                <div key={rejection.id} className="text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-red-700">
                      Rejection #{rejectionHistory.length - index}
                    </span>
                    <span className="text-red-600">
                      {new Date(rejection.changedAt).toLocaleString()}
                    </span>
                  </div>
                  {rejection.changedBy && (
                    <div className="text-red-600 text-xs">
                      by {rejection.changedBy.name || rejection.changedBy.email}
                    </div>
                  )}
                  <div className="mt-1 p-2 bg-white border border-red-200 rounded text-red-800">
                    {rejection.reason || "No reason provided"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <ApprovalPageWithEditing
        course={{
          id: course.id,
          name: course.name,
          courseType: course.courseType,
          startName: course.startName,
          startLat: course.startLat,
          startLng: course.startLng,
          finishName: course.finishName,
          finishLat: course.finishLat,
          finishLng: course.finishLng,
          turningMarkName: course.turningMarkName,
          turningMarkLat: course.turningMarkLat,
          turningMarkLng: course.turningMarkLng,
        }}
        token={token}
      />
    </div>

    {/* Full-width course map */}
    <div className="w-full mt-8">
      <div className="container mx-auto px-4 py-6">
        <h3 className="text-xl font-semibold mb-6">Complete Course</h3>
        <div className="h-[500px]">
          <ApprovalMap
            startLat={course.startLat}
            startLng={course.startLng}
            finishLat={course.finishLat}
            finishLng={course.finishLng}
            startName={course.startName}
            finishName={course.finishName}
            courseType={course.courseType}
            turningMarkLat={course.turningMarkLat}
            turningMarkLng={course.turningMarkLng}
            turningMarkName={course.turningMarkName}
          />
        </div>
      </div>
    </div>
    </>
  );
}
