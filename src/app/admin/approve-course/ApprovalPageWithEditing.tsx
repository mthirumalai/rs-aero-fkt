"use client";

import { useState } from "react";
import { ApproveCourseFormWithEdit } from "./ApproveCourseFormWithEdit";
import { PointMap } from "@/components/map/PointMap";
import { CourseMap } from "@/components/map/CourseMap";
import { Button } from "@/components/ui/button";
import type { CourseType } from "@prisma/client";

interface CourseData {
  id: string;
  name: string;
  courseType: CourseType;
  startName: string;
  startLat: number;
  startLng: number;
  finishName: string;
  finishLat: number;
  finishLng: number;
  turningMarkName: string | null;
  turningMarkLat: number | null;
  turningMarkLng: number | null;
}

interface Props {
  course: CourseData;
  token: string;
}

export function ApprovalPageWithEditing({ course, token }: Props) {
  const [isEditingCoordinates, setIsEditingCoordinates] = useState(false);
  const [coordinateChanges, setCoordinateChanges] = useState<Record<string, number>>({});

  // Current coordinates (original + any changes)
  const currentCoordinates = {
    startLat: coordinateChanges.startLat ?? course.startLat,
    startLng: coordinateChanges.startLng ?? course.startLng,
    finishLat: coordinateChanges.finishLat ?? course.finishLat,
    finishLng: coordinateChanges.finishLng ?? course.finishLng,
    turningMarkLat: coordinateChanges.turningMarkLat ?? course.turningMarkLat,
    turningMarkLng: coordinateChanges.turningMarkLng ?? course.turningMarkLng,
  };

  const hasChanges = Object.keys(coordinateChanges).length > 0;

  const handleCoordinateChange = (
    type: 'start' | 'finish' | 'turningMark',
    lat: number,
    lng: number
  ) => {
    setCoordinateChanges(prev => ({
      ...prev,
      [`${type}Lat`]: lat,
      [`${type}Lng`]: lng,
    }));
  };

  const handleToggleEdit = () => {
    if (isEditingCoordinates && hasChanges) {
      // Confirm before canceling edits
      if (confirm("You have unsaved changes. Are you sure you want to cancel editing?")) {
        setIsEditingCoordinates(false);
        setCoordinateChanges({});
      }
    } else {
      setIsEditingCoordinates(!isEditingCoordinates);
    }
  };

  return (
    <>
      {/* Full Course Overview Map */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Course Overview</h2>
        <div className="h-[400px] rounded-lg overflow-hidden border">
          <CourseMap
            startLat={course.startLat}
            startLng={course.startLng}
            finishLat={course.finishLat}
            finishLng={course.finishLng}
            startName={course.startName}
            finishName={course.finishName}
            courseType={course.courseType}
            turningMarkLat={course.turningMarkLat || undefined}
            turningMarkLng={course.turningMarkLng || undefined}
            turningMarkName={course.turningMarkName || undefined}
          />
        </div>
      </div>

      {/* Edit Toggle Button */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Course Points</h3>
          {isEditingCoordinates && (
            <p className="text-sm text-muted-foreground">
              Drag markers to adjust coordinates. Changes will be applied when you approve the course.
            </p>
          )}
          {hasChanges && (
            <p className="text-sm text-orange-600 font-medium">
              ⚠️ Unsaved coordinate changes
            </p>
          )}
        </div>
        <Button
          onClick={handleToggleEdit}
          variant={isEditingCoordinates ? "outline" : "default"}
          size="sm"
        >
          {isEditingCoordinates ? "Done Editing" : "📍 Edit Coordinates"}
        </Button>
      </div>

      {/* Point Maps */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div>
          <h3 className="text-lg font-semibold mb-4">
            {course.courseType === "OUT_AND_BACK" ? "Start / Finish Point" : "Start Point"}: {course.startName}
          </h3>
          <p className="text-sm text-muted-foreground mb-4 font-mono">
            {currentCoordinates.startLat.toFixed(6)}, {currentCoordinates.startLng.toFixed(6)}
            {hasChanges && (coordinateChanges.startLat !== undefined || coordinateChanges.startLng !== undefined) && (
              <span className="text-orange-600 ml-1">(modified)</span>
            )}
          </p>
          <div className="h-[300px] rounded-lg overflow-hidden border">
            <PointMap
              lat={currentCoordinates.startLat}
              lng={currentCoordinates.startLng}
              name={course.startName}
              type="start"
              editable={isEditingCoordinates}
              onCoordinateChange={(lat, lng) => handleCoordinateChange('start', lat, lng)}
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
                  {currentCoordinates.turningMarkLat!.toFixed(6)}, {currentCoordinates.turningMarkLng!.toFixed(6)}
                  {hasChanges && (coordinateChanges.turningMarkLat !== undefined || coordinateChanges.turningMarkLng !== undefined) && (
                    <span className="text-orange-600 ml-1">(modified)</span>
                  )}
                </p>
                <div className="h-[300px] rounded-lg overflow-hidden border">
                  <PointMap
                    lat={currentCoordinates.turningMarkLat!}
                    lng={currentCoordinates.turningMarkLng!}
                    name={course.turningMarkName}
                    type="turning"
                    editable={isEditingCoordinates}
                    onCoordinateChange={(lat, lng) => handleCoordinateChange('turningMark', lat, lng)}
                  />
                </div>
              </>
            ) : (
              <div className="h-[300px] rounded-lg overflow-hidden border bg-muted flex items-center justify-center">
                <p className="text-muted-foreground">No turning mark defined</p>
              </div>
            )
          ) : (
            // For point-to-point: show finish point
            <>
              <h3 className="text-lg font-semibold mb-4">Finish Point: {course.finishName}</h3>
              <p className="text-sm text-muted-foreground mb-4 font-mono">
                {currentCoordinates.finishLat.toFixed(6)}, {currentCoordinates.finishLng.toFixed(6)}
                {hasChanges && (coordinateChanges.finishLat !== undefined || coordinateChanges.finishLng !== undefined) && (
                  <span className="text-orange-600 ml-1">(modified)</span>
                )}
              </p>
              <div className="h-[300px] rounded-lg overflow-hidden border">
                <PointMap
                  lat={currentCoordinates.finishLat}
                  lng={currentCoordinates.finishLng}
                  name={course.finishName}
                  type="end"
                  editable={isEditingCoordinates}
                  onCoordinateChange={(lat, lng) => handleCoordinateChange('finish', lat, lng)}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Approval Form */}
      <ApproveCourseFormWithEdit
        courseId={course.id}
        token={token}
        coordinateOverrides={hasChanges ? coordinateChanges : undefined}
      />
    </>
  );
}