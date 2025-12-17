import nodemailer from 'nodemailer';

// Create transporter based on environment
const createTransporter = () => {
  // Use environment variables for configuration
  const config = {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  };

  // For development, use ethereal email (fake SMTP)
  if (process.env.NODE_ENV === 'development' && !process.env.SMTP_USER) {
    return null; // Will use preview mode
  }

  return nodemailer.createTransporter(config);
};

let transporter = null;

// Initialize transporter lazily
const getTransporter = async () => {
  if (transporter) return transporter;

  // In development without SMTP config, create ethereal account
  if (process.env.NODE_ENV === 'development' && !process.env.SMTP_USER) {
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    console.log('Using Ethereal email for development');
    console.log('Ethereal user:', testAccount.user);
    return transporter;
  }

  transporter = createTransporter();
  return transporter;
};

// Send email helper
export const sendEmail = async ({ to, subject, html, text }) => {
  try {
    const transport = await getTransporter();

    if (!transport) {
      console.log('Email service not configured. Would send email to:', to);
      console.log('Subject:', subject);
      return { success: true, preview: true };
    }

    const mailOptions = {
      from: process.env.SMTP_FROM || '"Mavi HRMS" <noreply@mavihrms.com>',
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''), // Strip HTML for text version
    };

    const info = await transport.sendMail(mailOptions);

    // For ethereal, log preview URL
    if (process.env.NODE_ENV === 'development') {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        console.log('Email Preview URL:', previewUrl);
      }
    }

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

// Email templates
export const emailTemplates = {
  passwordReset: ({ resetUrl, userName, tenantName, expiryMinutes = 60 }) => ({
    subject: `Password Reset Request - ${tenantName}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; border-bottom: 1px solid #eee;">
              <h1 style="margin: 0; color: #333; font-size: 24px;">${tenantName}</h1>
              <p style="margin: 10px 0 0; color: #666; font-size: 14px;">Password Reset Request</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px; color: #333; font-size: 16px;">Hi ${userName},</p>

              <p style="margin: 0 0 20px; color: #555; font-size: 14px; line-height: 1.6;">
                We received a request to reset your password. Click the button below to create a new password:
              </p>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="${resetUrl}"
                       style="display: inline-block; padding: 14px 32px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 20px 0 0; color: #555; font-size: 14px; line-height: 1.6;">
                This link will expire in <strong>${expiryMinutes} minutes</strong>.
              </p>

              <p style="margin: 20px 0 0; color: #555; font-size: 14px; line-height: 1.6;">
                If you didn't request a password reset, you can safely ignore this email. Your password won't be changed.
              </p>

              <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">

              <p style="margin: 0; color: #888; font-size: 12px;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="margin: 5px 0 0; color: #2563eb; font-size: 12px; word-break: break-all;">
                ${resetUrl}
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px; text-align: center;">
              <p style="margin: 0; color: #888; font-size: 12px;">
                This is an automated message from Mavi HRMS. Please do not reply to this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
  }),

  passwordResetSuccess: ({ userName, tenantName }) => ({
    subject: `Password Changed Successfully - ${tenantName}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Changed</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; border-bottom: 1px solid #eee;">
              <h1 style="margin: 0; color: #333; font-size: 24px;">${tenantName}</h1>
              <p style="margin: 10px 0 0; color: #16a34a; font-size: 14px;">Password Changed Successfully</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px; color: #333; font-size: 16px;">Hi ${userName},</p>

              <p style="margin: 0 0 20px; color: #555; font-size: 14px; line-height: 1.6;">
                Your password has been changed successfully. You can now log in with your new password.
              </p>

              <p style="margin: 20px 0 0; color: #555; font-size: 14px; line-height: 1.6;">
                If you did not make this change, please contact your administrator immediately.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px; text-align: center;">
              <p style="margin: 0; color: #888; font-size: 12px;">
                This is an automated message from Mavi HRMS. Please do not reply to this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
  }),
};

export default { sendEmail, emailTemplates };
