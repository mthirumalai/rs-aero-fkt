import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { CourseSubmitFormWithGpx } from "@/components/forms/CourseSubmitFormWithGpx";

export const metadata = {
  title: "Submit a Course — RS Aero FKT",
};

export default async function SubmitCoursePage() {
  const session = await auth();
  if (!session) {
    redirect("/api/auth/signin?callbackUrl=/courses/submit");
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <CourseSubmitFormWithGpx />
    </div>
  );
}
