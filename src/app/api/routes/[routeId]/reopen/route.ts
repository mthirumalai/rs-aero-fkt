import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { randomUUID } from "crypto";
import { sendRouteApprovalEmail } from "@/lib/email/ses";
import { recordRouteStatusChange } from "@/lib/route-status-history";

export async function POST(
  req: NextRequest,
  { params }: { params: { routeId: string } }
) {
  // Check admin authorization
  const session = await auth();
  const isAdmin = !!session?.user?.email && session.user.email === process.env.ADMIN_EMAIL;

  if (!isAdmin) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const { routeId } = params;

  try {
    // Find the route
    const route = await prisma.route.findUnique({
      where: { id: routeId },
      include: { submittedBy: { select: { name: true, email: true } } },
    });

    if (!route) {
      return NextResponse.json({ error: "Route not found" }, { status: 404 });
    }

    if (route.status !== "REJECTED") {
      return NextResponse.json({ error: "Only rejected routes can be re-opened" }, { status: 400 });
    }

    // Generate new approval token and reset status (keep rejection history)
    const newApprovalToken = randomUUID();

    const updatedRoute = await prisma.route.update({
      where: { id: routeId },
      data: {
        status: "PENDING",
        approvalToken: newApprovalToken,
        // Keep rejectionReason and other history for admin reference
        approvedAt: null,
      },
    });

    // Record the re-opening in status history
    await recordRouteStatusChange(
      routeId,
      route.status, // fromStatus (REJECTED)
      "PENDING", // toStatus
      "Route re-opened by admin for reconsideration",
      session.user.id, // changedById
      newApprovalToken
    );

    // Send new approval email
    const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    try {
      await sendRouteApprovalEmail({
        routeId: route.id,
        routeName: route.name,
        submitterName: route.submittedBy.name ?? "Unknown",
        submitterEmail: route.submittedBy.email ?? "",
        approvalToken: newApprovalToken,
        baseUrl,
      });
    } catch (err) {
      console.error("Failed to send re-approval email:", err);
      // Continue anyway - the route was re-opened successfully
    }

    return NextResponse.json({
      success: true,
      message: "Route re-opened and approval email sent",
      status: updatedRoute.status
    });

  } catch (error) {
    console.error("Error re-opening route:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}