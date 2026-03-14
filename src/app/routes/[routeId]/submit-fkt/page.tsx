import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { FktSubmitForm } from "@/components/forms/FktSubmitForm";

interface Props {
  params: { routeId: string };
}

export const metadata = {
  title: "Submit an FKT — RS Aero FKT",
};

export default async function SubmitFktPage({ params }: Props) {
  const session = await auth();
  if (!session) {
    redirect(`/api/auth/signin?callbackUrl=/routes/${params.routeId}/submit-fkt`);
  }

  const [route, attemptCount] = await Promise.all([
    prisma.route.findUnique({
      where: { id: params.routeId, status: "APPROVED" },
    }),
    prisma.fktAttempt.count({
      where: { routeId: params.routeId, status: "APPROVED" }
    })
  ]);

  if (!route) notFound();

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold uppercase tracking-wide">Submit an FKT Attempt</h1>
        <p className="text-lg text-muted-foreground mt-2">
          <span className="font-medium">Route:</span> {route.name}. <span className="font-medium">Start:</span> {route.startName}, <span className="font-medium">End:</span> {route.endName}. <span className="font-medium">Attempts so far:</span> {attemptCount}
        </p>
      </div>
      <FktSubmitForm routeId={route.id} submitterName={session.user?.name || ""} submitterEmail={session.user?.email || ""} />
    </div>
  );
}
