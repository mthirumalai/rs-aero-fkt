import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

const IS_LOCAL_DEV = process.env.USE_LOCAL_DEV === "true";

const sesClient = IS_LOCAL_DEV
  ? null
  : new SESClient({
      region: process.env.AWS_REGION!,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });

export async function sendMagicLinkEmail(params: {
  email: string;
  url: string;
}): Promise<void> {
  const { email, url } = params;

  if (IS_LOCAL_DEV) {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║  [LOCAL DEV] Magic link email (not actually sent)            ║
╠══════════════════════════════════════════════════════════════╣
║  To:   ${email}
╠══════════════════════════════════════════════════════════════╣
║  Sign-in link (click or paste into browser):
║  ${url}
╚══════════════════════════════════════════════════════════════╝
`);
    return;
  }

  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
      <h2 style="color:#e91e63">Sign in to RS Aero FKT</h2>
      <p>Click the button below to sign in. This link expires in 24 hours and can only be used once.</p>
      <p style="margin:32px 0">
        <a href="${url}" style="background:#e91e63;color:white;padding:12px 24px;text-decoration:none;border-radius:4px;font-weight:600;display:inline-block">
          Sign in to RS Aero FKT
        </a>
      </p>
      <p style="color:#666;font-size:13px">If you didn't request this email you can safely ignore it.</p>
    </div>
  `;

  await sesClient!.send(
    new SendEmailCommand({
      Source: process.env.SES_FROM_EMAIL!,
      Destination: { ToAddresses: [email] },
      Message: {
        Subject: { Data: "Sign in to RS Aero FKT" },
        Body: {
          Html: { Data: html },
          Text: { Data: `Sign in to RS Aero FKT:\n\n${url}\n\nThis link expires in 24 hours.` },
        },
      },
    })
  );
}

export async function sendRouteRejectionEmail(params: {
  routeName: string;
  submitterEmail: string;
  submitterName: string;
  rejectionReason: string;
}): Promise<void> {
  const { routeName, submitterEmail, submitterName, rejectionReason } = params;

  if (IS_LOCAL_DEV) {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║  [LOCAL DEV] Route rejection email (not actually sent)       ║
╠══════════════════════════════════════════════════════════════╣
║  To:     ${submitterEmail}
║  Route:  ${routeName}
╠══════════════════════════════════════════════════════════════╣
║  Reason: ${rejectionReason}
╚══════════════════════════════════════════════════════════════╝
`);
    return;
  }

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:#ec008c">RS Aero FKT — Route Submission Update</h2>
      <p>Hi ${submitterName},</p>
      <p>Thank you for submitting the route <strong>${routeName}</strong>. Unfortunately, it has not been approved at this time.</p>
      <h3 style="color:#333">Reason</h3>
      <div style="background:#f9f9f9;border-left:4px solid #ec008c;padding:12px 16px;margin:16px 0">
        ${rejectionReason.replace(/\n/g, "<br/>")}
      </div>
      <p>Please make the necessary corrections and resubmit. If you have any questions, reply to this email.</p>
      <p style="color:#666;font-size:13px;margin-top:32px">— RS Aero FKT Admin</p>
    </div>
  `;

  const text = `RS Aero FKT — Route Submission Update\n\nHi ${submitterName},\n\nYour route "${routeName}" was not approved.\n\nReason:\n${rejectionReason}\n\nPlease make the necessary corrections and resubmit.\n\n— RS Aero FKT Admin`;

  await sesClient!.send(
    new SendEmailCommand({
      Source: process.env.SES_FROM_EMAIL!,
      Destination: { ToAddresses: [submitterEmail] },
      Message: {
        Subject: { Data: `[RS Aero FKT] Route submission not approved: ${routeName}` },
        Body: { Html: { Data: html }, Text: { Data: text } },
      },
    })
  );
}

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

  if (IS_LOCAL_DEV) {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║  [LOCAL DEV] Route approval email (not actually sent)        ║
╠══════════════════════════════════════════════════════════════╣
║  Route:     ${routeName}
║  Submitted: ${submitterName} (${submitterEmail})
║  Route ID:  ${routeId}
╠══════════════════════════════════════════════════════════════╣
║  APPROVE → ${approveUrl}
║  REJECT  → ${rejectUrl}
╚══════════════════════════════════════════════════════════════╝
`);
    return;
  }

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

  await sesClient!.send(
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
