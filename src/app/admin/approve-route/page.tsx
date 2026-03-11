import { prisma } from "@/lib/prisma";
import { ApproveRouteForm } from "./ApproveRouteForm";
import { COUNTRY_NAMES } from "@/lib/regions";

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
    <div className="container mx-auto px-4 py-12 max-w-2xl">
      <h1 className="text-3xl font-bold mb-2">Route Approval Request</h1>
      <p className="text-muted-foreground mb-8">
        Review and approve or reject this route submission.
      </p>

      <div className="bg-card border rounded-lg p-6 mb-8 space-y-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Route Name</p>
          <p className="text-lg font-semibold">{route.name}</p>
        </div>
        {route.description && (
          <div>
            <p className="text-sm font-medium text-muted-foreground">Description</p>
            <p>{route.description}</p>
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Country</p>
            <p>{COUNTRY_NAMES[route.country] ?? route.country}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Submitted by</p>
            <p>{route.submittedBy.name} ({route.submittedBy.email})</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Start</p>
            <p className="font-medium">{route.startName}</p>
            <p className="text-sm text-muted-foreground">
              {route.startLat.toFixed(6)}, {route.startLng.toFixed(6)}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">End</p>
            <p className="font-medium">{route.endName}</p>
            <p className="text-sm text-muted-foreground">
              {route.endLat.toFixed(6)}, {route.endLng.toFixed(6)}
            </p>
          </div>
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">Submitted</p>
          <p>{new Date(route.submittedAt).toLocaleString()}</p>
        </div>
      </div>

      <ApproveRouteForm routeId={route.id} token={token} />
    </div>
  );
}
