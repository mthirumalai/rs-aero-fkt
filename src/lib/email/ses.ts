import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

const sesClient = new SESClient({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function sendRouteApprovalEmail(params: {
  routeId: string;
  routeName: string;
  submitterName: string;
  submitterEmail: string;
  approvalToken: string;
  baseUrl: string;
}): Promise<void> {
  const { routeId, routeName, submitterName, submitterEmail, approvalToken, baseUrl } = params;
  const approveUrl = `${baseUrl}/admin/approve-route?token=${approvalToken}`;
  const rejectUrl = `${baseUrl}/admin/approve-route?token=${approvalToken}&action=reject`;

  const html = `
    <h2>New Route Submission: ${routeName}</h2>
    <p>Submitted by: ${submitterName} (${submitterEmail})</p>
    <p>Route ID: ${routeId}</p>
    <hr />
    <p>
      <a href="${approveUrl}" style="background:#16a34a;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;margin-right:12px">
        ✓ Approve Route
      </a>
      <a href="${rejectUrl}" style="background:#dc2626;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block">
        ✗ Reject Route
      </a>
    </p>
    <p><small>This link can only be used once.</small></p>
  `;

  const text = `
New Route Submission: ${routeName}
Submitted by: ${submitterName} (${submitterEmail})
Route ID: ${routeId}

Approve: ${approveUrl}
Reject: ${rejectUrl}

This link can only be used once.
  `.trim();

  await sesClient.send(
    new SendEmailCommand({
      Source: process.env.SES_FROM_EMAIL!,
      Destination: { ToAddresses: [process.env.ADMIN_EMAIL!] },
      Message: {
        Subject: { Data: `[RS Aero FKT] New route for approval: ${routeName}` },
        Body: {
          Html: { Data: html },
          Text: { Data: text },
        },
      },
    })
  );
}
