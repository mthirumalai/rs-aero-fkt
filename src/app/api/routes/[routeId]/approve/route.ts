import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: { routeId: string } }
) {
  const { token, action } = await req.json();

  if (!token) {
    return NextResponse.json({ error: "Token required" }, { status: 400 });
  }

  const route = await prisma.route.findFirst({
    where: { id: params.routeId, approvalToken: token },
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
      approvalToken: null, // single-use: clear token
    },
  });

  return NextResponse.json({ success: true, status: updated.status });
}
