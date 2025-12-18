import prisma from '@shared/config/database.js';
import { createAuditLog } from '@shared/utilities/audit.js';
import { verifyEmailConfig } from '@shared/services/email.js';

// ==================== GET EMAIL PREFERENCES ====================

/**
 * Get current user's email preferences
 */
export async function getEmailPreferences(req, res) {
  const tenantId = req.user.tenantId;
  const userId = req.user.id;

  let preferences = await prisma.emailPreference.findUnique({
    where: { userId },
  });

  // If no preferences exist, create default preferences
  if (!preferences) {
    preferences = await prisma.emailPreference.create({
      data: {
        tenantId,
        userId,
        // All defaults are true in the schema
      },
    });
  }

  res.json({
    success: true,
    data: preferences,
  });
}

// ==================== UPDATE EMAIL PREFERENCES ====================

/**
 * Update current user's email preferences
 */
export async function updateEmailPreferences(req, res) {
  const tenantId = req.user.tenantId;
  const userId = req.user.id;

  const {
    leaveRequested,
    leaveApproved,
    leaveRejected,
    payslipGenerated,
    salaryRevised,
    birthdayReminder,
    anniversaryReminder,
    announcements,
    systemAlerts,
    digestEnabled,
    digestTime,
  } = req.body;

  // Build update data - only include fields that are provided
  const updateData = {};
  if (typeof leaveRequested === 'boolean') updateData.leaveRequested = leaveRequested;
  if (typeof leaveApproved === 'boolean') updateData.leaveApproved = leaveApproved;
  if (typeof leaveRejected === 'boolean') updateData.leaveRejected = leaveRejected;
  if (typeof payslipGenerated === 'boolean') updateData.payslipGenerated = payslipGenerated;
  if (typeof salaryRevised === 'boolean') updateData.salaryRevised = salaryRevised;
  if (typeof birthdayReminder === 'boolean') updateData.birthdayReminder = birthdayReminder;
  if (typeof anniversaryReminder === 'boolean') updateData.anniversaryReminder = anniversaryReminder;
  if (typeof announcements === 'boolean') updateData.announcements = announcements;
  if (typeof systemAlerts === 'boolean') updateData.systemAlerts = systemAlerts;
  if (typeof digestEnabled === 'boolean') updateData.digestEnabled = digestEnabled;
  if (digestTime) updateData.digestTime = digestTime;

  // Upsert preferences (create if not exists, update if exists)
  const preferences = await prisma.emailPreference.upsert({
    where: { userId },
    create: {
      tenantId,
      userId,
      ...updateData,
    },
    update: updateData,
  });

  // Audit log
  await createAuditLog({
    tenantId,
    userId,
    action: 'UPDATE',
    entity: 'EmailPreference',
    entityId: preferences.id,
    newValue: updateData,
    req,
  });

  res.json({
    success: true,
    data: preferences,
    message: 'Email preferences updated successfully',
  });
}

// ==================== GET USER EMAIL PREFERENCE (for sending emails) ====================

/**
 * Check if a user wants to receive a specific type of email
 * Used internally when sending emails
 */
export async function shouldSendEmail(userId, preferenceKey) {
  const preferences = await prisma.emailPreference.findUnique({
    where: { userId },
  });

  // If no preferences, default to sending (true)
  if (!preferences) return true;

  // Check if digest is enabled - if so, don't send individual emails
  if (preferences.digestEnabled && preferenceKey !== 'systemAlerts') {
    return false;
  }

  // Return the specific preference value
  return preferences[preferenceKey] ?? true;
}

/**
 * Get users who want to receive a specific type of email
 */
export async function getUsersForEmail(tenantId, preferenceKey, userIds = null) {
  const whereClause = {
    tenantId,
    isActive: true,
  };

  if (userIds) {
    whereClause.id = { in: userIds };
  }

  const users = await prisma.user.findMany({
    where: whereClause,
    include: {
      emailPreference: true,
    },
  });

  // Filter users who want to receive this type of email
  return users.filter(user => {
    const prefs = user.emailPreference;
    // If no preferences, default to sending
    if (!prefs) return true;
    // If digest is enabled, don't send individual emails (except system alerts)
    if (prefs.digestEnabled && preferenceKey !== 'systemAlerts') return false;
    // Return the specific preference value
    return prefs[preferenceKey] ?? true;
  });
}

// ==================== TEST EMAIL CONFIGURATION ====================

/**
 * Test email configuration by sending a test email
 */
export async function testEmailConfiguration(req, res) {
  const result = await verifyEmailConfig();

  if (result.success) {
    res.json({
      success: true,
      message: 'Email configuration is valid',
    });
  } else {
    res.status(500).json({
      success: false,
      message: 'Email configuration is invalid',
      error: result.error,
    });
  }
}

// ==================== ENABLE/DISABLE ALL EMAILS ====================

/**
 * Quick toggle to enable or disable all email notifications
 */
export async function toggleAllEmails(req, res) {
  const tenantId = req.user.tenantId;
  const userId = req.user.id;
  const { enabled } = req.body;

  if (typeof enabled !== 'boolean') {
    return res.status(400).json({
      success: false,
      message: 'enabled must be a boolean',
    });
  }

  const updateData = {
    leaveRequested: enabled,
    leaveApproved: enabled,
    leaveRejected: enabled,
    payslipGenerated: enabled,
    salaryRevised: enabled,
    birthdayReminder: enabled,
    anniversaryReminder: enabled,
    announcements: enabled,
    systemAlerts: enabled,
  };

  const preferences = await prisma.emailPreference.upsert({
    where: { userId },
    create: {
      tenantId,
      userId,
      ...updateData,
    },
    update: updateData,
  });

  // Audit log
  await createAuditLog({
    tenantId,
    userId,
    action: 'UPDATE',
    entity: 'EmailPreference',
    entityId: preferences.id,
    newValue: { allEmails: enabled },
    req,
  });

  res.json({
    success: true,
    data: preferences,
    message: `All email notifications ${enabled ? 'enabled' : 'disabled'}`,
  });
}
