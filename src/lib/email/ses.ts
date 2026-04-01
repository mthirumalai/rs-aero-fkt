import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import {
  sendMagicLinkEmailViaSendGrid,
  sendCourseRejectionEmailViaSendGrid,
  sendCourseApprovalEmailViaSendGrid,
} from "./sendgrid";

const IS_LOCAL_DEV = process.env.USE_LOCAL_DEV === "true";
const EMAIL_PROVIDER = process.env.EMAIL_PROVIDER || "ses";

const sesClient = IS_LOCAL_DEV
  ? null
  : new SESClient({
      region: process.env.AWS_REGION!,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });

// Original SES implementation for sendMagicLinkEmail
async function sendMagicLinkEmailViaSES(params: {
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

// Public API - chooses between SES and SendGrid
export async function sendMagicLinkEmail(params: {
  email: string;
  url: string;
}): Promise<void> {
  if (EMAIL_PROVIDER === "sendgrid") {
    return sendMagicLinkEmailViaSendGrid(params);
  } else {
    return sendMagicLinkEmailViaSES(params);
  }
}

// Original SES implementation for sendCourseRejectionEmail
async function sendCourseRejectionEmailViaSES(params: {
  courseName: string;
  submitterEmail: string;
  submitterName: string;
  rejectionReason: string;
}): Promise<void> {
  const { courseName, submitterEmail, submitterName, rejectionReason } = params;

  if (IS_LOCAL_DEV) {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║  [LOCAL DEV] Route rejection email (not actually sent)       ║
╠══════════════════════════════════════════════════════════════╣
║  To:     ${submitterEmail}
║  Route:  ${courseName}
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
      <p>Thank you for submitting the course <strong>${courseName}</strong>. Unfortunately, it has not been approved at this time.</p>
      <h3 style="color:#333">Reason</h3>
      <div style="background:#f9f9f9;border-left:4px solid #ec008c;padding:12px 16px;margin:16px 0">
        ${rejectionReason.replace(/\n/g, "<br/>")}
      </div>
      <p>Please make the necessary corrections and resubmit. If you have any questions, reply to this email.</p>
      <p style="color:#666;font-size:13px;margin-top:32px">— RS Aero FKT Admin</p>
    </div>
  `;

  const text = `RS Aero FKT — Route Submission Update\n\nHi ${submitterName},\n\nYour course "${courseName}" was not approved.\n\nReason:\n${rejectionReason}\n\nPlease make the necessary corrections and resubmit.\n\n— RS Aero FKT Admin`;

  await sesClient!.send(
    new SendEmailCommand({
      Source: process.env.SES_FROM_EMAIL!,
      Destination: { ToAddresses: [submitterEmail] },
      Message: {
        Subject: { Data: `[RS Aero FKT] Route submission not approved: ${courseName}` },
        Body: { Html: { Data: html }, Text: { Data: text } },
      },
    })
  );
}

// Public API - chooses between SES and SendGrid
export async function sendCourseRejectionEmail(params: {
  courseName: string;
  submitterEmail: string;
  submitterName: string;
  rejectionReason: string;
}): Promise<void> {
  if (EMAIL_PROVIDER === "sendgrid") {
    return sendCourseRejectionEmailViaSendGrid(params);
  } else {
    return sendCourseRejectionEmailViaSES(params);
  }
}

// Original SES implementation for sendCourseApprovalEmail
async function sendCourseApprovalEmailViaSES(params: {
  courseId: string;
  courseName: string;
  submitterName: string;
  submitterEmail: string;
  approvalToken: string;
  baseUrl: string;
}): Promise<void> {
  const { courseId, courseName, submitterName, submitterEmail, approvalToken, baseUrl } = params;
  const approveUrl = `${baseUrl}/admin/approve-course?token=${approvalToken}`;
  const rejectUrl = `${baseUrl}/admin/approve-course?token=${approvalToken}&action=reject`;

  if (IS_LOCAL_DEV) {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║  [LOCAL DEV] Route approval email (not actually sent)        ║
╠══════════════════════════════════════════════════════════════╣
║  Route:     ${courseName}
║  Submitted: ${submitterName} (${submitterEmail})
║  Route ID:  ${courseId}
╠══════════════════════════════════════════════════════════════╣
║  APPROVE → ${approveUrl}
║  REJECT  → ${rejectUrl}
╚══════════════════════════════════════════════════════════════╝
`);
    return;
  }

  const html = `
    <h2>New Route Submission: ${courseName}</h2>
    <p>Submitted by: ${submitterName} (${submitterEmail})</p>
    <p>Route ID: ${courseId}</p>
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
New Route Submission: ${courseName}
Submitted by: ${submitterName} (${submitterEmail})
Route ID: ${courseId}

Approve: ${approveUrl}
Reject: ${rejectUrl}

This link can only be used once.
  `.trim();

  await sesClient!.send(
    new SendEmailCommand({
      Source: process.env.SES_FROM_EMAIL!,
      Destination: { ToAddresses: [process.env.ADMIN_EMAIL!] },
      Message: {
        Subject: { Data: `[RS Aero FKT] New course for approval: ${courseName}` },
        Body: {
          Html: { Data: html },
          Text: { Data: text },
        },
      },
    })
  );
}

// Public API - chooses between SES and SendGrid
export async function sendCourseApprovalEmail(params: {
  courseId: string;
  courseName: string;
  submitterName: string;
  submitterEmail: string;
  approvalToken: string;
  baseUrl: string;
}): Promise<void> {
  if (EMAIL_PROVIDER === "sendgrid") {
    return sendCourseApprovalEmailViaSendGrid(params);
  } else {
    return sendCourseApprovalEmailViaSES(params);
  }
}
