import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendRouteRejectionEmail } from "@/lib/email/ses";

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

  const updated = await prisma.route.update({
    where: { id: params.routeId },
    data: {
      status: isApprove ? "APPROVED" : "REJECTED",
      approvedAt: isApprove ? new Date() : null,
      approvalToken: null,
      rejectionReason: isApprove ? null : rejectionReason.trim(),
    },
  });

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
