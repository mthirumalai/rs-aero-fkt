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

  const route = await prisma.route.findUnique({
    where: { id: params.routeId, status: "APPROVED" },
  });

  if (!route) notFound();

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-6">
        <p className="text-sm text-muted-foreground mb-1">
          <a href={`/routes/${route.id}`} className="hover:underline text-primary">
            {route.name}
          </a>{" "}
          / Submit FKT
        </p>
        <h1 className="text-3xl font-bold">Submit an FKT Attempt</h1>
        <p className="text-muted-foreground mt-1">
          {route.startName} → {route.endName}
        </p>
      </div>
      <FktSubmitForm routeId={route.id} />
    </div>
  );
}
