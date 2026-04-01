"use client";

import { useState } from "react";
import Link from "next/link";
import { COUNTRY_NAMES } from "@/lib/regions";
import { distanceNm } from "@/lib/gpx/validator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type CourseRow = {
  id: string;
  name: string;
  country: string;
  startName: string;
  startLat: number;
  startLng: number;
  finishName: string;
  finishLat: number;
  finishLng: number;
  submittedAt: string;
  submittedBy: { name: string | null; email: string | null };
  approvalToken?: string | null;
  rejectionReason?: string | null;
};

interface Props {
  pendingCourses: CourseRow[];
  rejectedCourses: CourseRow[];
  isAdmin: boolean;
}

export function PendingCoursesClient({ pendingCourses, rejectedCourses, isAdmin }: Props) {
  const [selectedRejected, setSelectedRejected] = useState<CourseRow | null>(null);
  const [reopeningCourse, setReopeningCourse] = useState<string | null>(null);

  const handleReOpen = async (courseId: string) => {
    setReopeningCourse(courseId);
    try {
      const response = await fetch(`/api/courses/${courseId}/reopen`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        alert(`Failed to re-open course: ${error.message || 'Unknown error'}`);
        return;
      }

      // Refresh the page to show updated status
      window.location.reload();
    } catch {
      alert('Network error while re-opening course');
    } finally {
      setReopeningCourse(null);
    }
  };

  return (
    <>
      <PageHeader
        title="Course Submissions"
      />
      <div className="container mx-auto px-4 py-8 max-w-5xl">

      {/* PENDING TABLE */}
      <section className="mb-12">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-xl font-semibold">Awaiting Approval</h2>
          <Badge variant="secondary">{pendingCourses.length}</Badge>
        </div>
        {pendingCourses.length === 0 ? (
          <p className="text-muted-foreground text-sm py-8 text-center border rounded-lg">
            No courses pending approval.
          </p>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <Table className="min-w-full">
              <TableHeader>
                <TableRow>
                  <TableHead className="max-w-[200px]">Course</TableHead>
                  <TableHead className="w-24">Country</TableHead>
                  <TableHead className="w-20">Distance</TableHead>
                  <TableHead className="w-32">Submitted By</TableHead>
                  <TableHead className="w-24">Date</TableHead>
                  {isAdmin && <TableHead className="w-28">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingCourses.map((course) => (
                  <TableRow
                    key={course.id}
                    className={isAdmin && course.approvalToken ? "cursor-pointer hover:bg-muted/50" : ""}
                    onClick={() => {
                      if (isAdmin && course.approvalToken) {
                        window.location.href = `/admin/approve-course?token=${course.approvalToken}`;
                      }
                    }}
                  >
                    <TableCell className="max-w-[200px]">
                      <div className="font-medium truncate" title={course.name}>{course.name}</div>
                      <div className="text-xs text-muted-foreground truncate" title={`${course.startName} → ${course.finishName}`}>
                        {course.startName} → {course.finishName}
                      </div>
                    </TableCell>
                    <TableCell className="w-24 truncate" title={COUNTRY_NAMES[course.country] ?? course.country}>
                      {COUNTRY_NAMES[course.country] ?? course.country}
                    </TableCell>
                    <TableCell className="w-20 font-mono text-sm tabular-nums">
                      {distanceNm(course.startLat, course.startLng, course.finishLat, course.finishLng)} nm
                    </TableCell>
                    <TableCell className="w-32">
                      <div className="text-sm truncate" title={course.submittedBy.name ?? ''}>{course.submittedBy.name}</div>
                      <div className="text-xs text-muted-foreground truncate" title={course.submittedBy.email ?? ''}>{course.submittedBy.email}</div>
                    </TableCell>
                    <TableCell className="w-24 text-sm text-muted-foreground whitespace-nowrap">
                      {new Date(course.submittedAt).toLocaleDateString()}
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="w-28" onClick={(e) => e.stopPropagation()}>
                        {course.approvalToken ? (
                          <Button asChild size="sm" className="bg-green-600 hover:bg-green-700 text-white whitespace-nowrap min-w-[80px]">
                            <Link href={`/admin/approve-course?token=${course.approvalToken}`}>
                              Review →
                            </Link>
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">No token</span>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
              </Table>
            </div>
          </div>
        )}
      </section>

      {/* REJECTED TABLE */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-xl font-semibold">Rejected</h2>
          <Badge variant="destructive">{rejectedCourses.length}</Badge>
        </div>
        {rejectedCourses.length === 0 ? (
          <p className="text-muted-foreground text-sm py-8 text-center border rounded-lg">
            No rejected courses.
          </p>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <Table className="min-w-full">
              <TableHeader>
                <TableRow>
                  <TableHead className="max-w-[200px]">Course</TableHead>
                  <TableHead className="w-24">Country</TableHead>
                  <TableHead className="w-32">Submitted By</TableHead>
                  <TableHead className="w-24">Date</TableHead>
                  <TableHead className="w-32">Rejection Reason</TableHead>
                  {isAdmin && <TableHead className="w-28">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rejectedCourses.map((course) => (
                  <TableRow
                    key={course.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedRejected(course)}
                  >
                    <TableCell className="max-w-[200px]">
                      <div className="font-medium truncate" title={course.name}>{course.name}</div>
                      <div className="text-xs text-muted-foreground truncate" title={`${course.startName} → ${course.finishName}`}>
                        {course.startName} → {course.finishName}
                      </div>
                    </TableCell>
                    <TableCell className="w-24 truncate" title={COUNTRY_NAMES[course.country] ?? course.country}>
                      {COUNTRY_NAMES[course.country] ?? course.country}
                    </TableCell>
                    <TableCell className="w-32">
                      <div className="text-sm truncate" title={course.submittedBy.name ?? ''}>{course.submittedBy.name}</div>
                      <div className="text-xs text-muted-foreground truncate" title={course.submittedBy.email ?? ''}>{course.submittedBy.email}</div>
                    </TableCell>
                    <TableCell className="w-24 text-sm text-muted-foreground whitespace-nowrap">
                      {new Date(course.submittedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="w-32">
                      <p
                        className="text-sm text-muted-foreground truncate cursor-help"
                        title={course.rejectionReason ?? "No reason provided"}
                      >
                        {course.rejectionReason ?? "—"}
                      </p>
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="w-28">
                        <Button
                          size="sm"
                          className="bg-orange-600 hover:bg-orange-700 text-white whitespace-nowrap min-w-[80px]"
                          onClick={() => handleReOpen(course.id)}
                          disabled={reopeningCourse === course.id}
                        >
                          {reopeningCourse === course.id ? "Re-Opening..." : "Re-Open"}
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
              </Table>
            </div>
          </div>
        )}
      </section>

      {/* REJECTION DETAIL MODAL */}
      {selectedRejected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setSelectedRejected(null)}
        >
          <div
            className="bg-background rounded-lg border shadow-lg max-w-lg w-full mx-4 p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">
                Rejected Course
              </p>
              <h3 className="text-xl font-semibold">{selectedRejected.name}</h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                {selectedRejected.startName} → {selectedRejected.finishName}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
                Reason for Rejection
              </p>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {selectedRejected.rejectionReason ?? "No reason provided."}
              </p>
            </div>
            <div className="flex justify-end pt-2">
              <Button variant="outline" onClick={() => setSelectedRejected(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  );
}
