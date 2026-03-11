import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDuration } from "@/lib/gpx/parser";
import { auth } from "@/lib/auth";
import { ProfileEditForm } from "./ProfileEditForm";

interface Props {
  params: { athleteId: string };
}

const RIG_LABELS: Record<string, string> = {
  AERO_5: "Aero 5",
  AERO_6: "Aero 6",
  AERO_7: "Aero 7",
  AERO_9: "Aero 9",
};

export async function generateMetadata({ params }: Props) {
  const user = await prisma.user.findUnique({ where: { id: params.athleteId } });
  if (!user) return {};
  return { title: `${user.name} — RS Aero FKT` };
}

export default async function AthleteProfilePage({ params }: Props) {
  const [user, session] = await Promise.all([
    prisma.user.findUnique({
      where: { id: params.athleteId },
      include: {
        attempts: {
          where: { status: "APPROVED" },
          orderBy: { date: "desc" },
          include: { route: { select: { id: true, name: true } } },
        },
      },
    }),
    auth(),
  ]);

  if (!user) notFound();

  const isOwnProfile = session?.user?.id === user.id;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Profile Header */}
      <div className="flex items-start gap-6 mb-8">
        <Avatar className="h-20 w-20">
          <AvatarImage src={user.image ?? undefined} alt={user.name ?? "Athlete"} />
          <AvatarFallback className="text-2xl">
            {user.name?.charAt(0).toUpperCase() ?? "A"}
          </AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-3xl font-bold">{user.name}</h1>
          {user.location && (
            <p className="text-muted-foreground mt-1">📍 {user.location}</p>
          )}
          {user.bio && <p className="mt-2 text-sm max-w-lg">{user.bio}</p>}
          <p className="text-xs text-muted-foreground mt-2">
            Member since {new Date(user.createdAt).toLocaleDateString("en-GB", {
              month: "long", year: "numeric",
            })}
          </p>
        </div>
      </div>

      {/* Edit Profile (own profile only) */}
      {isOwnProfile && (
        <div className="mb-8">
          <ProfileEditForm
            userId={user.id}
            initialBio={user.bio ?? ""}
            initialLocation={user.location ?? ""}
          />
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-card border rounded-lg p-4 text-center">
          <p className="text-2xl font-bold">{user.attempts.length}</p>
          <p className="text-sm text-muted-foreground">FKT Attempts</p>
        </div>
        {(["AERO_5", "AERO_6", "AERO_7", "AERO_9"] as const).map((rig) => {
          const count = user.attempts.filter((a) => a.rigSize === rig).length;
          if (count === 0) return null;
          return (
            <div key={rig} className="bg-card border rounded-lg p-4 text-center">
              <p className="text-2xl font-bold">{count}</p>
              <p className="text-sm text-muted-foreground">{RIG_LABELS[rig]}</p>
            </div>
          );
        })}
      </div>

      {/* Attempts List */}
      <div>
        <h2 className="text-xl font-semibold mb-4">FKT Attempts</h2>
        {user.attempts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground border rounded-md">
            No FKT attempts yet.
          </div>
        ) : (
          <div className="space-y-3">
            {user.attempts.map((attempt) => (
              <div
                key={attempt.id}
                className="border rounded-lg p-4 flex items-center justify-between gap-4"
              >
                <div>
                  <Link
                    href={`/routes/${attempt.route.id}`}
                    className="font-medium text-sky-700 hover:underline"
                  >
                    {attempt.route.name}
                  </Link>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      {RIG_LABELS[attempt.rigSize]}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(attempt.date).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-mono font-semibold">
                    {formatDuration(attempt.durationSec)}
                  </p>
                  <Link
                    href={`/attempts/${attempt.id}`}
                    className="text-xs text-sky-600 hover:underline"
                  >
                    View attempt →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
