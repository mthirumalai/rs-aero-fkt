export default function VerifyRequestPage() {
  return (
    <div className="container mx-auto px-4 py-24 max-w-md text-center">
      <div className="text-5xl mb-6">✉️</div>
      <h1 className="font-display text-4xl uppercase tracking-wide mb-3">
        Check your email
      </h1>
      <p className="text-muted-foreground mb-2">
        A sign-in link has been sent to your email address.
      </p>
      <p className="text-muted-foreground text-sm">
        Click the link in the email to sign in. It expires in 24 hours and
        can only be used once. If you don&apos;t see it, check your spam folder.
      </p>
    </div>
  );
}
