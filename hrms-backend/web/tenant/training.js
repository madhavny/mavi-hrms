import prisma from '@shared/config/database.js';
import { createAuditLog } from '@shared/utilities/audit.js';

// ==================== TRAINING PROGRAMS ====================

export async function listTrainingPrograms(req, res) {
  const tenantId = req.user.tenantId;
  const { status, type, category, trainerId, startDate, endDate, page = 1, limit = 20 } = req.query;

  const where = { tenantId };

  if (status) where.status = status;
  if (type) where.type = type;
  if (category) where.category = category;
  if (trainerId) where.trainerId = parseInt(trainerId);

  if (startDate || endDate) {
    where.startDate = {};
    if (startDate) where.startDate.gte = new Date(startDate);
    if (endDate) where.startDate.lte = new Date(endDate);
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [programs, total] = await Promise.all([
    prisma.trainingProgram.findMany({
      where,
      skip,
      take: parseInt(limit),
      orderBy: [{ startDate: 'desc' }],
      include: {
        trainer: { select: { id: true, firstName: true, lastName: true } },
        creator: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { enrollments: true } },
      },
    }),
    prisma.trainingProgram.count({ where }),
  ]);

  res.json({
    success: true,
    data: programs,
    pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) },
  });
}

export async function getTrainingProgram(req, res) {
  const tenantId = req.user.tenantId;
  const { id } = req.params;

  const program = await prisma.trainingProgram.findFirst({
    where: { id: parseInt(id), tenantId },
    include: {
      trainer: { select: { id: true, firstName: true, lastName: true, email: true } },
      creator: { select: { id: true, firstName: true, lastName: true } },
      enrollments: {
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true, department: { select: { name: true } } } },
        },
        orderBy: { enrolledAt: 'asc' },
      },
    },
  });

  if (!program) {
    return res.status(404).json({ success: false, message: 'Training program not found' });
  }

  res.json({ success: true, data: program });
}

export async function createTrainingProgram(req, res) {
  const tenantId = req.user.tenantId;
  const userId = req.user.id;

  const {
    name,
    description,
    type = 'INTERNAL',
    category,
    duration,
    startDate,
    endDate,
    trainerId,
    externalTrainer,
    venue,
    maxParticipants,
    cost,
    currency = 'INR',
    materials,
    prerequisites,
    objectives,
  } = req.body;

  if (!name || !duration || !startDate || !endDate) {
    return res.status(400).json({
      success: false,
      message: 'Name, duration, start date, and end date are required',
    });
  }

  const program = await prisma.trainingProgram.create({
    data: {
      tenantId,
      name,
      description,
      type,
      category,
      duration: parseInt(duration),
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      trainerId: trainerId ? parseInt(trainerId) : null,
      externalTrainer,
      venue,
      maxParticipants: maxParticipants ? parseInt(maxParticipants) : null,
      cost: cost ? parseFloat(cost) : null,
      currency,
      materials,
      prerequisites,
      objectives,
      createdBy: userId,
    },
    include: {
      trainer: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  await createAuditLog({
    tenantId,
    userId,
    action: 'CREATE',
    entityType: 'TrainingProgram',
    entityId: program.id,
    newValues: program,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  res.status(201).json({ success: true, data: program });
}

export async function updateTrainingProgram(req, res) {
  const tenantId = req.user.tenantId;
  const userId = req.user.id;
  const { id } = req.params;

  const existing = await prisma.trainingProgram.findFirst({
    where: { id: parseInt(id), tenantId },
  });

  if (!existing) {
    return res.status(404).json({ success: false, message: 'Training program not found' });
  }

  const {
    name,
    description,
    type,
    category,
    duration,
    startDate,
    endDate,
    trainerId,
    externalTrainer,
    venue,
    maxParticipants,
    cost,
    currency,
    materials,
    prerequisites,
    objectives,
    status,
  } = req.body;

  const updateData = {};
  if (name !== undefined) updateData.name = name;
  if (description !== undefined) updateData.description = description;
  if (type !== undefined) updateData.type = type;
  if (category !== undefined) updateData.category = category;
  if (duration !== undefined) updateData.duration = parseInt(duration);
  if (startDate !== undefined) updateData.startDate = new Date(startDate);
  if (endDate !== undefined) updateData.endDate = new Date(endDate);
  if (trainerId !== undefined) updateData.trainerId = trainerId ? parseInt(trainerId) : null;
  if (externalTrainer !== undefined) updateData.externalTrainer = externalTrainer;
  if (venue !== undefined) updateData.venue = venue;
  if (maxParticipants !== undefined) updateData.maxParticipants = maxParticipants ? parseInt(maxParticipants) : null;
  if (cost !== undefined) updateData.cost = cost ? parseFloat(cost) : null;
  if (currency !== undefined) updateData.currency = currency;
  if (materials !== undefined) updateData.materials = materials;
  if (prerequisites !== undefined) updateData.prerequisites = prerequisites;
  if (objectives !== undefined) updateData.objectives = objectives;
  if (status !== undefined) updateData.status = status;

  const program = await prisma.trainingProgram.update({
    where: { id: parseInt(id) },
    data: updateData,
    include: {
      trainer: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  await createAuditLog({
    tenantId,
    userId,
    action: 'UPDATE',
    entityType: 'TrainingProgram',
    entityId: program.id,
    oldValues: existing,
    newValues: updateData,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  res.json({ success: true, data: program });
}

export async function deleteTrainingProgram(req, res) {
  const tenantId = req.user.tenantId;
  const userId = req.user.id;
  const { id } = req.params;

  const program = await prisma.trainingProgram.findFirst({
    where: { id: parseInt(id), tenantId },
    include: { _count: { select: { enrollments: true } } },
  });

  if (!program) {
    return res.status(404).json({ success: false, message: 'Training program not found' });
  }

  if (program._count.enrollments > 0) {
    return res.status(400).json({
      success: false,
      message: 'Cannot delete program with enrollments. Cancel the program instead.',
    });
  }

  await prisma.trainingProgram.delete({ where: { id: parseInt(id) } });

  await createAuditLog({
    tenantId,
    userId,
    action: 'DELETE',
    entityType: 'TrainingProgram',
    entityId: program.id,
    oldValues: program,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  res.json({ success: true, message: 'Training program deleted' });
}

// Status management
export async function startProgram(req, res) {
  const tenantId = req.user.tenantId;
  const { id } = req.params;

  const program = await prisma.trainingProgram.findFirst({
    where: { id: parseInt(id), tenantId },
  });

  if (!program) {
    return res.status(404).json({ success: false, message: 'Training program not found' });
  }

  if (program.status !== 'PLANNED') {
    return res.status(400).json({ success: false, message: 'Only planned programs can be started' });
  }

  const updated = await prisma.trainingProgram.update({
    where: { id: parseInt(id) },
    data: { status: 'IN_PROGRESS' },
  });

  // Update all enrolled participants to IN_PROGRESS
  await prisma.trainingEnrollment.updateMany({
    where: { programId: parseInt(id), status: 'ENROLLED' },
    data: { status: 'IN_PROGRESS' },
  });

  res.json({ success: true, data: updated, message: 'Training program started' });
}

export async function completeProgram(req, res) {
  const tenantId = req.user.tenantId;
  const { id } = req.params;

  const program = await prisma.trainingProgram.findFirst({
    where: { id: parseInt(id), tenantId },
  });

  if (!program) {
    return res.status(404).json({ success: false, message: 'Training program not found' });
  }

  if (program.status !== 'IN_PROGRESS') {
    return res.status(400).json({ success: false, message: 'Only in-progress programs can be completed' });
  }

  const updated = await prisma.trainingProgram.update({
    where: { id: parseInt(id) },
    data: { status: 'COMPLETED' },
  });

  res.json({ success: true, data: updated, message: 'Training program completed' });
}

export async function cancelProgram(req, res) {
  const tenantId = req.user.tenantId;
  const { id } = req.params;

  const program = await prisma.trainingProgram.findFirst({
    where: { id: parseInt(id), tenantId },
  });

  if (!program) {
    return res.status(404).json({ success: false, message: 'Training program not found' });
  }

  if (program.status === 'COMPLETED') {
    return res.status(400).json({ success: false, message: 'Cannot cancel completed programs' });
  }

  const updated = await prisma.trainingProgram.update({
    where: { id: parseInt(id) },
    data: { status: 'CANCELLED' },
  });

  res.json({ success: true, data: updated, message: 'Training program cancelled' });
}

// ==================== ENROLLMENTS ====================

export async function enrollParticipants(req, res) {
  const tenantId = req.user.tenantId;
  const userId = req.user.id;
  const { id } = req.params;
  const { userIds } = req.body;

  if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
    return res.status(400).json({ success: false, message: 'User IDs are required' });
  }

  const program = await prisma.trainingProgram.findFirst({
    where: { id: parseInt(id), tenantId },
    include: { _count: { select: { enrollments: true } } },
  });

  if (!program) {
    return res.status(404).json({ success: false, message: 'Training program not found' });
  }

  if (program.status === 'COMPLETED' || program.status === 'CANCELLED') {
    return res.status(400).json({ success: false, message: 'Cannot enroll in completed or cancelled programs' });
  }

  // Check max participants
  if (program.maxParticipants) {
    const currentCount = program._count.enrollments;
    if (currentCount + userIds.length > program.maxParticipants) {
      return res.status(400).json({
        success: false,
        message: `Cannot enroll. Max ${program.maxParticipants} participants allowed, currently ${currentCount} enrolled.`,
      });
    }
  }

  // Create enrollments (skip existing)
  const enrollments = await Promise.all(
    userIds.map(async (uid) => {
      try {
        return await prisma.trainingEnrollment.create({
          data: {
            tenantId,
            programId: parseInt(id),
            userId: parseInt(uid),
            status: program.status === 'IN_PROGRESS' ? 'IN_PROGRESS' : 'ENROLLED',
          },
        });
      } catch (err) {
        // Unique constraint violation - already enrolled
        return null;
      }
    })
  );

  const created = enrollments.filter(Boolean);

  res.status(201).json({
    success: true,
    message: `${created.length} participant(s) enrolled`,
    data: created,
  });
}

export async function updateEnrollment(req, res) {
  const tenantId = req.user.tenantId;
  const { id, enrollmentId } = req.params;
  const { status, score, feedback, rating, certificateUrl, notes } = req.body;

  const enrollment = await prisma.trainingEnrollment.findFirst({
    where: { id: parseInt(enrollmentId), programId: parseInt(id), tenantId },
  });

  if (!enrollment) {
    return res.status(404).json({ success: false, message: 'Enrollment not found' });
  }

  const updateData = {};
  if (status !== undefined) {
    updateData.status = status;
    if (status === 'COMPLETED') {
      updateData.completedAt = new Date();
    }
  }
  if (score !== undefined) updateData.score = parseFloat(score);
  if (feedback !== undefined) updateData.feedback = feedback;
  if (rating !== undefined) updateData.rating = parseInt(rating);
  if (certificateUrl !== undefined) updateData.certificateUrl = certificateUrl;
  if (notes !== undefined) updateData.notes = notes;

  const updated = await prisma.trainingEnrollment.update({
    where: { id: parseInt(enrollmentId) },
    data: updateData,
    include: {
      user: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  res.json({ success: true, data: updated });
}

export async function removeEnrollment(req, res) {
  const tenantId = req.user.tenantId;
  const { id, enrollmentId } = req.params;

  const enrollment = await prisma.trainingEnrollment.findFirst({
    where: { id: parseInt(enrollmentId), programId: parseInt(id), tenantId },
  });

  if (!enrollment) {
    return res.status(404).json({ success: false, message: 'Enrollment not found' });
  }

  if (enrollment.status === 'COMPLETED') {
    return res.status(400).json({ success: false, message: 'Cannot remove completed enrollment' });
  }

  await prisma.trainingEnrollment.delete({ where: { id: parseInt(enrollmentId) } });

  res.json({ success: true, message: 'Enrollment removed' });
}

export async function bulkCompleteEnrollments(req, res) {
  const tenantId = req.user.tenantId;
  const { id } = req.params;
  const { enrollmentIds, scores } = req.body;

  if (!enrollmentIds || !Array.isArray(enrollmentIds)) {
    return res.status(400).json({ success: false, message: 'Enrollment IDs are required' });
  }

  const results = await Promise.all(
    enrollmentIds.map(async (eid, index) => {
      try {
        return await prisma.trainingEnrollment.update({
          where: { id: parseInt(eid) },
          data: {
            status: 'COMPLETED',
            completedAt: new Date(),
            score: scores && scores[index] ? parseFloat(scores[index]) : null,
          },
        });
      } catch (err) {
        return null;
      }
    })
  );

  const completed = results.filter(Boolean);

  res.json({ success: true, message: `${completed.length} enrollment(s) marked as completed` });
}

// ==================== MY TRAININGS ====================

export async function getMyTrainings(req, res) {
  const tenantId = req.user.tenantId;
  const userId = req.user.id;
  const { status } = req.query;

  const where = { tenantId, userId };
  if (status) where.status = status;

  const enrollments = await prisma.trainingEnrollment.findMany({
    where,
    orderBy: [{ enrolledAt: 'desc' }],
    include: {
      program: {
        select: {
          id: true,
          name: true,
          description: true,
          type: true,
          category: true,
          duration: true,
          startDate: true,
          endDate: true,
          venue: true,
          status: true,
          trainer: { select: { firstName: true, lastName: true } },
        },
      },
    },
  });

  res.json({ success: true, data: enrollments });
}

export async function submitFeedback(req, res) {
  const tenantId = req.user.tenantId;
  const userId = req.user.id;
  const { id } = req.params;
  const { feedback, rating } = req.body;

  const enrollment = await prisma.trainingEnrollment.findFirst({
    where: { programId: parseInt(id), userId, tenantId },
  });

  if (!enrollment) {
    return res.status(404).json({ success: false, message: 'Enrollment not found' });
  }

  if (enrollment.status !== 'COMPLETED') {
    return res.status(400).json({ success: false, message: 'Can only submit feedback for completed trainings' });
  }

  const updated = await prisma.trainingEnrollment.update({
    where: { id: enrollment.id },
    data: {
      feedback,
      rating: rating ? parseInt(rating) : null,
    },
  });

  res.json({ success: true, data: updated, message: 'Feedback submitted' });
}

// ==================== STATS ====================

export async function getTrainingStats(req, res) {
  const tenantId = req.user.tenantId;

  const [programStats, enrollmentStats, categoryStats, upcomingPrograms] = await Promise.all([
    // Program counts by status
    prisma.trainingProgram.groupBy({
      by: ['status'],
      where: { tenantId },
      _count: { id: true },
    }),
    // Enrollment counts by status
    prisma.trainingEnrollment.groupBy({
      by: ['status'],
      where: { tenantId },
      _count: { id: true },
    }),
    // Programs by category
    prisma.trainingProgram.groupBy({
      by: ['category'],
      where: { tenantId, category: { not: null } },
      _count: { id: true },
    }),
    // Upcoming programs (next 30 days)
    prisma.trainingProgram.findMany({
      where: {
        tenantId,
        status: { in: ['PLANNED', 'IN_PROGRESS'] },
        startDate: {
          gte: new Date(),
          lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      },
      orderBy: { startDate: 'asc' },
      take: 5,
      include: {
        _count: { select: { enrollments: true } },
      },
    }),
  ]);

  const programsByStatus = programStats.reduce((acc, s) => {
    acc[s.status] = s._count.id;
    return acc;
  }, {});

  const enrollmentsByStatus = enrollmentStats.reduce((acc, s) => {
    acc[s.status] = s._count.id;
    return acc;
  }, {});

  const byCategory = categoryStats.map((c) => ({
    category: c.category,
    count: c._count.id,
  }));

  res.json({
    success: true,
    data: {
      programs: {
        total: Object.values(programsByStatus).reduce((a, b) => a + b, 0),
        planned: programsByStatus.PLANNED || 0,
        inProgress: programsByStatus.IN_PROGRESS || 0,
        completed: programsByStatus.COMPLETED || 0,
        cancelled: programsByStatus.CANCELLED || 0,
      },
      enrollments: {
        total: Object.values(enrollmentsByStatus).reduce((a, b) => a + b, 0),
        enrolled: enrollmentsByStatus.ENROLLED || 0,
        inProgress: enrollmentsByStatus.IN_PROGRESS || 0,
        completed: enrollmentsByStatus.COMPLETED || 0,
        dropped: enrollmentsByStatus.DROPPED || 0,
      },
      byCategory,
      upcomingPrograms,
    },
  });
}

// ==================== CALENDAR VIEW ====================

export async function getTrainingCalendar(req, res) {
  const tenantId = req.user.tenantId;
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    return res.status(400).json({ success: false, message: 'Start and end date are required' });
  }

  const programs = await prisma.trainingProgram.findMany({
    where: {
      tenantId,
      OR: [
        { startDate: { gte: new Date(startDate), lte: new Date(endDate) } },
        { endDate: { gte: new Date(startDate), lte: new Date(endDate) } },
        { AND: [{ startDate: { lte: new Date(startDate) } }, { endDate: { gte: new Date(endDate) } }] },
      ],
    },
    select: {
      id: true,
      name: true,
      type: true,
      category: true,
      startDate: true,
      endDate: true,
      status: true,
      venue: true,
      _count: { select: { enrollments: true } },
    },
    orderBy: { startDate: 'asc' },
  });

  res.json({ success: true, data: programs });
}
