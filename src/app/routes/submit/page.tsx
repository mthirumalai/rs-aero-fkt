import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { RouteSubmitForm } from "@/components/forms/RouteSubmitForm";

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
      <h1 className="text-3xl font-bold mb-2">Submit a Route</h1>
      <p className="text-muted-foreground mb-8">
        Submit a new RS Aero sailing route. An admin will review and approve it
        before it goes live. Please read the{" "}
        <a href="/guidelines" className="text-primary hover:underline">
          guidelines
        </a>{" "}
        before submitting.
      </p>
      <RouteSubmitForm />
    </div>
  );
}
