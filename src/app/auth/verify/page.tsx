export default function VerifyRequestPage() {
  return (
    <div className="container mx-auto px-4 py-24 max-w-md text-center">
      <div className="text-5xl mb-6">✉️</div>
      <h1 className="font-display text-4xl uppercase tracking-wide mb-3">
        Check your email
      </h1>
      <p className="text-muted-foreground mb-4">
        A sign-in link has been sent to your email address.
      </p>
      <div className="text-sm bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
        <p className="font-medium text-yellow-800 mb-2">⏱️ Important delivery information:</p>
        <ul className="text-yellow-700 space-y-1 list-disc list-inside">
          <li>This may take up to 20 minutes to arrive</li>
          <li>Be sure to check your spam folder</li>
          <li>The link expires in 24 hours</li>
          <li>Each link can only be used once</li>
        </ul>
      </div>
    </div>
  );
}
