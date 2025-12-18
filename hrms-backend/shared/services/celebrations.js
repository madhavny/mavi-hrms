import cron from 'node-cron';
import prisma from '@shared/config/database.js';
import { createBulkNotifications } from '../../web/tenant/notifications.js';
import { emailTemplates, sendBulkEmail } from './email.js';

// ==================== CELEBRATION HELPERS ====================

/**
 * Check if today is someone's birthday (matching month and day)
 */
function isBirthdayToday(dateOfBirth) {
  if (!dateOfBirth) return false;
  const today = new Date();
  const dob = new Date(dateOfBirth);
  return today.getMonth() === dob.getMonth() && today.getDate() === dob.getDate();
}

/**
 * Check if today is someone's work anniversary
 */
function isAnniversaryToday(joiningDate) {
  if (!joiningDate) return false;
  const today = new Date();
  const joinDate = new Date(joiningDate);
  // Must have been employed for at least 1 year
  if (today.getFullYear() <= joinDate.getFullYear()) return false;
  return today.getMonth() === joinDate.getMonth() && today.getDate() === joinDate.getDate();
}

/**
 * Calculate years of service
 */
function calculateYearsOfService(joiningDate) {
  if (!joiningDate) return 0;
  const today = new Date();
  const joinDate = new Date(joiningDate);
  return today.getFullYear() - joinDate.getFullYear();
}

/**
 * Get employees with birthdays in a date range
 */
export async function getUpcomingBirthdays(tenantId, days = 7) {
  const today = new Date();
  const endDate = new Date();
  endDate.setDate(today.getDate() + days);

  const employees = await prisma.user.findMany({
    where: {
      tenantId,
      isActive: true,
      dateOfBirth: { not: null },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      avatar: true,
      dateOfBirth: true,
      department: { select: { name: true } },
      designation: { select: { name: true } },
    },
  });

  // Filter to those with birthdays in the next N days
  const upcomingBirthdays = employees
    .map(emp => {
      const dob = new Date(emp.dateOfBirth);
      // Create this year's birthday date
      const birthdayThisYear = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
      // If birthday already passed this year, use next year
      if (birthdayThisYear < today) {
        birthdayThisYear.setFullYear(today.getFullYear() + 1);
      }

      const diffDays = Math.ceil((birthdayThisYear - today) / (1000 * 60 * 60 * 24));

      return {
        ...emp,
        name: `${emp.firstName || ''} ${emp.lastName || ''}`.trim(),
        birthdayDate: birthdayThisYear,
        daysUntil: diffDays,
        isToday: diffDays === 0,
      };
    })
    .filter(emp => emp.daysUntil >= 0 && emp.daysUntil <= days)
    .sort((a, b) => a.daysUntil - b.daysUntil);

  return upcomingBirthdays;
}

/**
 * Get employees with work anniversaries in a date range
 */
export async function getUpcomingAnniversaries(tenantId, days = 7) {
  const today = new Date();
  const endDate = new Date();
  endDate.setDate(today.getDate() + days);

  const employees = await prisma.user.findMany({
    where: {
      tenantId,
      isActive: true,
      dateOfJoining: { not: null },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      avatar: true,
      dateOfJoining: true,
      department: { select: { name: true } },
      designation: { select: { name: true } },
    },
  });

  // Filter to those with anniversaries in the next N days
  const upcomingAnniversaries = employees
    .map(emp => {
      const joinDate = new Date(emp.dateOfJoining);
      // Create this year's anniversary date
      const anniversaryThisYear = new Date(today.getFullYear(), joinDate.getMonth(), joinDate.getDate());
      // If anniversary already passed this year, use next year
      if (anniversaryThisYear < today) {
        anniversaryThisYear.setFullYear(today.getFullYear() + 1);
      }

      const years = anniversaryThisYear.getFullYear() - joinDate.getFullYear();
      const diffDays = Math.ceil((anniversaryThisYear - today) / (1000 * 60 * 60 * 24));

      return {
        ...emp,
        name: `${emp.firstName || ''} ${emp.lastName || ''}`.trim(),
        anniversaryDate: anniversaryThisYear,
        years,
        daysUntil: diffDays,
        isToday: diffDays === 0,
      };
    })
    .filter(emp => emp.years >= 1 && emp.daysUntil >= 0 && emp.daysUntil <= days)
    .sort((a, b) => a.daysUntil - b.daysUntil);

  return upcomingAnniversaries;
}

// ==================== NOTIFICATION SENDERS ====================

/**
 * Send birthday notifications to all employees in a tenant
 */
async function sendBirthdayNotifications(tenantId, birthdayPerson) {
  const allUsers = await prisma.user.findMany({
    where: {
      tenantId,
      isActive: true,
      id: { not: birthdayPerson.id }, // Exclude the birthday person
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      emailPreference: true,
    },
  });

  const birthdayDate = new Date(birthdayPerson.dateOfBirth).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
  });

  // In-app notifications
  const notifications = allUsers.map(user => ({
    tenantId,
    userId: user.id,
    type: 'BIRTHDAY_REMINDER',
    title: '🎂 Birthday Today!',
    message: `Today is ${birthdayPerson.name}'s birthday! Wish them a happy birthday!`,
    link: `/employees/${birthdayPerson.id}`,
    metadata: { employeeId: birthdayPerson.id },
  }));

  if (notifications.length > 0) {
    await createBulkNotifications(notifications);
  }

  // Email notifications (respecting preferences)
  const usersToEmail = allUsers.filter(u =>
    !u.emailPreference || u.emailPreference.birthdayReminder !== false
  );

  if (usersToEmail.length > 0) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { slug: true },
    });

    for (const user of usersToEmail) {
      try {
        const { subject, html } = emailTemplates.birthdayReminder({
          employeeName: birthdayPerson.name,
          birthdayDate,
          link: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/${tenant?.slug || 'default'}/employees/${birthdayPerson.id}`,
        });

        // Queue email instead of sending immediately to avoid blocking
        await import('./email.js').then(m => m.queueEmail({
          to: user.email,
          subject,
          html,
        }));
      } catch (err) {
        console.error(`Failed to queue birthday email for ${user.email}:`, err.message);
      }
    }
  }

  console.log(`Sent birthday notifications for ${birthdayPerson.name} to ${notifications.length} users`);
}

/**
 * Send work anniversary notifications to all employees in a tenant
 */
async function sendAnniversaryNotifications(tenantId, anniversaryPerson, years) {
  const allUsers = await prisma.user.findMany({
    where: {
      tenantId,
      isActive: true,
      id: { not: anniversaryPerson.id }, // Exclude the anniversary person
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      emailPreference: true,
    },
  });

  const anniversaryDate = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // In-app notifications
  const notifications = allUsers.map(user => ({
    tenantId,
    userId: user.id,
    type: 'ANNIVERSARY_REMINDER',
    title: '🎉 Work Anniversary!',
    message: `Congratulations to ${anniversaryPerson.name} on completing ${years} year${years > 1 ? 's' : ''} with us!`,
    link: `/employees/${anniversaryPerson.id}`,
    metadata: { employeeId: anniversaryPerson.id, years },
  }));

  if (notifications.length > 0) {
    await createBulkNotifications(notifications);
  }

  // Email notifications (respecting preferences)
  const usersToEmail = allUsers.filter(u =>
    !u.emailPreference || u.emailPreference.anniversaryReminder !== false
  );

  if (usersToEmail.length > 0) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { slug: true },
    });

    for (const user of usersToEmail) {
      try {
        const { subject, html } = emailTemplates.anniversaryReminder({
          employeeName: anniversaryPerson.name,
          years,
          anniversaryDate,
          link: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/${tenant?.slug || 'default'}/employees/${anniversaryPerson.id}`,
        });

        await import('./email.js').then(m => m.queueEmail({
          to: user.email,
          subject,
          html,
        }));
      } catch (err) {
        console.error(`Failed to queue anniversary email for ${user.email}:`, err.message);
      }
    }
  }

  console.log(`Sent anniversary notifications for ${anniversaryPerson.name} (${years} years) to ${notifications.length} users`);
}

// ==================== DAILY CHECK FUNCTIONS ====================

/**
 * Check all tenants for birthdays and send notifications
 */
async function checkBirthdays() {
  console.log('[Celebrations] Checking for birthdays...');

  const tenants = await prisma.tenant.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, name: true },
  });

  for (const tenant of tenants) {
    const employees = await prisma.user.findMany({
      where: {
        tenantId: tenant.id,
        isActive: true,
        dateOfBirth: { not: null },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        dateOfBirth: true,
      },
    });

    for (const emp of employees) {
      if (isBirthdayToday(emp.dateOfBirth)) {
        const name = `${emp.firstName || ''} ${emp.lastName || ''}`.trim();
        console.log(`[Celebrations] Birthday today: ${name} (Tenant: ${tenant.name})`);
        await sendBirthdayNotifications(tenant.id, { ...emp, name });
      }
    }
  }

  console.log('[Celebrations] Birthday check complete');
}

/**
 * Check all tenants for work anniversaries and send notifications
 */
async function checkAnniversaries() {
  console.log('[Celebrations] Checking for work anniversaries...');

  const tenants = await prisma.tenant.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, name: true },
  });

  for (const tenant of tenants) {
    const employees = await prisma.user.findMany({
      where: {
        tenantId: tenant.id,
        isActive: true,
        dateOfJoining: { not: null },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        dateOfJoining: true,
      },
    });

    for (const emp of employees) {
      if (isAnniversaryToday(emp.dateOfJoining)) {
        const name = `${emp.firstName || ''} ${emp.lastName || ''}`.trim();
        const years = calculateYearsOfService(emp.dateOfJoining);
        console.log(`[Celebrations] Work anniversary: ${name} - ${years} years (Tenant: ${tenant.name})`);
        await sendAnniversaryNotifications(tenant.id, { ...emp, name }, years);
      }
    }
  }

  console.log('[Celebrations] Anniversary check complete');
}

// ==================== CRON JOB SCHEDULER ====================

let birthdayCronJob = null;
let anniversaryCronJob = null;

/**
 * Start the celebration cron jobs
 * Runs daily at 8:00 AM
 */
export function startCelebrationJobs() {
  // Run birthday check at 8:00 AM every day
  birthdayCronJob = cron.schedule('0 8 * * *', () => {
    checkBirthdays().catch(err => {
      console.error('[Celebrations] Birthday check failed:', err);
    });
  }, {
    timezone: 'Asia/Kolkata',
  });

  // Run anniversary check at 8:00 AM every day
  anniversaryCronJob = cron.schedule('0 8 * * *', () => {
    checkAnniversaries().catch(err => {
      console.error('[Celebrations] Anniversary check failed:', err);
    });
  }, {
    timezone: 'Asia/Kolkata',
  });

  console.log('[Celebrations] Cron jobs started - daily at 8:00 AM IST');
}

/**
 * Stop the celebration cron jobs
 */
export function stopCelebrationJobs() {
  if (birthdayCronJob) {
    birthdayCronJob.stop();
    birthdayCronJob = null;
  }
  if (anniversaryCronJob) {
    anniversaryCronJob.stop();
    anniversaryCronJob = null;
  }
  console.log('[Celebrations] Cron jobs stopped');
}

/**
 * Manually trigger celebration checks (for testing)
 */
export async function triggerCelebrationCheck() {
  await checkBirthdays();
  await checkAnniversaries();
}

export default {
  getUpcomingBirthdays,
  getUpcomingAnniversaries,
  startCelebrationJobs,
  stopCelebrationJobs,
  triggerCelebrationCheck,
};
