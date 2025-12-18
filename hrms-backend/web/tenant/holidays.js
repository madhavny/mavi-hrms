import prisma from '../../shared/config/database.js';
import { createAuditLog } from '../../shared/utilities/audit.js';

// ==================== WEEKLY OFF HELPERS ====================

/**
 * Check if a given date is a weekly off based on pattern
 * @param {Date} date - Date to check
 * @param {string} pattern - WeeklyOffPattern enum value
 * @param {number[]} customDays - Array of day numbers (0=Sun, 6=Sat) for CUSTOM pattern
 * @returns {boolean}
 */
export const isWeeklyOff = (date, pattern, customDays = []) => {
  const dayOfWeek = date.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const dayOfMonth = date.getDate();

  // Calculate which occurrence of this weekday in the month (1st, 2nd, 3rd, 4th, 5th)
  const weekOfMonth = Math.ceil(dayOfMonth / 7);

  // Get last day of month to check if it's last Saturday
  const lastDayOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const isLastWeek = dayOfMonth > lastDayOfMonth - 7;

  switch (pattern) {
    case 'ALL_SATURDAYS_SUNDAYS':
      return dayOfWeek === 0 || dayOfWeek === 6; // Sun or Sat

    case 'ONLY_SUNDAYS':
      return dayOfWeek === 0; // Only Sunday

    case 'SECOND_FOURTH_SAT_SUNDAYS':
      if (dayOfWeek === 0) return true; // All Sundays
      if (dayOfWeek === 6 && (weekOfMonth === 2 || weekOfMonth === 4)) return true; // 2nd & 4th Sat
      return false;

    case 'SECOND_LAST_SAT_SUNDAYS':
      if (dayOfWeek === 0) return true; // All Sundays
      if (dayOfWeek === 6 && (weekOfMonth === 2 || isLastWeek)) return true; // 2nd & last Sat
      return false;

    case 'ALTERNATE_SATURDAYS_SUNDAYS':
      if (dayOfWeek === 0) return true; // All Sundays
      if (dayOfWeek === 6 && weekOfMonth % 2 === 0) return true; // Alternate Sat (2nd, 4th)
      return false;

    case 'CUSTOM':
      return customDays.includes(dayOfWeek);

    default:
      return dayOfWeek === 0 || dayOfWeek === 6; // Default to Sat+Sun
  }
};

// ==================== WEEKLY OFF CONFIG ====================

export const getWeeklyOffConfig = async (req, res) => {
  const { tenantId } = req.user;

  let config = await prisma.weeklyOffConfig.findUnique({
    where: { tenantId },
  });

  // Create default config if not exists
  if (!config) {
    config = await prisma.weeklyOffConfig.create({
      data: {
        tenantId,
        pattern: 'ALL_SATURDAYS_SUNDAYS',
      },
    });
  }

  res.json({ success: true, data: config });
};

export const updateWeeklyOffConfig = async (req, res) => {
  const { tenantId, id: userId } = req.user;
  const { pattern, customDays, effectiveFrom } = req.body;

  // Validate pattern
  const validPatterns = [
    'ALL_SATURDAYS_SUNDAYS',
    'ONLY_SUNDAYS',
    'SECOND_FOURTH_SAT_SUNDAYS',
    'SECOND_LAST_SAT_SUNDAYS',
    'ALTERNATE_SATURDAYS_SUNDAYS',
    'CUSTOM',
  ];

  if (!validPatterns.includes(pattern)) {
    return res.status(400).json({ error: 'Invalid weekly off pattern' });
  }

  // Validate customDays for CUSTOM pattern
  if (pattern === 'CUSTOM') {
    if (!Array.isArray(customDays) || customDays.length === 0) {
      return res.status(400).json({ error: 'Custom days required for CUSTOM pattern' });
    }
    if (!customDays.every(d => d >= 0 && d <= 6)) {
      return res.status(400).json({ error: 'Custom days must be between 0 (Sun) and 6 (Sat)' });
    }
  }

  const existing = await prisma.weeklyOffConfig.findUnique({
    where: { tenantId },
  });

  const config = await prisma.weeklyOffConfig.upsert({
    where: { tenantId },
    create: {
      tenantId,
      pattern,
      customDays: pattern === 'CUSTOM' ? customDays : null,
      effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : new Date(),
    },
    update: {
      pattern,
      customDays: pattern === 'CUSTOM' ? customDays : null,
      effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : undefined,
    },
  });

  await createAuditLog({
    tenantId,
    userId,
    action: existing ? 'UPDATE' : 'CREATE',
    entity: 'WEEKLY_OFF_CONFIG',
    entityId: config.id,
    oldData: existing,
    newData: config,
  });

  res.json({ success: true, data: config });
};

// ==================== HOLIDAY CRUD ====================

export const listHolidays = async (req, res) => {
  const { tenantId } = req.user;
  const { year, type, month, page = 1, limit = 100, includeInactive = false } = req.query;

  const where = { tenantId };

  if (!includeInactive || includeInactive === 'false') {
    where.isActive = true;
  }

  if (type) {
    where.type = type;
  }

  // Filter by year
  if (year) {
    const startOfYear = new Date(`${year}-01-01`);
    const endOfYear = new Date(`${year}-12-31`);
    where.date = { gte: startOfYear, lte: endOfYear };
  }

  // Filter by month (within year)
  if (month && year) {
    const startOfMonth = new Date(`${year}-${month.padStart(2, '0')}-01`);
    const endOfMonth = new Date(parseInt(year), parseInt(month), 0);
    where.date = { gte: startOfMonth, lte: endOfMonth };
  }

  const [holidays, total] = await Promise.all([
    prisma.holiday.findMany({
      where,
      include: {
        creator: {
          select: { id: true, firstName: true, lastName: true },
        },
        _count: {
          select: { optionalSelections: true },
        },
      },
      orderBy: { date: 'asc' },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit),
    }),
    prisma.holiday.count({ where }),
  ]);

  res.json({
    success: true,
    data: {
      holidays,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
    },
  });
};

export const getHoliday = async (req, res) => {
  const { tenantId } = req.user;
  const { id } = req.params;

  const holiday = await prisma.holiday.findFirst({
    where: {
      id: parseInt(id),
      tenantId,
    },
    include: {
      creator: {
        select: { id: true, firstName: true, lastName: true },
      },
      optionalSelections: {
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      },
    },
  });

  if (!holiday) {
    return res.status(404).json({ error: 'Holiday not found' });
  }

  res.json({ success: true, data: holiday });
};

export const createHoliday = async (req, res) => {
  const { tenantId, id: userId } = req.user;
  const { name, date, type = 'FIXED', description } = req.body;

  if (!name || !date) {
    return res.status(400).json({ error: 'Name and date are required' });
  }

  // Check for duplicate date
  const existing = await prisma.holiday.findFirst({
    where: {
      tenantId,
      date: new Date(date),
    },
  });

  if (existing) {
    return res.status(400).json({
      error: `A holiday already exists on ${new Date(date).toDateString()}: ${existing.name}`
    });
  }

  const holiday = await prisma.holiday.create({
    data: {
      tenantId,
      name,
      date: new Date(date),
      type,
      description,
      createdBy: userId,
    },
    include: {
      creator: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  });

  await createAuditLog({
    tenantId,
    userId,
    action: 'CREATE',
    entity: 'HOLIDAY',
    entityId: holiday.id,
    newData: holiday,
  });

  res.status(201).json({ success: true, data: holiday });
};

export const updateHoliday = async (req, res) => {
  const { tenantId, id: userId } = req.user;
  const { id } = req.params;
  const { name, date, type, description, isActive } = req.body;

  const existing = await prisma.holiday.findFirst({
    where: {
      id: parseInt(id),
      tenantId,
    },
  });

  if (!existing) {
    return res.status(404).json({ error: 'Holiday not found' });
  }

  // Check for duplicate date if date is being changed
  if (date && new Date(date).getTime() !== new Date(existing.date).getTime()) {
    const duplicate = await prisma.holiday.findFirst({
      where: {
        tenantId,
        date: new Date(date),
        id: { not: parseInt(id) },
      },
    });

    if (duplicate) {
      return res.status(400).json({
        error: `A holiday already exists on ${new Date(date).toDateString()}: ${duplicate.name}`
      });
    }
  }

  const holiday = await prisma.holiday.update({
    where: { id: parseInt(id) },
    data: {
      name,
      date: date ? new Date(date) : undefined,
      type,
      description,
      isActive,
    },
    include: {
      creator: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  });

  await createAuditLog({
    tenantId,
    userId,
    action: 'UPDATE',
    entity: 'HOLIDAY',
    entityId: holiday.id,
    oldData: existing,
    newData: holiday,
  });

  res.json({ success: true, data: holiday });
};

export const deleteHoliday = async (req, res) => {
  const { tenantId, id: userId } = req.user;
  const { id } = req.params;

  const existing = await prisma.holiday.findFirst({
    where: {
      id: parseInt(id),
      tenantId,
    },
    include: {
      _count: {
        select: { optionalSelections: true },
      },
    },
  });

  if (!existing) {
    return res.status(404).json({ error: 'Holiday not found' });
  }

  // Check for selections
  if (existing._count.optionalSelections > 0) {
    return res.status(400).json({
      error: `Cannot delete holiday with ${existing._count.optionalSelections} employee selections. Deactivate instead.`
    });
  }

  await prisma.holiday.delete({
    where: { id: parseInt(id) },
  });

  await createAuditLog({
    tenantId,
    userId,
    action: 'DELETE',
    entity: 'HOLIDAY',
    entityId: parseInt(id),
    oldData: existing,
  });

  res.json({ success: true, message: 'Holiday deleted successfully' });
};

// ==================== BULK IMPORT ====================

export const downloadHolidayTemplate = async (req, res) => {
  const template = `name,date,type,description
Republic Day,2025-01-26,FIXED,National Holiday
Holi,2025-03-14,OPTIONAL,Festival of Colors
Good Friday,2025-04-18,OPTIONAL,Christian Holiday
Independence Day,2025-08-15,FIXED,National Holiday
Diwali,2025-10-20,FIXED,Festival of Lights`;

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=holiday-template.csv');
  res.send(template);
};

export const bulkImportHolidays = async (req, res) => {
  const { tenantId, id: userId } = req.user;
  const { holidays } = req.body;

  if (!Array.isArray(holidays) || holidays.length === 0) {
    return res.status(400).json({ error: 'No holidays provided' });
  }

  if (holidays.length > 100) {
    return res.status(400).json({ error: 'Maximum 100 holidays can be imported at once' });
  }

  const results = {
    success: [],
    errors: [],
  };

  // Validate all holidays first
  const existingDates = await prisma.holiday.findMany({
    where: { tenantId },
    select: { date: true, name: true },
  });

  const existingDateMap = new Map(
    existingDates.map(h => [new Date(h.date).toISOString().split('T')[0], h.name])
  );

  const validHolidays = [];
  const seenDates = new Set();

  for (let i = 0; i < holidays.length; i++) {
    const row = holidays[i];
    const rowNum = i + 1;

    // Validate required fields
    if (!row.name || !row.date) {
      results.errors.push({ row: rowNum, error: 'Name and date are required' });
      continue;
    }

    // Validate date format
    const dateObj = new Date(row.date);
    if (isNaN(dateObj.getTime())) {
      results.errors.push({ row: rowNum, error: `Invalid date format: ${row.date}` });
      continue;
    }

    const dateKey = dateObj.toISOString().split('T')[0];

    // Check for duplicate in file
    if (seenDates.has(dateKey)) {
      results.errors.push({ row: rowNum, error: `Duplicate date in file: ${dateKey}` });
      continue;
    }
    seenDates.add(dateKey);

    // Check for existing holiday
    if (existingDateMap.has(dateKey)) {
      results.errors.push({
        row: rowNum,
        error: `Holiday already exists on ${dateKey}: ${existingDateMap.get(dateKey)}`
      });
      continue;
    }

    // Validate type
    const type = row.type?.toUpperCase() || 'FIXED';
    if (!['FIXED', 'OPTIONAL', 'RESTRICTED'].includes(type)) {
      results.errors.push({ row: rowNum, error: `Invalid type: ${row.type}` });
      continue;
    }

    validHolidays.push({
      tenantId,
      name: row.name.trim(),
      date: dateObj,
      type,
      description: row.description?.trim() || null,
      createdBy: userId,
    });
  }

  // Bulk create valid holidays
  if (validHolidays.length > 0) {
    const created = await prisma.holiday.createMany({
      data: validHolidays,
    });

    results.success = validHolidays.map(h => ({
      name: h.name,
      date: h.date.toISOString().split('T')[0],
      type: h.type,
    }));

    await createAuditLog({
      tenantId,
      userId,
      action: 'BULK_CREATE',
      entity: 'HOLIDAY',
      entityId: 0,
      newData: { count: created.count, holidays: results.success },
    });
  }

  res.json({
    success: true,
    data: {
      created: results.success.length,
      failed: results.errors.length,
      results,
    },
  });
};

// ==================== OPTIONAL HOLIDAY QUOTA ====================

export const getOptionalHolidayQuota = async (req, res) => {
  const { tenantId, id: userId } = req.user;
  const { year = new Date().getFullYear() } = req.query;

  let quota = await prisma.optionalHolidayQuota.findUnique({
    where: {
      tenantId_year: { tenantId, year: parseInt(year) },
    },
  });

  // Create default quota if not exists
  if (!quota) {
    quota = await prisma.optionalHolidayQuota.create({
      data: {
        tenantId,
        year: parseInt(year),
        maxOptional: 3,
      },
    });
  }

  // Get user's used optional holidays
  const usedCount = await prisma.optionalHolidaySelection.count({
    where: {
      tenantId,
      userId,
      year: parseInt(year),
      status: 'SELECTED',
    },
  });

  res.json({
    success: true,
    data: {
      ...quota,
      used: usedCount,
      available: quota.maxOptional - usedCount,
    },
  });
};

export const updateOptionalHolidayQuota = async (req, res) => {
  const { tenantId, id: userId } = req.user;
  const { year = new Date().getFullYear(), maxOptional } = req.body;

  if (maxOptional < 0 || maxOptional > 20) {
    return res.status(400).json({ error: 'Max optional holidays must be between 0 and 20' });
  }

  const existing = await prisma.optionalHolidayQuota.findUnique({
    where: {
      tenantId_year: { tenantId, year: parseInt(year) },
    },
  });

  const quota = await prisma.optionalHolidayQuota.upsert({
    where: {
      tenantId_year: { tenantId, year: parseInt(year) },
    },
    create: {
      tenantId,
      year: parseInt(year),
      maxOptional,
    },
    update: {
      maxOptional,
    },
  });

  await createAuditLog({
    tenantId,
    userId,
    action: existing ? 'UPDATE' : 'CREATE',
    entity: 'OPTIONAL_HOLIDAY_QUOTA',
    entityId: quota.id,
    oldData: existing,
    newData: quota,
  });

  res.json({ success: true, data: quota });
};

// ==================== OPTIONAL HOLIDAY SELECTION ====================

export const getMyOptionalHolidays = async (req, res) => {
  const { tenantId, id: userId } = req.user;
  const { year = new Date().getFullYear() } = req.query;

  const selections = await prisma.optionalHolidaySelection.findMany({
    where: {
      tenantId,
      userId,
      year: parseInt(year),
      status: 'SELECTED',
    },
    include: {
      holiday: true,
    },
    orderBy: {
      holiday: { date: 'asc' },
    },
  });

  res.json({ success: true, data: selections });
};

export const selectOptionalHoliday = async (req, res) => {
  const { tenantId, id: userId } = req.user;
  const { id } = req.params;

  // Get the holiday
  const holiday = await prisma.holiday.findFirst({
    where: {
      id: parseInt(id),
      tenantId,
      type: 'OPTIONAL',
      isActive: true,
    },
  });

  if (!holiday) {
    return res.status(404).json({ error: 'Optional holiday not found' });
  }

  // Check if already past
  if (new Date(holiday.date) < new Date()) {
    return res.status(400).json({ error: 'Cannot select a holiday that has already passed' });
  }

  const year = new Date(holiday.date).getFullYear();

  // Check quota
  const quota = await prisma.optionalHolidayQuota.findUnique({
    where: { tenantId_year: { tenantId, year } },
  });

  const maxOptional = quota?.maxOptional || 3;

  const usedCount = await prisma.optionalHolidaySelection.count({
    where: {
      tenantId,
      userId,
      year,
      status: 'SELECTED',
    },
  });

  if (usedCount >= maxOptional) {
    return res.status(400).json({
      error: `You have already selected the maximum ${maxOptional} optional holidays for ${year}`
    });
  }

  // Check if already selected
  const existing = await prisma.optionalHolidaySelection.findUnique({
    where: {
      tenantId_holidayId_userId_year: {
        tenantId,
        holidayId: parseInt(id),
        userId,
        year,
      },
    },
  });

  if (existing && existing.status === 'SELECTED') {
    return res.status(400).json({ error: 'You have already selected this holiday' });
  }

  // Create or update selection
  const selection = await prisma.optionalHolidaySelection.upsert({
    where: {
      tenantId_holidayId_userId_year: {
        tenantId,
        holidayId: parseInt(id),
        userId,
        year,
      },
    },
    create: {
      tenantId,
      holidayId: parseInt(id),
      userId,
      year,
      status: 'SELECTED',
    },
    update: {
      status: 'SELECTED',
      selectedAt: new Date(),
    },
    include: {
      holiday: true,
    },
  });

  res.json({ success: true, data: selection });
};

export const cancelOptionalHolidaySelection = async (req, res) => {
  const { tenantId, id: userId } = req.user;
  const { id } = req.params;

  // Get the holiday
  const holiday = await prisma.holiday.findFirst({
    where: {
      id: parseInt(id),
      tenantId,
      type: 'OPTIONAL',
    },
  });

  if (!holiday) {
    return res.status(404).json({ error: 'Holiday not found' });
  }

  // Check if already past
  if (new Date(holiday.date) < new Date()) {
    return res.status(400).json({ error: 'Cannot cancel a holiday that has already passed' });
  }

  const year = new Date(holiday.date).getFullYear();

  // Find selection
  const selection = await prisma.optionalHolidaySelection.findUnique({
    where: {
      tenantId_holidayId_userId_year: {
        tenantId,
        holidayId: parseInt(id),
        userId,
        year,
      },
    },
  });

  if (!selection || selection.status !== 'SELECTED') {
    return res.status(404).json({ error: 'Selection not found' });
  }

  // Update to cancelled
  const updated = await prisma.optionalHolidaySelection.update({
    where: { id: selection.id },
    data: { status: 'CANCELLED' },
    include: {
      holiday: true,
    },
  });

  res.json({ success: true, data: updated });
};

// ==================== STATS & UTILITIES ====================

export const getHolidayStats = async (req, res) => {
  const { tenantId, id: userId } = req.user;
  const { year = new Date().getFullYear() } = req.query;

  const startOfYear = new Date(`${year}-01-01`);
  const endOfYear = new Date(`${year}-12-31`);
  const today = new Date();

  const [
    totalHolidays,
    fixedHolidays,
    optionalHolidays,
    upcomingHolidays,
    myOptionalCount,
    quota,
  ] = await Promise.all([
    prisma.holiday.count({
      where: { tenantId, isActive: true, date: { gte: startOfYear, lte: endOfYear } },
    }),
    prisma.holiday.count({
      where: { tenantId, isActive: true, type: 'FIXED', date: { gte: startOfYear, lte: endOfYear } },
    }),
    prisma.holiday.count({
      where: { tenantId, isActive: true, type: 'OPTIONAL', date: { gte: startOfYear, lte: endOfYear } },
    }),
    prisma.holiday.findMany({
      where: { tenantId, isActive: true, date: { gte: today, lte: endOfYear } },
      orderBy: { date: 'asc' },
      take: 5,
    }),
    prisma.optionalHolidaySelection.count({
      where: { tenantId, userId, year: parseInt(year), status: 'SELECTED' },
    }),
    prisma.optionalHolidayQuota.findUnique({
      where: { tenantId_year: { tenantId, year: parseInt(year) } },
    }),
  ]);

  // Get weekly off config
  const weeklyOffConfig = await prisma.weeklyOffConfig.findUnique({
    where: { tenantId },
  });

  res.json({
    success: true,
    data: {
      year: parseInt(year),
      totalHolidays,
      fixedHolidays,
      optionalHolidays,
      upcomingHolidays,
      weeklyOffPattern: weeklyOffConfig?.pattern || 'ALL_SATURDAYS_SUNDAYS',
      optionalQuota: {
        max: quota?.maxOptional || 3,
        used: myOptionalCount,
        available: (quota?.maxOptional || 3) - myOptionalCount,
      },
    },
  });
};

/**
 * Get all holidays within a date range
 * @param {number} tenantId
 * @param {Date} startDate
 * @param {Date} endDate
 * @param {number} userId - Optional, to include user's optional holidays
 * @returns {Promise<Holiday[]>}
 */
export const getHolidaysInRange = async (tenantId, startDate, endDate, userId = null) => {
  const where = {
    tenantId,
    isActive: true,
    date: { gte: startDate, lte: endDate },
  };

  // Get fixed holidays
  const holidays = await prisma.holiday.findMany({
    where: {
      ...where,
      OR: [
        { type: 'FIXED' },
        ...(userId ? [{
          type: 'OPTIONAL',
          optionalSelections: {
            some: {
              userId,
              status: 'SELECTED',
            },
          },
        }] : []),
      ],
    },
    orderBy: { date: 'asc' },
  });

  return holidays;
};

/**
 * Calculate working days between two dates excluding holidays and weekly offs
 * @param {number} tenantId
 * @param {Date} startDate
 * @param {Date} endDate
 * @param {number} userId - Optional, for user's optional holidays
 * @returns {Promise<{workingDays: number, totalDays: number, holidayDates: Date[], weeklyOffDates: Date[]}>}
 */
export const calculateWorkingDays = async (tenantId, startDate, endDate, userId = null) => {
  // Get weekly off config
  const weeklyOffConfig = await prisma.weeklyOffConfig.findUnique({
    where: { tenantId },
  });

  const pattern = weeklyOffConfig?.pattern || 'ALL_SATURDAYS_SUNDAYS';
  const customDays = weeklyOffConfig?.customDays || [];

  // Get holidays in range
  const holidays = await getHolidaysInRange(tenantId, startDate, endDate, userId);
  const holidayDateSet = new Set(
    holidays.map(h => new Date(h.date).toISOString().split('T')[0])
  );

  // Calculate working days
  const holidayDates = [];
  const weeklyOffDates = [];
  let workingDays = 0;
  let totalDays = 0;

  const current = new Date(startDate);
  while (current <= endDate) {
    totalDays++;
    const dateKey = current.toISOString().split('T')[0];

    if (holidayDateSet.has(dateKey)) {
      holidayDates.push(new Date(current));
    } else if (isWeeklyOff(current, pattern, customDays)) {
      weeklyOffDates.push(new Date(current));
    } else {
      workingDays++;
    }

    current.setDate(current.getDate() + 1);
  }

  return {
    workingDays,
    totalDays,
    holidayDates,
    weeklyOffDates,
    holidays: holidays.map(h => ({ date: h.date, name: h.name, type: h.type })),
  };
};
