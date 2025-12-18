import nodemailer from 'nodemailer';

// Email configuration
const emailConfig = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
};

// Create transporter
let transporter = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport(emailConfig);
  }
  return transporter;
}

// Email queue for retry mechanism
const emailQueue = [];
let isProcessingQueue = false;
const MAX_RETRIES = 3;
const RETRY_DELAY = 5000; // 5 seconds

// ==================== EMAIL TEMPLATES ====================

const baseTemplate = (content, title = 'Mavi HRMS') => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 0;
      background-color: #f5f5f5;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .card {
      background: #ffffff;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
      color: white;
      padding: 24px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
    }
    .header p {
      margin: 8px 0 0;
      opacity: 0.9;
      font-size: 14px;
    }
    .content {
      padding: 32px 24px;
    }
    .content h2 {
      margin: 0 0 16px;
      color: #1f2937;
      font-size: 20px;
    }
    .content p {
      margin: 0 0 16px;
      color: #4b5563;
    }
    .info-box {
      background: #f3f4f6;
      border-radius: 6px;
      padding: 16px;
      margin: 16px 0;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    .info-row:last-child {
      border-bottom: none;
    }
    .info-label {
      color: #6b7280;
      font-size: 14px;
    }
    .info-value {
      color: #1f2937;
      font-weight: 500;
      font-size: 14px;
    }
    .button {
      display: inline-block;
      background: #3b82f6;
      color: white !important;
      padding: 12px 24px;
      border-radius: 6px;
      text-decoration: none;
      font-weight: 500;
      margin: 16px 0;
    }
    .button:hover {
      background: #2563eb;
    }
    .button-success {
      background: #10b981;
    }
    .button-warning {
      background: #f59e0b;
    }
    .button-danger {
      background: #ef4444;
    }
    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 500;
      text-transform: uppercase;
    }
    .status-pending {
      background: #fef3c7;
      color: #92400e;
    }
    .status-approved {
      background: #d1fae5;
      color: #065f46;
    }
    .status-rejected {
      background: #fee2e2;
      color: #991b1b;
    }
    .footer {
      background: #f9fafb;
      padding: 24px;
      text-align: center;
      border-top: 1px solid #e5e7eb;
    }
    .footer p {
      margin: 0;
      color: #6b7280;
      font-size: 12px;
    }
    .footer a {
      color: #3b82f6;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      ${content}
      <div class="footer">
        <p>This is an automated email from Mavi HRMS. Please do not reply directly.</p>
        <p style="margin-top: 8px;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}">Login to HRMS</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>
`;

// ==================== EMAIL TEMPLATE GENERATORS ====================

export const emailTemplates = {
  // Leave Request Submitted (to manager/HR)
  leaveRequested: ({ employeeName, leaveType, startDate, endDate, days, reason, link }) => ({
    subject: `Leave Request: ${employeeName} - ${leaveType}`,
    html: baseTemplate(`
      <div class="header">
        <h1>New Leave Request</h1>
        <p>A new leave request requires your attention</p>
      </div>
      <div class="content">
        <h2>Leave Request Details</h2>
        <p><strong>${employeeName}</strong> has submitted a leave request that requires your review.</p>

        <div class="info-box">
          <div class="info-row">
            <span class="info-label">Employee</span>
            <span class="info-value">${employeeName}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Leave Type</span>
            <span class="info-value">${leaveType}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Duration</span>
            <span class="info-value">${startDate} to ${endDate} (${days} day${days > 1 ? 's' : ''})</span>
          </div>
          ${reason ? `
          <div class="info-row">
            <span class="info-label">Reason</span>
            <span class="info-value">${reason}</span>
          </div>
          ` : ''}
          <div class="info-row">
            <span class="info-label">Status</span>
            <span class="info-value"><span class="status-badge status-pending">Pending</span></span>
          </div>
        </div>

        <p style="text-align: center;">
          <a href="${link}" class="button">Review Request</a>
        </p>
      </div>
    `, 'Leave Request - Mavi HRMS'),
  }),

  // Leave Approved (to employee)
  leaveApproved: ({ employeeName, leaveType, startDate, endDate, days, approverName, link }) => ({
    subject: `Leave Approved: ${leaveType} (${startDate} - ${endDate})`,
    html: baseTemplate(`
      <div class="header" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
        <h1>Leave Approved</h1>
        <p>Your leave request has been approved</p>
      </div>
      <div class="content">
        <h2>Good news, ${employeeName}!</h2>
        <p>Your leave request has been approved by <strong>${approverName}</strong>.</p>

        <div class="info-box">
          <div class="info-row">
            <span class="info-label">Leave Type</span>
            <span class="info-value">${leaveType}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Duration</span>
            <span class="info-value">${startDate} to ${endDate} (${days} day${days > 1 ? 's' : ''})</span>
          </div>
          <div class="info-row">
            <span class="info-label">Approved By</span>
            <span class="info-value">${approverName}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Status</span>
            <span class="info-value"><span class="status-badge status-approved">Approved</span></span>
          </div>
        </div>

        <p style="text-align: center;">
          <a href="${link}" class="button button-success">View Leave Details</a>
        </p>
      </div>
    `, 'Leave Approved - Mavi HRMS'),
  }),

  // Leave Rejected (to employee)
  leaveRejected: ({ employeeName, leaveType, startDate, endDate, days, rejectorName, rejectionReason, link }) => ({
    subject: `Leave Request Declined: ${leaveType} (${startDate} - ${endDate})`,
    html: baseTemplate(`
      <div class="header" style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);">
        <h1>Leave Request Declined</h1>
        <p>Your leave request could not be approved</p>
      </div>
      <div class="content">
        <h2>Hello ${employeeName},</h2>
        <p>Unfortunately, your leave request has been declined by <strong>${rejectorName}</strong>.</p>

        <div class="info-box">
          <div class="info-row">
            <span class="info-label">Leave Type</span>
            <span class="info-value">${leaveType}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Duration</span>
            <span class="info-value">${startDate} to ${endDate} (${days} day${days > 1 ? 's' : ''})</span>
          </div>
          <div class="info-row">
            <span class="info-label">Declined By</span>
            <span class="info-value">${rejectorName}</span>
          </div>
          ${rejectionReason ? `
          <div class="info-row">
            <span class="info-label">Reason</span>
            <span class="info-value">${rejectionReason}</span>
          </div>
          ` : ''}
          <div class="info-row">
            <span class="info-label">Status</span>
            <span class="info-value"><span class="status-badge status-rejected">Rejected</span></span>
          </div>
        </div>

        <p>If you have questions, please contact your manager or HR department.</p>

        <p style="text-align: center;">
          <a href="${link}" class="button button-danger">View Details</a>
        </p>
      </div>
    `, 'Leave Declined - Mavi HRMS'),
  }),

  // Password Reset
  passwordReset: ({ userName, resetLink, expiresIn }) => ({
    subject: 'Password Reset Request - Mavi HRMS',
    html: baseTemplate(`
      <div class="header">
        <h1>Password Reset</h1>
        <p>Reset your account password</p>
      </div>
      <div class="content">
        <h2>Hello ${userName},</h2>
        <p>We received a request to reset your password. Click the button below to create a new password.</p>

        <p style="text-align: center;">
          <a href="${resetLink}" class="button">Reset Password</a>
        </p>

        <div class="info-box">
          <p style="margin: 0; text-align: center; color: #6b7280; font-size: 14px;">
            This link will expire in <strong>${expiresIn}</strong>.
          </p>
        </div>

        <p style="color: #6b7280; font-size: 14px;">
          If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
        </p>
      </div>
    `, 'Password Reset - Mavi HRMS'),
  }),

  // Payslip Generated
  payslipGenerated: ({ employeeName, month, year, netPay, link }) => ({
    subject: `Payslip Available: ${month} ${year}`,
    html: baseTemplate(`
      <div class="header" style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);">
        <h1>Payslip Available</h1>
        <p>Your payslip for ${month} ${year} is ready</p>
      </div>
      <div class="content">
        <h2>Hello ${employeeName},</h2>
        <p>Your payslip for <strong>${month} ${year}</strong> has been generated and is now available for viewing.</p>

        <div class="info-box">
          <div class="info-row">
            <span class="info-label">Pay Period</span>
            <span class="info-value">${month} ${year}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Net Pay</span>
            <span class="info-value" style="color: #10b981; font-size: 18px;">₹${netPay.toLocaleString('en-IN')}</span>
          </div>
        </div>

        <p style="text-align: center;">
          <a href="${link}" class="button" style="background: #8b5cf6;">View Payslip</a>
        </p>

        <p style="color: #6b7280; font-size: 14px;">
          For any queries regarding your payslip, please contact the HR department.
        </p>
      </div>
    `, 'Payslip Available - Mavi HRMS'),
  }),

  // Welcome Email (New Employee)
  welcomeEmployee: ({ employeeName, email, tempPassword, loginUrl, tenantName }) => ({
    subject: `Welcome to ${tenantName} - Your HRMS Account`,
    html: baseTemplate(`
      <div class="header" style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);">
        <h1>Welcome Aboard!</h1>
        <p>Your HRMS account is ready</p>
      </div>
      <div class="content">
        <h2>Welcome to ${tenantName}, ${employeeName}!</h2>
        <p>Your HRMS account has been created. You can now access the employee portal to manage your attendance, leaves, and more.</p>

        <div class="info-box">
          <div class="info-row">
            <span class="info-label">Email</span>
            <span class="info-value">${email}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Temporary Password</span>
            <span class="info-value" style="font-family: monospace;">${tempPassword}</span>
          </div>
        </div>

        <p style="text-align: center;">
          <a href="${loginUrl}" class="button">Login to HRMS</a>
        </p>

        <p style="color: #ef4444; font-size: 14px;">
          <strong>Important:</strong> Please change your password after your first login for security purposes.
        </p>
      </div>
    `, 'Welcome - Mavi HRMS'),
  }),

  // Birthday Reminder
  birthdayReminder: ({ employeeName, birthdayDate, link }) => ({
    subject: `Birthday Reminder: ${employeeName}`,
    html: baseTemplate(`
      <div class="header" style="background: linear-gradient(135deg, #ec4899 0%, #db2777 100%);">
        <h1>🎂 Birthday Reminder</h1>
        <p>Don't forget to wish!</p>
      </div>
      <div class="content">
        <h2>Birthday Alert!</h2>
        <p><strong>${employeeName}</strong> has a birthday coming up on <strong>${birthdayDate}</strong>!</p>

        <p style="font-size: 48px; text-align: center; margin: 24px 0;">🎉🎂🎈</p>

        <p style="text-align: center;">
          <a href="${link}" class="button" style="background: #ec4899;">View Profile</a>
        </p>
      </div>
    `, 'Birthday Reminder - Mavi HRMS'),
  }),

  // Work Anniversary
  anniversaryReminder: ({ employeeName, years, anniversaryDate, link }) => ({
    subject: `Work Anniversary: ${employeeName} - ${years} Year${years > 1 ? 's' : ''}`,
    html: baseTemplate(`
      <div class="header" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);">
        <h1>🎊 Work Anniversary</h1>
        <p>Celebrating ${years} year${years > 1 ? 's' : ''} of excellence!</p>
      </div>
      <div class="content">
        <h2>Congratulations!</h2>
        <p><strong>${employeeName}</strong> is celebrating their <strong>${years} year work anniversary</strong> on ${anniversaryDate}!</p>

        <p style="font-size: 48px; text-align: center; margin: 24px 0;">🎊🏆⭐</p>

        <p style="text-align: center;">
          <a href="${link}" class="button button-warning">View Profile</a>
        </p>
      </div>
    `, 'Work Anniversary - Mavi HRMS'),
  }),

  // Announcement
  announcement: ({ title, message, senderName, link }) => ({
    subject: `Announcement: ${title}`,
    html: baseTemplate(`
      <div class="header">
        <h1>📢 Announcement</h1>
        <p>From ${senderName}</p>
      </div>
      <div class="content">
        <h2>${title}</h2>
        <p>${message}</p>

        <p style="text-align: center; margin-top: 24px;">
          <a href="${link}" class="button">View in HRMS</a>
        </p>
      </div>
    `, 'Announcement - Mavi HRMS'),
  }),
};

// ==================== EMAIL SENDING FUNCTIONS ====================

/**
 * Send email with retry mechanism
 */
async function sendEmailWithRetry(mailOptions, retries = 0) {
  try {
    const transport = getTransporter();
    const result = await transport.sendMail({
      from: process.env.SMTP_FROM || '"Mavi HRMS" <noreply@mavihrms.com>',
      ...mailOptions,
    });
    console.log(`Email sent successfully to ${mailOptions.to}: ${result.messageId}`);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error(`Email send failed (attempt ${retries + 1}):`, error.message);

    if (retries < MAX_RETRIES) {
      console.log(`Retrying in ${RETRY_DELAY / 1000} seconds...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return sendEmailWithRetry(mailOptions, retries + 1);
    }

    return { success: false, error: error.message };
  }
}

/**
 * Queue email for sending
 */
export function queueEmail(mailOptions) {
  emailQueue.push(mailOptions);
  processEmailQueue();
}

/**
 * Process email queue
 */
async function processEmailQueue() {
  if (isProcessingQueue || emailQueue.length === 0) return;

  isProcessingQueue = true;

  while (emailQueue.length > 0) {
    const mailOptions = emailQueue.shift();
    await sendEmailWithRetry(mailOptions);
    // Small delay between emails to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  isProcessingQueue = false;
}

/**
 * Send email immediately (bypasses queue)
 */
export async function sendEmail(to, template, data) {
  const { subject, html } = template(data);
  return sendEmailWithRetry({ to, subject, html });
}

/**
 * Send email to multiple recipients
 */
export async function sendBulkEmail(recipients, template, dataGenerator) {
  const results = [];

  for (const recipient of recipients) {
    const data = typeof dataGenerator === 'function' ? dataGenerator(recipient) : dataGenerator;
    const result = await sendEmail(recipient.email, template, data);
    results.push({ email: recipient.email, ...result });
  }

  return results;
}

// ==================== EMAIL TRIGGER FUNCTIONS ====================

/**
 * Send leave request notification email
 */
export async function emailLeaveRequested({ recipientEmail, recipientName, employeeName, leaveType, startDate, endDate, days, reason, tenantSlug }) {
  const link = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/${tenantSlug}/leave-approvals`;

  return sendEmail(recipientEmail, emailTemplates.leaveRequested, {
    employeeName,
    leaveType,
    startDate: new Date(startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
    endDate: new Date(endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
    days,
    reason,
    link,
  });
}

/**
 * Send leave approved notification email
 */
export async function emailLeaveApproved({ recipientEmail, employeeName, leaveType, startDate, endDate, days, approverName, tenantSlug }) {
  const link = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/${tenantSlug}/leave`;

  return sendEmail(recipientEmail, emailTemplates.leaveApproved, {
    employeeName,
    leaveType,
    startDate: new Date(startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
    endDate: new Date(endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
    days,
    approverName,
    link,
  });
}

/**
 * Send leave rejected notification email
 */
export async function emailLeaveRejected({ recipientEmail, employeeName, leaveType, startDate, endDate, days, rejectorName, rejectionReason, tenantSlug }) {
  const link = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/${tenantSlug}/leave`;

  return sendEmail(recipientEmail, emailTemplates.leaveRejected, {
    employeeName,
    leaveType,
    startDate: new Date(startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
    endDate: new Date(endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
    days,
    rejectorName,
    rejectionReason,
    link,
  });
}

/**
 * Send password reset email
 */
export async function emailPasswordReset({ recipientEmail, userName, resetToken, tenantSlug }) {
  const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/${tenantSlug}/reset-password?token=${resetToken}`;

  return sendEmail(recipientEmail, emailTemplates.passwordReset, {
    userName,
    resetLink,
    expiresIn: '1 hour',
  });
}

/**
 * Send payslip notification email
 */
export async function emailPayslipGenerated({ recipientEmail, employeeName, month, year, netPay, tenantSlug }) {
  const link = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/${tenantSlug}/payroll/payslips`;

  return sendEmail(recipientEmail, emailTemplates.payslipGenerated, {
    employeeName,
    month,
    year,
    netPay,
    link,
  });
}

/**
 * Send welcome email to new employee
 */
export async function emailWelcomeEmployee({ recipientEmail, employeeName, tempPassword, tenantSlug, tenantName }) {
  const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/${tenantSlug}/login`;

  return sendEmail(recipientEmail, emailTemplates.welcomeEmployee, {
    employeeName,
    email: recipientEmail,
    tempPassword,
    loginUrl,
    tenantName,
  });
}

/**
 * Send announcement email
 */
export async function emailAnnouncement({ recipientEmail, title, message, senderName, tenantSlug }) {
  const link = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/${tenantSlug}/dashboard`;

  return sendEmail(recipientEmail, emailTemplates.announcement, {
    title,
    message,
    senderName,
    link,
  });
}

/**
 * Verify email configuration
 */
export async function verifyEmailConfig() {
  try {
    const transport = getTransporter();
    await transport.verify();
    console.log('Email configuration verified successfully');
    return { success: true };
  } catch (error) {
    console.error('Email configuration verification failed:', error.message);
    return { success: false, error: error.message };
  }
}

export default {
  sendEmail,
  sendBulkEmail,
  queueEmail,
  emailTemplates,
  emailLeaveRequested,
  emailLeaveApproved,
  emailLeaveRejected,
  emailPasswordReset,
  emailPayslipGenerated,
  emailWelcomeEmployee,
  emailAnnouncement,
  verifyEmailConfig,
};
