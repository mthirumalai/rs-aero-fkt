import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { FktSubmitForm } from "@/components/forms/FktSubmitForm";
import Link from "next/link";

interface Props {
  params: { courseId: string };
}

export const metadata = {
  title: "Submit an FKT — RS Aero FKT",
};

export default async function SubmitFktPage({ params }: Props) {
  const session = await auth();
  if (!session) {
    redirect(`/auth/signin?callbackUrl=/courses/${params.courseId}/submit-fkt`);
  }

  const [course, attemptCount, user] = await Promise.all([
    prisma.course.findUnique({
      where: { id: params.courseId, status: "APPROVED" },
    }),
    prisma.fktAttempt.count({
      where: { courseId: params.courseId, status: "APPROVED" }
    }),
    prisma.user.findUnique({
      where: { id: session.user?.id },
      select: { preferredRigSize: true }
    })
  ]);

  if (!course) notFound();

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold uppercase tracking-wide">Submit an FKT Attempt</h1>
        <p className="text-lg text-muted-foreground mt-2">
          <span className="font-medium">Route:</span> <Link href={`/courses/${course.id}`} className="text-primary underline hover:no-underline">{course.name}</Link>.{" "}
          {course.courseType === "OUT_AND_BACK" ? (
            <>
              <span className="font-medium">Start/Finish:</span> {course.startName}, <span className="font-medium">Turning mark:</span> {course.turningMarkName}.
            </>
          ) : (
            <>
              <span className="font-medium">Start:</span> {course.startName}, <span className="font-medium">Finish:</span> {course.finishName}.
            </>
          )}{" "}
          <span className="font-medium">Attempts so far:</span> {attemptCount}
        </p>
      </div>
      <FktSubmitForm
        courseId={course.id}
        submitterName={session.user?.name || ""}
        submitterEmail={session.user?.email || ""}
        preferredRigSize={user?.preferredRigSize || null}
      />
    </div>
  );
}
