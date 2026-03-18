import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

const sesClient = new SESClient({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

interface ContactEmailData {
  type: string;
  name: string;
  email: string;
  description: string;
  attachmentKeys?: string[];
  attachmentNames?: string[];
}

export async function sendContactEmail(data: ContactEmailData) {
  const { type, name, email, description, attachmentKeys = [], attachmentNames = [] } = data;

  // Build attachment section
  let attachmentSection = "";
  if (attachmentKeys.length > 0) {
    const attachmentList = attachmentNames.map((fileName, index) => {
      const key = attachmentKeys[index];
      const photosBucket = process.env.S3_BUCKET_PHOTOS!;
      const awsRegion = process.env.AWS_REGION!;
      const fileUrl = `https://${photosBucket}.s3.${awsRegion}.amazonaws.com/${key}`;
      return `• ${fileName}: ${fileUrl}`;
    }).join('\n');

    attachmentSection = `

ATTACHMENTS:
${attachmentList}`;
  }

  const subject = `RS Aero FKT Contact Form: ${type}`;

  const htmlBody = `
    <h2>RS Aero FKT Contact Form Submission</h2>

    <p><strong>Type:</strong> ${type}</p>
    <p><strong>Name:</strong> ${name}</p>
    <p><strong>Email:</strong> ${email}</p>

    <h3>Message:</h3>
    <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 10px 0;">
      ${description.replace(/\n/g, '<br>')}
    </div>

    ${attachmentKeys.length > 0 ? `
    <h3>Attachments:</h3>
    <ul>
      ${attachmentNames.map((fileName, index) => {
        const key = attachmentKeys[index];
        const photosBucket = process.env.S3_BUCKET_PHOTOS!;
        const awsRegion = process.env.AWS_REGION!;
        const fileUrl = `https://${photosBucket}.s3.${awsRegion}.amazonaws.com/${key}`;
        return `<li><a href="${fileUrl}" target="_blank">${fileName}</a></li>`;
      }).join('')}
    </ul>
    ` : ''}

    <hr style="margin: 20px 0;">
    <p style="color: #666; font-size: 12px;">
      This message was sent via the RS Aero FKT contact form.
    </p>
  `;

  const textBody = `RS Aero FKT Contact Form Submission

Type: ${type}
Name: ${name}
Email: ${email}

Message:
${description}${attachmentSection}

---
This message was sent via the RS Aero FKT contact form.`;

  const command = new SendEmailCommand({
    Source: process.env.SES_FROM_EMAIL!,
    Destination: {
      ToAddresses: ["president@rsaerona.org"],
      CcAddresses: [email], // CC the sender
    },
    Message: {
      Subject: {
        Data: subject,
        Charset: "UTF-8",
      },
      Body: {
        Text: {
          Data: textBody,
          Charset: "UTF-8",
        },
        Html: {
          Data: htmlBody,
          Charset: "UTF-8",
        },
      },
    },
  });

  await sesClient.send(command);
}