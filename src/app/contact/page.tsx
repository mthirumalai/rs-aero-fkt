import { Metadata } from "next";
import { ContactForm } from "./ContactForm";
import { PageHeader } from "@/components/PageHeader";

export const metadata: Metadata = {
  title: "Contact Us — RS Aero FKT",
};

export default function ContactPage() {
  return (
    <>
      <PageHeader title="Contact Us" />
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <div className="mb-8 space-y-4 text-muted-foreground">
          <p>
            <strong>Enjoying the app?</strong> We&apos;d love to hear from you.
          </p>
          <p>
            <strong>Did you run into an issue?</strong> Tell us more so we can fix it.
          </p>
          <p>
            <strong>Do you have an idea for how we can make things better?</strong>
          </p>
        </div>

        <ContactForm />
      </div>
    </>
  );
}