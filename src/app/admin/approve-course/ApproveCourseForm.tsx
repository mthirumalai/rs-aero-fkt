"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { EditableLineMap } from "@/components/map/EditableLineMap";

interface CourseData {
  id: string;
  name: string;
  description: string | null;
  country: string;
  courseType: "ONE_WAY" | "OUT_AND_BACK";
  startName: string;
  startLat: number;
  startLng: number;
  startType: "POINT" | "LINE";
  startLine2Lat: number | null;
  startLine2Lng: number | null;
  finishName: string;
  finishLat: number;
  finishLng: number;
  finishType: "POINT" | "LINE";
  finishLine2Lat: number | null;
  finishLine2Lng: number | null;
  turningMarkName: string | null;
  turningMarkLat: number | null;
  turningMarkLng: number | null;
}

interface Props {
  courseId: string;
  token: string;
  courseData: CourseData;
}

export function ApproveCourseForm({ courseId, token, courseData }: Props) {
  const [loading, setLoading] = useState<"approve" | "reject" | "save" | null>(null);
  const [result, setResult] = useState<"approved" | "rejected" | "saved" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const router = useRouter();

  // Editable course state
  const [editedCourse, setEditedCourse] = useState<CourseData>(courseData);
  const [hasChanges, setHasChanges] = useState(false);

  function updateField<K extends keyof CourseData>(field: K, value: CourseData[K]) {
    setEditedCourse(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  }

  function updateCoordinates(
    pointType: "start" | "finish",
    lat: number,
    lng: number,
    lat2?: number,
    lng2?: number
  ) {
    if (pointType === "start") {
      setEditedCourse(prev => ({
        ...prev,
        startLat: lat,
        startLng: lng,
        startLine2Lat: lat2 || null,
        startLine2Lng: lng2 || null,
      }));
    } else {
      setEditedCourse(prev => ({
        ...prev,
        finishLat: lat,
        finishLng: lng,
        finishLine2Lat: lat2 || null,
        finishLine2Lng: lng2 || null,
      }));
    }
    setHasChanges(true);
  }

  async function handleSave() {
    setLoading("save");
    setError(null);
    try {
      const res = await fetch(`/api/courses/${courseId}/update`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, ...editedCourse }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to update course");
        return;
      }
      setResult("saved");
      setHasChanges(false);
      setTimeout(() => {
        setResult(null);
        setShowEditForm(false);
        window.location.reload(); // Refresh to show updated data
      }, 1500);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(null);
    }
  }

  async function handleAction(action: "approve" | "reject") {
    setLoading(action);
    setError(null);
    try {
      const res = await fetch(`/api/courses/${courseId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, action, rejectionReason }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Something went wrong");
        return;
      }
      setResult(action === "approve" ? "approved" : "rejected");
      if (action === "approve") {
        setTimeout(() => router.push(`/courses/${courseId}`), 2000);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(null);
    }
  }

  if (result === "approved" || result === "rejected") {
    return (
      <div className={`text-center p-8 rounded-lg border ${
        result === "approved"
          ? "bg-green-50 border-green-200 text-green-800"
          : "bg-red-50 border-red-200 text-red-800"
      }`}>
        <p className="text-2xl font-bold mb-2">
          Route {result === "approved" ? "Approved" : "Rejected"}
        </p>
        {result === "approved"
          ? <p className="text-sm">Redirecting to route page...</p>
          : <p className="text-sm">The submitter has been notified by email.</p>
        }
      </div>
    );
  }

  if (result === "saved") {
    return (
      <div className="text-center p-8 rounded-lg border bg-blue-50 border-blue-200 text-blue-800">
        <p className="text-2xl font-bold mb-2">Changes Saved</p>
        <p className="text-sm">Course updated successfully. Refreshing...</p>
      </div>
    );
  }

  if (showRejectForm) {
    return (
      <div className="border border-red-200 rounded-lg p-6 bg-red-50 space-y-4">
        <h3 className="font-semibold text-red-800 text-lg">Reject Route</h3>
        <p className="text-sm text-red-700">
          Explain why this route is being rejected and what the submitter should do to fix it.
          This message will be emailed to them directly.
        </p>
        <div className="space-y-2">
          <Label htmlFor="rejectionReason" className="text-red-800">
            Reason & instructions *
          </Label>
          <Textarea
            id="rejectionReason"
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="e.g. The start coordinates appear to be on land rather than at the water's edge. Please adjust to the exact lat/long of the harbour entrance buoy."
            rows={6}
            className="bg-white"
          />
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <div className="flex gap-3">
          <Button
            onClick={() => handleAction("reject")}
            disabled={!!loading || !rejectionReason.trim()}
            variant="destructive"
            size="lg"
            className="flex-1"
          >
            {loading === "reject" ? "Sending..." : "✗ Confirm Rejection & Notify Submitter"}
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={() => { setShowRejectForm(false); setError(null); }}
            disabled={!!loading}
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  if (showEditForm) {
    return (
      <div className="space-y-6 border border-blue-200 rounded-lg p-6 bg-blue-50">
        <h3 className="font-semibold text-blue-800 text-lg">Edit Course Details</h3>

        {/* Basic Info */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Course Name *</Label>
            <Input
              id="name"
              value={editedCourse.name}
              onChange={(e) => updateField("name", e.target.value)}
              className="bg-white"
            />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={editedCourse.description || ""}
              onChange={(e) => updateField("description", e.target.value)}
              className="bg-white"
              rows={3}
            />
          </div>
        </div>

        {/* Start Point Editing */}
        <div className="space-y-4">
          <h4 className="font-medium text-blue-800">Start Point</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startName">Start Name *</Label>
              <Input
                id="startName"
                value={editedCourse.startName}
                onChange={(e) => updateField("startName", e.target.value)}
                className="bg-white"
              />
            </div>
            <div>
              <Label>Type</Label>
              <div className="flex gap-4 mt-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="startType"
                    value="POINT"
                    checked={editedCourse.startType === "POINT"}
                    onChange={(e) => updateField("startType", e.target.value as "POINT" | "LINE")}
                  />
                  <span>Point</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="startType"
                    value="LINE"
                    checked={editedCourse.startType === "LINE"}
                    onChange={(e) => updateField("startType", e.target.value as "POINT" | "LINE")}
                  />
                  <span>Line</span>
                </label>
              </div>
            </div>
          </div>

          <EditableLineMap
            type={editedCourse.startType}
            lat={editedCourse.startLat}
            lng={editedCourse.startLng}
            lat2={editedCourse.startLine2Lat || undefined}
            lng2={editedCourse.startLine2Lng || undefined}
            purpose="start"
            onLocationChange={(lat, lng, lat2, lng2) => updateCoordinates("start", lat, lng, lat2, lng2)}
          />
        </div>

        {/* Finish Point Editing (for ONE_WAY courses) */}
        {editedCourse.courseType === "ONE_WAY" && (
          <div className="space-y-4">
            <h4 className="font-medium text-blue-800">Finish Point</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="finishName">Finish Name *</Label>
                <Input
                  id="finishName"
                  value={editedCourse.finishName}
                  onChange={(e) => updateField("finishName", e.target.value)}
                  className="bg-white"
                />
              </div>
              <div>
                <Label>Type</Label>
                <div className="flex gap-4 mt-2">
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="finishType"
                      value="POINT"
                      checked={editedCourse.finishType === "POINT"}
                      onChange={(e) => updateField("finishType", e.target.value as "POINT" | "LINE")}
                    />
                    <span>Point</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="finishType"
                      value="LINE"
                      checked={editedCourse.finishType === "LINE"}
                      onChange={(e) => updateField("finishType", e.target.value as "POINT" | "LINE")}
                    />
                    <span>Line</span>
                  </label>
                </div>
              </div>
            </div>

            <EditableLineMap
              type={editedCourse.finishType}
              lat={editedCourse.finishLat}
              lng={editedCourse.finishLng}
              lat2={editedCourse.finishLine2Lat || undefined}
              lng2={editedCourse.finishLine2Lng || undefined}
              purpose="finish"
              onLocationChange={(lat, lng, lat2, lng2) => updateCoordinates("finish", lat, lng, lat2, lng2)}
            />
          </div>
        )}

        {/* Turning Mark Editing (for OUT_AND_BACK courses) */}
        {editedCourse.courseType === "OUT_AND_BACK" && (
          <div className="space-y-4">
            <h4 className="font-medium text-blue-800">Turning Mark</h4>
            <div>
              <Label htmlFor="turningMarkName">Turning Mark Name *</Label>
              <Input
                id="turningMarkName"
                value={editedCourse.turningMarkName || ""}
                onChange={(e) => updateField("turningMarkName", e.target.value)}
                className="bg-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="turningMarkLat">Latitude *</Label>
                <Input
                  id="turningMarkLat"
                  type="number"
                  step="any"
                  value={editedCourse.turningMarkLat || ""}
                  onChange={(e) => updateField("turningMarkLat", parseFloat(e.target.value) || null)}
                  className="bg-white"
                />
              </div>
              <div>
                <Label htmlFor="turningMarkLng">Longitude *</Label>
                <Input
                  id="turningMarkLng"
                  type="number"
                  step="any"
                  value={editedCourse.turningMarkLng || ""}
                  onChange={(e) => updateField("turningMarkLng", parseFloat(e.target.value) || null)}
                  className="bg-white"
                />
              </div>
            </div>
          </div>
        )}

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <div className="flex gap-3">
          <Button
            onClick={handleSave}
            disabled={!!loading || !hasChanges}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            size="lg"
          >
            {loading === "save" ? "Saving..." : "💾 Save Changes"}
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={() => {
              setShowEditForm(false);
              setEditedCourse(courseData);
              setHasChanges(false);
              setError(null);
            }}
            disabled={!!loading}
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Prominent Edit Button */}
      <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
        <h3 className="font-semibold text-blue-800 mb-2">Admin Actions</h3>
        <Button
          onClick={() => setShowEditForm(true)}
          disabled={!!loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white mb-3"
          size="lg"
        >
          ✏️ Edit Start/Finish Lines & Course Details
        </Button>
        <p className="text-sm text-blue-700">
          Click above to adjust coordinates, change point/line types, or edit course information before approving.
        </p>
      </div>

      {/* Approval/Rejection Buttons */}
      <div className="flex gap-4">
        <Button
          onClick={() => handleAction("approve")}
          disabled={!!loading}
          className="flex-1 bg-green-600 hover:bg-green-700 text-white"
          size="lg"
        >
          {loading === "approve" ? "Approving..." : "✓ Approve Route"}
        </Button>
        <Button
          onClick={() => setShowRejectForm(true)}
          disabled={!!loading}
          variant="destructive"
          className="flex-1"
          size="lg"
        >
          ✗ Reject Route
        </Button>
      </div>
      {error && <p className="text-red-600 text-sm">{error}</p>}
    </div>
  );
}
