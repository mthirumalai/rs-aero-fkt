import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { sendRouteApprovalEmail } from "@/lib/email/ses";
import { getCountriesForRegion, type Region } from "@/lib/regions";
import { randomUUID } from "crypto";
import { recordRouteStatusChange } from "@/lib/route-status-history";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const region = searchParams.get("region") as Region | null;

  const where: Record<string, unknown> = { status: "APPROVED" };

  if (region) {
    const countries = getCountriesForRegion(region);
    where.country = { in: countries };
  }

  const routes = await prisma.route.findMany({
    where,
    orderBy: { approvedAt: "desc" },
    include: {
      submittedBy: { select: { id: true, name: true } },
      _count: { select: { attempts: true } },
    },
  });

  return NextResponse.json(routes);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name, description, country, startName, endName, startLat, startLng, endLat, endLng } = body;

  if (!name || !country || !startName || !endName || startLat == null || startLng == null || endLat == null || endLng == null) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const approvalToken = randomUUID();

  const route = await prisma.route.create({
    data: {
      name,
      description,
      country,
      startName,
      endName,
      startLat: parseFloat(startLat),
      startLng: parseFloat(startLng),
      endLat: parseFloat(endLat),
      endLng: parseFloat(endLng),
      submittedById: session.user.id,
      approvalToken,
      status: "PENDING",
    },
  });

  // Record the initial submission in status history
  await recordRouteStatusChange(
    route.id,
    null, // fromStatus (new route)
    "PENDING", // toStatus
    "Initial route submission",
    session.user.id, // changedById
    approvalToken
  );

  // Send approval email
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  try {
    await sendRouteApprovalEmail({
      routeId: route.id,
      routeName: route.name,
      submitterName: session.user.name ?? "Unknown",
      submitterEmail: session.user.email ?? "",
      approvalToken,
      baseUrl,
    });
  } catch (err) {
    console.error("Failed to send approval email:", err);
  }

  return NextResponse.json(route, { status: 201 });
}
