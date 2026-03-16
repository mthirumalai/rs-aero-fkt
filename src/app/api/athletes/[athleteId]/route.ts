import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { athleteId: string } }
) {
  const session = await auth();
  if (!session?.user?.id || session.user.id !== params.athleteId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name, bio, location, preferredRigSize } = await req.json();

  // Validate name if provided
  if (name !== undefined && (!name || typeof name !== "string" || name.trim().length === 0)) {
    return NextResponse.json({ error: "Name is required and must be a non-empty string" }, { status: 400 });
  }

  // Validate preferredRigSize if provided
  const validRigSizes = ["AERO_5", "AERO_6", "AERO_7", "AERO_9"];
  if (preferredRigSize !== undefined && preferredRigSize !== null && !validRigSizes.includes(preferredRigSize)) {
    return NextResponse.json({ error: "Invalid rig size" }, { status: 400 });
  }

  // Build update object (only include defined fields)
  const updateData: any = {};
  if (name !== undefined) updateData.name = name.trim();
  if (bio !== undefined) updateData.bio = bio ?? null;
  if (location !== undefined) updateData.location = location ?? null;
  if (preferredRigSize !== undefined) updateData.preferredRigSize = preferredRigSize;

  const user = await prisma.user.update({
    where: { id: params.athleteId },
    data: updateData,
    select: { id: true, name: true, bio: true, location: true, preferredRigSize: true },
  });

  return NextResponse.json(user);
}
