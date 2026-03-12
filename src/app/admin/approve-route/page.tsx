import { prisma } from "@/lib/prisma";
import { ApproveRouteForm } from "./ApproveRouteForm";
import { ApprovalMap } from "@/components/map/ApprovalMap";
import { COUNTRY_NAMES } from "@/lib/regions";
import { distanceNm } from "@/lib/gpx/validator";

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

  const route = await prisma.route.findFirst({
    where: { approvalToken: token },
    include: { submittedBy: { select: { name: true, email: true } } },
  });

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
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      <h1 className="font-display text-5xl uppercase tracking-wide mb-1">Route Approval Request</h1>
      <p className="text-muted-foreground mb-8 text-base">
        Review and approve or reject this route submission.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">

      <div className="bg-card border rounded-lg p-6 space-y-5">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Route Name</p>
          <p className="text-2xl font-semibold text-foreground">{route.name}</p>
        </div>
        {route.description && (
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Description</p>
            <p className="text-base">{route.description}</p>
          </div>
        )}
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Country</p>
          <p className="text-base font-medium">{COUNTRY_NAMES[route.country] ?? route.country}</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Start</p>
            <p className="text-base font-medium">{route.startName}</p>
            <p className="text-sm font-mono text-muted-foreground">
              {route.startLat.toFixed(6)}, {route.startLng.toFixed(6)}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">End</p>
            <p className="text-base font-medium">{route.endName}</p>
            <p className="text-sm font-mono text-muted-foreground">
              {route.endLat.toFixed(6)}, {route.endLng.toFixed(6)}
            </p>
          </div>
        </div>
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Great-Circle Distance</p>
          <p className="text-base font-medium">
            {distanceNm(route.startLat, route.startLng, route.endLat, route.endLng)} nm
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 pt-2 border-t">
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
      </div>

      {/* Map */}
      <div className="h-[420px] rounded-lg overflow-hidden border">
        <ApprovalMap
          startLat={route.startLat}
          startLng={route.startLng}
          endLat={route.endLat}
          endLng={route.endLng}
          startName={route.startName}
          endName={route.endName}
        />
      </div>

      </div>{/* end grid */}

      <ApproveRouteForm routeId={route.id} token={token} />
    </div>
  );
}
