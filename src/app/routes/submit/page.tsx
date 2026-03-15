import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { RouteSubmitFormWithGpx } from "@/components/forms/RouteSubmitFormWithGpx";

export const metadata = {
  title: "Submit a Route — RS Aero FKT",
};

export default async function SubmitRoutePage() {
  const session = await auth();
  if (!session) {
    redirect("/api/auth/signin?callbackUrl=/routes/submit");
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <RouteSubmitFormWithGpx />
    </div>
  );
}
