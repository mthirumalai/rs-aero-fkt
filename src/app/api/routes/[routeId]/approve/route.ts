import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendRouteRejectionEmail } from "@/lib/email/ses";
import { recordRouteStatusChange } from "@/lib/route-status-history";

export async function POST(
  req: NextRequest,
  { params }: { params: { routeId: string } }
) {
  const { token, action, rejectionReason } = await req.json();

  if (!token) {
    return NextResponse.json({ error: "Token required" }, { status: 400 });
  }

  if (action === "reject" && !rejectionReason?.trim()) {
    return NextResponse.json({ error: "A rejection reason is required" }, { status: 400 });
  }

  const route = await prisma.route.findFirst({
    where: { id: params.routeId, approvalToken: token },
    include: { submittedBy: { select: { name: true, email: true } } },
  });

  if (!route) {
    return NextResponse.json({ error: "Invalid or already used token" }, { status: 404 });
  }

  if (route.status !== "PENDING") {
    return NextResponse.json({ error: "Route has already been processed" }, { status: 400 });
  }

  const isApprove = action !== "reject";
  const newStatus = isApprove ? "APPROVED" : "REJECTED";

  const updated = await prisma.route.update({
    where: { id: params.routeId },
    data: {
      status: newStatus,
      approvedAt: isApprove ? new Date() : null,
      approvalToken: null,
      rejectionReason: isApprove ? null : rejectionReason.trim(),
    },
  });

  // Record the status change in history
  await recordRouteStatusChange(
    params.routeId,
    route.status, // fromStatus
    newStatus, // toStatus
    isApprove ? "Route approved" : rejectionReason.trim(),
    undefined, // changedById - we don't have admin user ID from token-based approval
    token
  );

  if (!isApprove) {
    try {
      await sendRouteRejectionEmail({
        routeName: route.name,
        submitterEmail: route.submittedBy.email,
        submitterName: route.submittedBy.name ?? "Sailor",
        rejectionReason: rejectionReason.trim(),
      });
    } catch (err) {
      console.error("Failed to send rejection email:", err);
    }
  }

  return NextResponse.json({ success: true, status: updated.status });
}
