import prisma from '@shared/config/database.js';
import { createAuditLog } from '@shared/utilities/audit.js';

// ==================== HELPER FUNCTIONS ====================

/**
 * Calculate weighted average rating from responses
 */
function calculateAverageRating(responses, cycleQuestions) {
  if (!responses || responses.length === 0) return null;

  const ratingResponses = responses.filter(r => r.rating !== null);
  if (ratingResponses.length === 0) return null;

  // Build weight map from cycle questions
  const weightMap = {};
  cycleQuestions.forEach(cq => {
    weightMap[cq.questionId] = cq.weight || 1;
  });

  let totalWeight = 0;
  let weightedSum = 0;

  ratingResponses.forEach(r => {
    const weight = weightMap[r.questionId] || 1;
    weightedSum += r.rating * weight;
    totalWeight += weight;
  });

  return totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 100) / 100 : null;
}

// ==================== REVIEW CYCLES ====================

export async function listReviewCycles(req, res) {
  const tenantId = req.user.tenantId;
  const { status, page = 1, limit = 20 } = req.query;

  const where = { tenantId, isActive: true };
  if (status) where.status = status;

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [cycles, total] = await Promise.all([
    prisma.reviewCycle.findMany({
      where,
      skip,
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { reviews: true, questions: true } },
      },
    }),
    prisma.reviewCycle.count({ where }),
  ]);

  res.json({
    success: true,
    data: cycles,
    pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) },
  });
}

export async function getReviewCycle(req, res) {
  const tenantId = req.user.tenantId;
  const { id } = req.params;

  const cycle = await prisma.reviewCycle.findFirst({
    where: { id: parseInt(id), tenantId },
    include: {
      questions: {
        include: { question: true },
        orderBy: { order: 'asc' },
      },
      reviews: {
        include: {
          employee: { select: { id: true, firstName: true, lastName: true, email: true, avatar: true } },
          reviewer: { select: { id: true, firstName: true, lastName: true } },
        },
      },
    },
  });

  if (!cycle) {
    return res.status(404).json({ success: false, message: 'Review cycle not found' });
  }

  res.json({ success: true, data: cycle });
}

export async function createReviewCycle(req, res) {
  const tenantId = req.user.tenantId;
  const userId = req.user.id;

  const { name, description, startDate, endDate, selfReviewDeadline, managerReviewDeadline, questionIds = [] } = req.body;

  if (!name || !startDate || !endDate) {
    return res.status(400).json({ success: false, message: 'Name, start date, and end date are required' });
  }

  const cycle = await prisma.reviewCycle.create({
    data: {
      tenantId,
      name,
      description,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      selfReviewDeadline: selfReviewDeadline ? new Date(selfReviewDeadline) : null,
      managerReviewDeadline: managerReviewDeadline ? new Date(managerReviewDeadline) : null,
      status: 'DRAFT',
      createdBy: userId,
      questions: {
        create: questionIds.map((qId, index) => ({
          questionId: qId,
          order: index,
        })),
      },
    },
    include: {
      questions: { include: { question: true } },
    },
  });

  await createAuditLog({
    tenantId,
    userId,
    action: 'CREATE',
    entityType: 'ReviewCycle',
    entityId: cycle.id,
    newValues: cycle,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  res.status(201).json({ success: true, data: cycle });
}

export async function updateReviewCycle(req, res) {
  const tenantId = req.user.tenantId;
  const userId = req.user.id;
  const { id } = req.params;

  const existing = await prisma.reviewCycle.findFirst({
    where: { id: parseInt(id), tenantId },
  });

  if (!existing) {
    return res.status(404).json({ success: false, message: 'Review cycle not found' });
  }

  const { name, description, startDate, endDate, selfReviewDeadline, managerReviewDeadline, status } = req.body;

  const updateData = {};
  if (name !== undefined) updateData.name = name;
  if (description !== undefined) updateData.description = description;
  if (startDate !== undefined) updateData.startDate = new Date(startDate);
  if (endDate !== undefined) updateData.endDate = new Date(endDate);
  if (selfReviewDeadline !== undefined) updateData.selfReviewDeadline = selfReviewDeadline ? new Date(selfReviewDeadline) : null;
  if (managerReviewDeadline !== undefined) updateData.managerReviewDeadline = managerReviewDeadline ? new Date(managerReviewDeadline) : null;
  if (status !== undefined) updateData.status = status;

  const cycle = await prisma.reviewCycle.update({
    where: { id: parseInt(id) },
    data: updateData,
  });

  await createAuditLog({
    tenantId,
    userId,
    action: 'UPDATE',
    entityType: 'ReviewCycle',
    entityId: cycle.id,
    oldValues: existing,
    newValues: cycle,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  res.json({ success: true, data: cycle });
}

export async function deleteReviewCycle(req, res) {
  const tenantId = req.user.tenantId;
  const userId = req.user.id;
  const { id } = req.params;

  const cycle = await prisma.reviewCycle.findFirst({
    where: { id: parseInt(id), tenantId },
  });

  if (!cycle) {
    return res.status(404).json({ success: false, message: 'Review cycle not found' });
  }

  await prisma.reviewCycle.update({
    where: { id: parseInt(id) },
    data: { isActive: false },
  });

  await createAuditLog({
    tenantId,
    userId,
    action: 'DELETE',
    entityType: 'ReviewCycle',
    entityId: cycle.id,
    oldValues: cycle,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  res.json({ success: true, message: 'Review cycle deleted' });
}

// ==================== ACTIVATE CYCLE & ASSIGN REVIEWS ====================

export async function activateCycle(req, res) {
  const tenantId = req.user.tenantId;
  const userId = req.user.id;
  const { id } = req.params;
  const { departmentIds, userIds } = req.body;

  const cycle = await prisma.reviewCycle.findFirst({
    where: { id: parseInt(id), tenantId },
    include: { questions: true },
  });

  if (!cycle) {
    return res.status(404).json({ success: false, message: 'Review cycle not found' });
  }

  if (cycle.questions.length === 0) {
    return res.status(400).json({ success: false, message: 'Add questions to the cycle before activating' });
  }

  // Get employees to review
  const employeeWhere = { tenantId, isActive: true };
  if (userIds && userIds.length > 0) {
    employeeWhere.id = { in: userIds };
  } else if (departmentIds && departmentIds.length > 0) {
    employeeWhere.departmentId = { in: departmentIds };
  }

  const employees = await prisma.user.findMany({
    where: employeeWhere,
    select: { id: true, reportingTo: true },
  });

  // Create reviews for each employee
  const reviewsData = employees
    .filter(emp => emp.reportingTo) // Only employees with a manager
    .map(emp => ({
      cycleId: parseInt(id),
      employeeId: emp.id,
      reviewerId: emp.reportingTo,
      status: 'PENDING',
    }));

  if (reviewsData.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'No eligible employees found (employees must have a reporting manager)',
    });
  }

  // Create reviews
  await prisma.performanceReview.createMany({
    data: reviewsData,
    skipDuplicates: true,
  });

  // Update cycle status
  await prisma.reviewCycle.update({
    where: { id: parseInt(id) },
    data: { status: 'ACTIVE' },
  });

  await createAuditLog({
    tenantId,
    userId,
    action: 'UPDATE',
    entityType: 'ReviewCycle',
    entityId: parseInt(id),
    newValues: { status: 'ACTIVE', reviewsCreated: reviewsData.length },
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  res.json({
    success: true,
    message: `Cycle activated with ${reviewsData.length} reviews created`,
    reviewsCreated: reviewsData.length,
  });
}

// ==================== REVIEW QUESTIONS ====================

export async function listReviewQuestions(req, res) {
  const tenantId = req.user.tenantId;
  const { category, type } = req.query;

  const where = { tenantId, isActive: true };
  if (category) where.category = category;
  if (type) where.type = type;

  const questions = await prisma.reviewQuestion.findMany({
    where,
    orderBy: [{ category: 'asc' }, { order: 'asc' }],
  });

  res.json({ success: true, data: questions });
}

export async function createReviewQuestion(req, res) {
  const tenantId = req.user.tenantId;
  const userId = req.user.id;

  const { question, description, category = 'COMPETENCY', type = 'RATING', options, isRequired = true, order = 0 } = req.body;

  if (!question) {
    return res.status(400).json({ success: false, message: 'Question is required' });
  }

  const newQuestion = await prisma.reviewQuestion.create({
    data: {
      tenantId,
      question,
      description,
      category,
      type,
      options: options ? JSON.stringify(options) : null,
      isRequired,
      order,
    },
  });

  await createAuditLog({
    tenantId,
    userId,
    action: 'CREATE',
    entityType: 'ReviewQuestion',
    entityId: newQuestion.id,
    newValues: newQuestion,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  res.status(201).json({ success: true, data: newQuestion });
}

export async function updateReviewQuestion(req, res) {
  const tenantId = req.user.tenantId;
  const userId = req.user.id;
  const { id } = req.params;

  const existing = await prisma.reviewQuestion.findFirst({
    where: { id: parseInt(id), tenantId },
  });

  if (!existing) {
    return res.status(404).json({ success: false, message: 'Question not found' });
  }

  const { question, description, category, type, options, isRequired, order } = req.body;

  const updateData = {};
  if (question !== undefined) updateData.question = question;
  if (description !== undefined) updateData.description = description;
  if (category !== undefined) updateData.category = category;
  if (type !== undefined) updateData.type = type;
  if (options !== undefined) updateData.options = options ? JSON.stringify(options) : null;
  if (isRequired !== undefined) updateData.isRequired = isRequired;
  if (order !== undefined) updateData.order = order;

  const updated = await prisma.reviewQuestion.update({
    where: { id: parseInt(id) },
    data: updateData,
  });

  await createAuditLog({
    tenantId,
    userId,
    action: 'UPDATE',
    entityType: 'ReviewQuestion',
    entityId: updated.id,
    oldValues: existing,
    newValues: updated,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  res.json({ success: true, data: updated });
}

export async function deleteReviewQuestion(req, res) {
  const tenantId = req.user.tenantId;
  const userId = req.user.id;
  const { id } = req.params;

  const question = await prisma.reviewQuestion.findFirst({
    where: { id: parseInt(id), tenantId },
  });

  if (!question) {
    return res.status(404).json({ success: false, message: 'Question not found' });
  }

  await prisma.reviewQuestion.update({
    where: { id: parseInt(id) },
    data: { isActive: false },
  });

  await createAuditLog({
    tenantId,
    userId,
    action: 'DELETE',
    entityType: 'ReviewQuestion',
    entityId: question.id,
    oldValues: question,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  res.json({ success: true, message: 'Question deleted' });
}

// ==================== CYCLE QUESTIONS ====================

export async function addQuestionToCycle(req, res) {
  const tenantId = req.user.tenantId;
  const { id } = req.params;
  const { questionId, order = 0, weight = 1 } = req.body;

  const cycle = await prisma.reviewCycle.findFirst({
    where: { id: parseInt(id), tenantId },
  });

  if (!cycle) {
    return res.status(404).json({ success: false, message: 'Cycle not found' });
  }

  const cycleQuestion = await prisma.reviewCycleQuestion.upsert({
    where: {
      cycleId_questionId: { cycleId: parseInt(id), questionId: parseInt(questionId) },
    },
    update: { order, weight },
    create: { cycleId: parseInt(id), questionId: parseInt(questionId), order, weight },
    include: { question: true },
  });

  res.json({ success: true, data: cycleQuestion });
}

export async function removeQuestionFromCycle(req, res) {
  const tenantId = req.user.tenantId;
  const { id, questionId } = req.params;

  const cycle = await prisma.reviewCycle.findFirst({
    where: { id: parseInt(id), tenantId },
  });

  if (!cycle) {
    return res.status(404).json({ success: false, message: 'Cycle not found' });
  }

  await prisma.reviewCycleQuestion.deleteMany({
    where: { cycleId: parseInt(id), questionId: parseInt(questionId) },
  });

  res.json({ success: true, message: 'Question removed from cycle' });
}

// ==================== PERFORMANCE REVIEWS ====================

export async function listReviews(req, res) {
  const tenantId = req.user.tenantId;
  const userId = req.user.id;
  const userRole = req.user.role?.code;

  const { cycleId, status, myReviews = 'false', toReview = 'false', page = 1, limit = 20 } = req.query;

  const where = {};

  // Join through cycle to filter by tenant
  if (cycleId) {
    where.cycleId = parseInt(cycleId);
  } else {
    where.cycle = { tenantId };
  }

  if (status) where.status = status;

  // Filter based on role
  if (myReviews === 'true') {
    where.employeeId = userId;
  } else if (toReview === 'true') {
    where.reviewerId = userId;
  } else if (userRole === 'EMPLOYEE') {
    // Employees can only see their own reviews
    where.employeeId = userId;
  } else if (userRole === 'MANAGER') {
    // Managers see their own and their team's reviews
    where.OR = [{ employeeId: userId }, { reviewerId: userId }];
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [reviews, total] = await Promise.all([
    prisma.performanceReview.findMany({
      where,
      skip,
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
      include: {
        cycle: { select: { id: true, name: true, status: true, selfReviewDeadline: true, managerReviewDeadline: true } },
        employee: { select: { id: true, firstName: true, lastName: true, email: true, avatar: true, department: { select: { name: true } } } },
        reviewer: { select: { id: true, firstName: true, lastName: true } },
      },
    }),
    prisma.performanceReview.count({ where }),
  ]);

  res.json({
    success: true,
    data: reviews,
    pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) },
  });
}

export async function getReview(req, res) {
  const tenantId = req.user.tenantId;
  const { id } = req.params;

  const review = await prisma.performanceReview.findFirst({
    where: { id: parseInt(id), cycle: { tenantId } },
    include: {
      cycle: {
        include: {
          questions: {
            include: { question: true },
            orderBy: { order: 'asc' },
          },
        },
      },
      employee: { select: { id: true, firstName: true, lastName: true, email: true, avatar: true, department: { select: { name: true } }, designation: { select: { name: true } } } },
      reviewer: { select: { id: true, firstName: true, lastName: true } },
      responses: true,
      goals: true,
    },
  });

  if (!review) {
    return res.status(404).json({ success: false, message: 'Review not found' });
  }

  res.json({ success: true, data: review });
}

// ==================== SELF REVIEW ====================

export async function submitSelfReview(req, res) {
  const tenantId = req.user.tenantId;
  const userId = req.user.id;
  const { id } = req.params;

  const { responses, strengths, improvements, comments, goals = [] } = req.body;

  const review = await prisma.performanceReview.findFirst({
    where: { id: parseInt(id), employeeId: userId, cycle: { tenantId } },
    include: { cycle: { include: { questions: true } } },
  });

  if (!review) {
    return res.status(404).json({ success: false, message: 'Review not found or not assigned to you' });
  }

  if (review.status !== 'PENDING' && review.status !== 'SELF_REVIEW') {
    return res.status(400).json({ success: false, message: 'Self review already submitted' });
  }

  // Save responses
  if (responses && responses.length > 0) {
    await prisma.reviewResponse.deleteMany({
      where: { reviewId: parseInt(id), respondentType: 'SELF' },
    });

    await prisma.reviewResponse.createMany({
      data: responses.map(r => ({
        reviewId: parseInt(id),
        questionId: r.questionId,
        respondentType: 'SELF',
        rating: r.rating || null,
        response: r.response || null,
      })),
    });
  }

  // Save goals
  if (goals.length > 0) {
    await prisma.reviewGoal.deleteMany({ where: { reviewId: parseInt(id) } });
    await prisma.reviewGoal.createMany({
      data: goals.map(g => ({
        reviewId: parseInt(id),
        goalId: g.goalId || null,
        title: g.title,
        achievement: g.achievement || null,
        selfComment: g.selfComment || null,
      })),
    });
  }

  // Calculate self rating
  const selfResponses = await prisma.reviewResponse.findMany({
    where: { reviewId: parseInt(id), respondentType: 'SELF' },
  });
  const selfRating = calculateAverageRating(selfResponses, review.cycle.questions);

  // Update review
  const updatedReview = await prisma.performanceReview.update({
    where: { id: parseInt(id) },
    data: {
      status: 'SELF_REVIEW',
      selfRating,
      selfStrengths: strengths,
      selfImprovements: improvements,
      selfComments: comments,
      selfReviewDate: new Date(),
    },
  });

  await createAuditLog({
    tenantId,
    userId,
    action: 'UPDATE',
    entityType: 'PerformanceReview',
    entityId: review.id,
    newValues: { status: 'SELF_REVIEW', selfRating },
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  res.json({ success: true, data: updatedReview, message: 'Self review submitted successfully' });
}

// ==================== MANAGER REVIEW ====================

export async function submitManagerReview(req, res) {
  const tenantId = req.user.tenantId;
  const userId = req.user.id;
  const { id } = req.params;

  const { responses, strengths, improvements, comments, goals = [], finalRating } = req.body;

  const review = await prisma.performanceReview.findFirst({
    where: { id: parseInt(id), reviewerId: userId, cycle: { tenantId } },
    include: { cycle: { include: { questions: true } } },
  });

  if (!review) {
    return res.status(404).json({ success: false, message: 'Review not found or you are not the reviewer' });
  }

  if (review.status === 'COMPLETED') {
    return res.status(400).json({ success: false, message: 'Review already completed' });
  }

  // Save manager responses
  if (responses && responses.length > 0) {
    await prisma.reviewResponse.deleteMany({
      where: { reviewId: parseInt(id), respondentType: 'MANAGER' },
    });

    await prisma.reviewResponse.createMany({
      data: responses.map(r => ({
        reviewId: parseInt(id),
        questionId: r.questionId,
        respondentType: 'MANAGER',
        rating: r.rating || null,
        response: r.response || null,
      })),
    });
  }

  // Update goal comments
  if (goals.length > 0) {
    for (const g of goals) {
      if (g.id) {
        await prisma.reviewGoal.update({
          where: { id: g.id },
          data: { managerComment: g.managerComment, achievement: g.achievement },
        });
      }
    }
  }

  // Calculate manager rating
  const managerResponses = await prisma.reviewResponse.findMany({
    where: { reviewId: parseInt(id), respondentType: 'MANAGER' },
  });
  const managerRating = calculateAverageRating(managerResponses, review.cycle.questions);

  // Calculate final rating (average of self and manager, or just manager if no self)
  const calculatedFinal = finalRating || (review.selfRating && managerRating
    ? (review.selfRating + managerRating) / 2
    : managerRating);

  // Update review
  const updatedReview = await prisma.performanceReview.update({
    where: { id: parseInt(id) },
    data: {
      status: 'COMPLETED',
      managerRating,
      finalRating: calculatedFinal ? Math.round(calculatedFinal * 100) / 100 : null,
      managerStrengths: strengths,
      managerImprovements: improvements,
      managerComments: comments,
      managerReviewDate: new Date(),
      completedAt: new Date(),
    },
  });

  await createAuditLog({
    tenantId,
    userId,
    action: 'UPDATE',
    entityType: 'PerformanceReview',
    entityId: review.id,
    newValues: { status: 'COMPLETED', managerRating, finalRating: calculatedFinal },
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  res.json({ success: true, data: updatedReview, message: 'Manager review completed' });
}

// ==================== REVIEW STATS ====================

export async function getReviewStats(req, res) {
  const tenantId = req.user.tenantId;
  const { cycleId } = req.query;

  const where = { cycle: { tenantId } };
  if (cycleId) where.cycleId = parseInt(cycleId);

  const [total, statusCounts, avgRatings] = await Promise.all([
    prisma.performanceReview.count({ where }),
    prisma.performanceReview.groupBy({
      by: ['status'],
      where,
      _count: { id: true },
    }),
    prisma.performanceReview.aggregate({
      where: { ...where, finalRating: { not: null } },
      _avg: { selfRating: true, managerRating: true, finalRating: true },
    }),
  ]);

  const byStatus = statusCounts.reduce((acc, s) => {
    acc[s.status] = s._count.id;
    return acc;
  }, {});

  res.json({
    success: true,
    data: {
      total,
      byStatus,
      avgSelfRating: avgRatings._avg.selfRating ? Math.round(avgRatings._avg.selfRating * 100) / 100 : null,
      avgManagerRating: avgRatings._avg.managerRating ? Math.round(avgRatings._avg.managerRating * 100) / 100 : null,
      avgFinalRating: avgRatings._avg.finalRating ? Math.round(avgRatings._avg.finalRating * 100) / 100 : null,
      completionRate: total > 0 ? Math.round(((byStatus.COMPLETED || 0) / total) * 100) : 0,
    },
  });
}
