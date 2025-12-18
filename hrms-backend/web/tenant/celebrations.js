import { getUpcomingBirthdays, getUpcomingAnniversaries, triggerCelebrationCheck } from '@shared/services/celebrations.js';

// ==================== GET UPCOMING BIRTHDAYS ====================

/**
 * Get upcoming birthdays for the next N days
 */
export async function listUpcomingBirthdays(req, res) {
  const tenantId = req.user.tenantId;
  const { days = 7 } = req.query;

  const birthdays = await getUpcomingBirthdays(tenantId, parseInt(days));

  // Separate today's birthdays from upcoming
  const todayBirthdays = birthdays.filter(b => b.isToday);
  const upcomingBirthdays = birthdays.filter(b => !b.isToday);

  res.json({
    success: true,
    data: {
      today: todayBirthdays,
      upcoming: upcomingBirthdays,
      total: birthdays.length,
    },
  });
}

// ==================== GET UPCOMING ANNIVERSARIES ====================

/**
 * Get upcoming work anniversaries for the next N days
 */
export async function listUpcomingAnniversaries(req, res) {
  const tenantId = req.user.tenantId;
  const { days = 7 } = req.query;

  const anniversaries = await getUpcomingAnniversaries(tenantId, parseInt(days));

  // Separate today's anniversaries from upcoming
  const todayAnniversaries = anniversaries.filter(a => a.isToday);
  const upcomingAnniversaries = anniversaries.filter(a => !a.isToday);

  res.json({
    success: true,
    data: {
      today: todayAnniversaries,
      upcoming: upcomingAnniversaries,
      total: anniversaries.length,
    },
  });
}

// ==================== GET ALL CELEBRATIONS ====================

/**
 * Get all celebrations (birthdays + anniversaries) for the next N days
 */
export async function listAllCelebrations(req, res) {
  const tenantId = req.user.tenantId;
  const { days = 7 } = req.query;

  const [birthdays, anniversaries] = await Promise.all([
    getUpcomingBirthdays(tenantId, parseInt(days)),
    getUpcomingAnniversaries(tenantId, parseInt(days)),
  ]);

  // Today's celebrations
  const todayBirthdays = birthdays.filter(b => b.isToday);
  const todayAnniversaries = anniversaries.filter(a => a.isToday);

  // Combine and sort all celebrations by days until
  const allCelebrations = [
    ...birthdays.map(b => ({ ...b, type: 'birthday' })),
    ...anniversaries.map(a => ({ ...a, type: 'anniversary' })),
  ].sort((a, b) => a.daysUntil - b.daysUntil);

  res.json({
    success: true,
    data: {
      today: {
        birthdays: todayBirthdays,
        anniversaries: todayAnniversaries,
        total: todayBirthdays.length + todayAnniversaries.length,
      },
      upcoming: allCelebrations.filter(c => !c.isToday),
      summary: {
        totalBirthdays: birthdays.length,
        totalAnniversaries: anniversaries.length,
        total: birthdays.length + anniversaries.length,
      },
    },
  });
}

// ==================== TRIGGER CELEBRATION CHECK (Admin Only) ====================

/**
 * Manually trigger celebration check for testing
 */
export async function triggerCheck(req, res) {
  // Only admins can trigger this
  if (req.user.role?.code !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      message: 'Only admins can trigger celebration checks',
    });
  }

  await triggerCelebrationCheck();

  res.json({
    success: true,
    message: 'Celebration check triggered successfully',
  });
}
