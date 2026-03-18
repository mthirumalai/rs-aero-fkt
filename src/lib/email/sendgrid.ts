import sgMail from '@sendgrid/mail';

const IS_LOCAL_DEV = process.env.USE_LOCAL_DEV === "true";

// Initialize SendGrid only in production
if (!IS_LOCAL_DEV && process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

export async function sendMagicLinkEmailViaSendGrid(params: {
  email: string;
  url: string;
}): Promise<void> {
  const { email, url } = params;

  if (IS_LOCAL_DEV) {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║  [LOCAL DEV] Magic link email (SendGrid - not sent)         ║
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

  const msg = {
    to: email,
    from: process.env.SES_FROM_EMAIL!,
    subject: "Sign in to RS Aero FKT",
    html,
    text: `Sign in to RS Aero FKT:\n\n${url}\n\nThis link expires in 24 hours.`,
  };

  await sgMail.send(msg);
}

export async function sendRouteRejectionEmailViaSendGrid(params: {
  routeName: string;
  submitterEmail: string;
  submitterName: string;
  rejectionReason: string;
}): Promise<void> {
  const { routeName, submitterEmail, submitterName, rejectionReason } = params;

  if (IS_LOCAL_DEV) {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║  [LOCAL DEV] Route rejection email (SendGrid - not sent)    ║
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

  const msg = {
    to: submitterEmail,
    from: process.env.SES_FROM_EMAIL!,
    subject: `[RS Aero FKT] Route submission not approved: ${routeName}`,
    html,
    text,
  };

  await sgMail.send(msg);
}

export async function sendRouteApprovalEmailViaSendGrid(params: {
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
║  [LOCAL DEV] Route approval email (SendGrid - not sent)     ║
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

  const msg = {
    to: process.env.ADMIN_EMAIL!,
    from: process.env.SES_FROM_EMAIL!,
    subject: `[RS Aero FKT] New route for approval: ${routeName}`,
    html,
    text,
  };

  await sgMail.send(msg);
}

export async function sendContactEmailViaSendGrid(data: {
  type: string;
  name: string;
  email: string;
  description: string;
  attachmentKeys?: string[];
  attachmentNames?: string[];
}): Promise<void> {
  const { type, name, email, description, attachmentKeys = [], attachmentNames = [] } = data;

  if (IS_LOCAL_DEV) {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║  [LOCAL DEV] Contact form email (SendGrid - not sent)      ║
╠══════════════════════════════════════════════════════════════╣
║  Type: ${type}
║  From: ${name} (${email})
╠══════════════════════════════════════════════════════════════╣
║  Message: ${description}
║  Attachments: ${attachmentNames.join(', ') || 'None'}
╚══════════════════════════════════════════════════════════════╝
`);
    return;
  }

  // Build attachment section for email
  let attachmentSection = "";
  if (attachmentKeys.length > 0) {
    const attachmentList = attachmentNames.map((fileName, index) => {
      const key = attachmentKeys[index];
      const photosBucket = process.env.S3_BUCKET_PHOTOS!;
      const awsRegion = process.env.AWS_REGION!;
      const fileUrl = `https://${photosBucket}.s3.${awsRegion}.amazonaws.com/${key}`;
      return `<li><a href="${fileUrl}" target="_blank">${fileName}</a></li>`;
    }).join('');

    attachmentSection = `
    <h3>Attachments:</h3>
    <ul>${attachmentList}</ul>`;
  }

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:#ec008c">RS Aero FKT Contact Form Submission</h2>

      <p><strong>Type:</strong> ${type}</p>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>

      <h3>Message:</h3>
      <div style="background:#f9f9f9;border-left:4px solid #ec008c;padding:15px;border-radius:5px;margin:15px 0;">
        ${description.replace(/\n/g, '<br>')}
      </div>

      ${attachmentSection}

      <hr style="margin:20px 0;">
      <p style="color:#666;font-size:12px;">
        This message was sent via the RS Aero FKT contact form.
      </p>
    </div>
  `;

  const textAttachments = attachmentKeys.length > 0
    ? `\n\nATTACHMENTS:\n${attachmentNames.map((fileName, index) => {
        const key = attachmentKeys[index];
        const photosBucket = process.env.S3_BUCKET_PHOTOS!;
        const awsRegion = process.env.AWS_REGION!;
        const fileUrl = `https://${photosBucket}.s3.${awsRegion}.amazonaws.com/${key}`;
        return `• ${fileName}: ${fileUrl}`;
      }).join('\n')}`
    : '';

  const text = `RS Aero FKT Contact Form Submission

Type: ${type}
Name: ${name}
Email: ${email}

Message:
${description}${textAttachments}

---
This message was sent via the RS Aero FKT contact form.`;

  const msg = {
    to: "president@rsaerona.org",
    cc: email, // CC the sender
    from: process.env.SES_FROM_EMAIL!,
    subject: `RS Aero FKT Contact Form: ${type}`,
    html,
    text,
  };

  await sgMail.send(msg);
}