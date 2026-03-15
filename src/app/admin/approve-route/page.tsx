import { prisma } from "@/lib/prisma";
import { ApproveRouteForm } from "./ApproveRouteForm";
import { ApprovalMap } from "@/components/map/ApprovalMap";
import { PointMap } from "@/components/map/PointMap";
import { COUNTRY_NAMES } from "@/lib/regions";
import { distanceNm } from "@/lib/gpx/validator";
import { getRejectionHistory } from "@/lib/route-status-history";

interface Props {
  searchParams: { token?: string; action?: string };
}

export default async function ApproveRoutePage({ searchParams }: Props) {
  const { token } = searchParams;

  if (!token) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-red-600">Invalid Link</h1>
        <p className="text-muted-foreground mt-2">No approval token provided.</p>
      </div>
    );
  }

  const [route, rejectionHistory] = await Promise.all([
    prisma.route.findFirst({
      where: { approvalToken: token },
      include: { submittedBy: { select: { name: true, email: true } } },
    }),
    // Get rejection history to show admin context
    token ? getRejectionHistory(
      (await prisma.route.findFirst({
        where: { approvalToken: token },
        select: { id: true }
      }))?.id ?? ""
    ) : []
  ]);

  if (!route) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-red-600">Invalid or Used Token</h1>
        <p className="text-muted-foreground mt-2">
          This link has already been used or is invalid.
        </p>
      </div>
    );
  }

  if (route.status !== "PENDING") {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">Route Already Processed</h1>
        <p className="text-muted-foreground mt-2">
          This route has already been <strong>{route.status.toLowerCase()}</strong>.
        </p>
      </div>
    );
  }

  return (
    <>
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      <h1 className="font-display text-5xl uppercase tracking-wide mb-8">
        Approval Request for Route: <span className="text-primary">{route.name}</span>
      </h1>

      {/* Route Information */}
      <div className="bg-card border rounded-lg p-6 space-y-5 mb-8">
        {route.description && (
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Description</p>
            <p className="text-base">{route.description}</p>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Country</p>
            <p className="text-base font-medium">{COUNTRY_NAMES[route.country] ?? route.country}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Distance</p>
            <p className="text-base font-medium">
              {distanceNm(route.startLat, route.startLng, route.endLat, route.endLng)} nm
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Submitted by</p>
            <p className="text-base font-medium">{route.submittedBy.name}</p>
            <p className="text-sm text-muted-foreground">{route.submittedBy.email}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Submission Date</p>
            <p className="text-base">{new Date(route.submittedAt).toLocaleString()}</p>
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

      {/* Start and End Point Maps */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div>
          <h3 className="text-lg font-semibold mb-4">Start Point: {route.startName}</h3>
          <p className="text-sm text-muted-foreground mb-4 font-mono">
            {route.startLat.toFixed(6)}, {route.startLng.toFixed(6)}
          </p>
          <div className="h-[300px] rounded-lg overflow-hidden border">
            <PointMap
              lat={route.startLat}
              lng={route.startLng}
              name={route.startName}
              type="start"
            />
          </div>
        </div>
        <div>
          <h3 className="text-lg font-semibold mb-4">End Point: {route.endName}</h3>
          <p className="text-sm text-muted-foreground mb-4 font-mono">
            {route.endLat.toFixed(6)}, {route.endLng.toFixed(6)}
          </p>
          <div className="h-[300px] rounded-lg overflow-hidden border">
            <PointMap
              lat={route.endLat}
              lng={route.endLng}
              name={route.endName}
              type="end"
            />
          </div>
        </div>
      </div>

      <ApproveRouteForm routeId={route.id} token={token} />
    </div>

    {/* Full-width route map */}
    <div className="w-full mt-8">
      <div className="container mx-auto px-4 py-6">
        <h3 className="text-xl font-semibold mb-6">Complete Route</h3>
        <div className="h-[500px]">
          <ApprovalMap
            startLat={route.startLat}
            startLng={route.startLng}
            endLat={route.endLat}
            endLng={route.endLng}
            startName={route.startName}
            endName={route.endName}
          />
        </div>
      </div>
    </div>
    </>
  );
}
