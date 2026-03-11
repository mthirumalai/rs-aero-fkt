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

  const { bio, location } = await req.json();

  const user = await prisma.user.update({
    where: { id: params.athleteId },
    data: {
      bio: bio ?? null,
      location: location ?? null,
    },
    select: { id: true, bio: true, location: true },
  });

  return NextResponse.json(user);
}
