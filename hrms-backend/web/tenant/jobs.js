import prisma from '@shared/config/database.js';
import { createAuditLog } from '@shared/utilities/audit.js';

// ==================== JOB POSTINGS ====================

export async function listJobPostings(req, res) {
  const tenantId = req.user.tenantId;
  const { status, departmentId, locationId, employmentType, page = 1, limit = 20 } = req.query;

  const where = { tenantId };

  if (status) where.status = status;
  if (departmentId) where.departmentId = parseInt(departmentId);
  if (locationId) where.locationId = parseInt(locationId);
  if (employmentType) where.employmentType = employmentType;

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [jobs, total] = await Promise.all([
    prisma.jobPosting.findMany({
      where,
      skip,
      take: parseInt(limit),
      orderBy: [{ createdAt: 'desc' }],
      include: {
        department: { select: { id: true, name: true } },
        designation: { select: { id: true, name: true } },
        location: { select: { id: true, name: true, city: true } },
        creator: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { applications: true } },
      },
    }),
    prisma.jobPosting.count({ where }),
  ]);

  res.json({
    success: true,
    data: jobs,
    pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) },
  });
}

export async function getJobPosting(req, res) {
  const tenantId = req.user.tenantId;
  const { id } = req.params;

  const job = await prisma.jobPosting.findFirst({
    where: { id: parseInt(id), tenantId },
    include: {
      department: { select: { id: true, name: true } },
      designation: { select: { id: true, name: true } },
      location: { select: { id: true, name: true, city: true, address: true } },
      creator: { select: { id: true, firstName: true, lastName: true } },
      _count: { select: { applications: true } },
    },
  });

  if (!job) {
    return res.status(404).json({ success: false, message: 'Job posting not found' });
  }

  res.json({ success: true, data: job });
}

export async function createJobPosting(req, res) {
  const tenantId = req.user.tenantId;
  const userId = req.user.id;

  const {
    title,
    departmentId,
    designationId,
    locationId,
    description,
    requirements,
    responsibilities,
    experience,
    salaryMin,
    salaryMax,
    currency = 'INR',
    employmentType = 'FULL_TIME',
    skills,
    openings = 1,
    closingDate,
    isRemote = false,
  } = req.body;

  if (!title || !description || !requirements || !experience) {
    return res.status(400).json({
      success: false,
      message: 'Title, description, requirements, and experience are required',
    });
  }

  const job = await prisma.jobPosting.create({
    data: {
      tenantId,
      title,
      departmentId: departmentId ? parseInt(departmentId) : null,
      designationId: designationId ? parseInt(designationId) : null,
      locationId: locationId ? parseInt(locationId) : null,
      description,
      requirements,
      responsibilities,
      experience,
      salaryMin: salaryMin ? parseFloat(salaryMin) : null,
      salaryMax: salaryMax ? parseFloat(salaryMax) : null,
      currency,
      employmentType,
      skills,
      openings: parseInt(openings),
      closingDate: closingDate ? new Date(closingDate) : null,
      isRemote,
      createdBy: userId,
    },
    include: {
      department: { select: { id: true, name: true } },
      designation: { select: { id: true, name: true } },
      location: { select: { id: true, name: true } },
    },
  });

  await createAuditLog({
    tenantId,
    userId,
    action: 'CREATE',
    entityType: 'JobPosting',
    entityId: job.id,
    newValues: job,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  res.status(201).json({ success: true, data: job });
}

export async function updateJobPosting(req, res) {
  const tenantId = req.user.tenantId;
  const userId = req.user.id;
  const { id } = req.params;

  const existing = await prisma.jobPosting.findFirst({
    where: { id: parseInt(id), tenantId },
  });

  if (!existing) {
    return res.status(404).json({ success: false, message: 'Job posting not found' });
  }

  const {
    title,
    departmentId,
    designationId,
    locationId,
    description,
    requirements,
    responsibilities,
    experience,
    salaryMin,
    salaryMax,
    currency,
    employmentType,
    skills,
    openings,
    closingDate,
    isRemote,
  } = req.body;

  const updateData = {};
  if (title !== undefined) updateData.title = title;
  if (departmentId !== undefined) updateData.departmentId = departmentId ? parseInt(departmentId) : null;
  if (designationId !== undefined) updateData.designationId = designationId ? parseInt(designationId) : null;
  if (locationId !== undefined) updateData.locationId = locationId ? parseInt(locationId) : null;
  if (description !== undefined) updateData.description = description;
  if (requirements !== undefined) updateData.requirements = requirements;
  if (responsibilities !== undefined) updateData.responsibilities = responsibilities;
  if (experience !== undefined) updateData.experience = experience;
  if (salaryMin !== undefined) updateData.salaryMin = salaryMin ? parseFloat(salaryMin) : null;
  if (salaryMax !== undefined) updateData.salaryMax = salaryMax ? parseFloat(salaryMax) : null;
  if (currency !== undefined) updateData.currency = currency;
  if (employmentType !== undefined) updateData.employmentType = employmentType;
  if (skills !== undefined) updateData.skills = skills;
  if (openings !== undefined) updateData.openings = parseInt(openings);
  if (closingDate !== undefined) updateData.closingDate = closingDate ? new Date(closingDate) : null;
  if (isRemote !== undefined) updateData.isRemote = isRemote;

  const job = await prisma.jobPosting.update({
    where: { id: parseInt(id) },
    data: updateData,
    include: {
      department: { select: { id: true, name: true } },
      designation: { select: { id: true, name: true } },
      location: { select: { id: true, name: true } },
    },
  });

  await createAuditLog({
    tenantId,
    userId,
    action: 'UPDATE',
    entityType: 'JobPosting',
    entityId: job.id,
    oldValues: existing,
    newValues: job,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  res.json({ success: true, data: job });
}

export async function deleteJobPosting(req, res) {
  const tenantId = req.user.tenantId;
  const userId = req.user.id;
  const { id } = req.params;

  const job = await prisma.jobPosting.findFirst({
    where: { id: parseInt(id), tenantId },
    include: { _count: { select: { applications: true } } },
  });

  if (!job) {
    return res.status(404).json({ success: false, message: 'Job posting not found' });
  }

  if (job._count.applications > 0) {
    return res.status(400).json({
      success: false,
      message: 'Cannot delete job posting with applications. Close it instead.',
    });
  }

  await prisma.jobPosting.delete({ where: { id: parseInt(id) } });

  await createAuditLog({
    tenantId,
    userId,
    action: 'DELETE',
    entityType: 'JobPosting',
    entityId: job.id,
    oldValues: job,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  res.json({ success: true, message: 'Job posting deleted' });
}

// ==================== STATUS MANAGEMENT ====================

export async function publishJob(req, res) {
  const tenantId = req.user.tenantId;
  const userId = req.user.id;
  const { id } = req.params;

  const job = await prisma.jobPosting.findFirst({
    where: { id: parseInt(id), tenantId },
  });

  if (!job) {
    return res.status(404).json({ success: false, message: 'Job posting not found' });
  }

  if (job.status === 'ACTIVE') {
    return res.status(400).json({ success: false, message: 'Job is already active' });
  }

  const updated = await prisma.jobPosting.update({
    where: { id: parseInt(id) },
    data: { status: 'ACTIVE', postedAt: new Date() },
  });

  await createAuditLog({
    tenantId,
    userId,
    action: 'UPDATE',
    entityType: 'JobPosting',
    entityId: job.id,
    newValues: { status: 'ACTIVE', postedAt: updated.postedAt },
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  res.json({ success: true, data: updated, message: 'Job published successfully' });
}

export async function pauseJob(req, res) {
  const tenantId = req.user.tenantId;
  const userId = req.user.id;
  const { id } = req.params;

  const job = await prisma.jobPosting.findFirst({
    where: { id: parseInt(id), tenantId },
  });

  if (!job) {
    return res.status(404).json({ success: false, message: 'Job posting not found' });
  }

  const updated = await prisma.jobPosting.update({
    where: { id: parseInt(id) },
    data: { status: 'PAUSED' },
  });

  res.json({ success: true, data: updated, message: 'Job paused' });
}

export async function closeJob(req, res) {
  const tenantId = req.user.tenantId;
  const userId = req.user.id;
  const { id } = req.params;

  const job = await prisma.jobPosting.findFirst({
    where: { id: parseInt(id), tenantId },
  });

  if (!job) {
    return res.status(404).json({ success: false, message: 'Job posting not found' });
  }

  const updated = await prisma.jobPosting.update({
    where: { id: parseInt(id) },
    data: { status: 'CLOSED' },
  });

  res.json({ success: true, data: updated, message: 'Job closed' });
}

// ==================== JOB APPLICATIONS ====================

export async function listApplications(req, res) {
  const tenantId = req.user.tenantId;
  const { jobId, status, page = 1, limit = 20 } = req.query;

  const where = { tenantId };

  if (jobId) where.jobPostingId = parseInt(jobId);
  if (status) where.status = status;

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [applications, total] = await Promise.all([
    prisma.jobApplication.findMany({
      where,
      skip,
      take: parseInt(limit),
      orderBy: [{ appliedAt: 'desc' }],
      include: {
        jobPosting: { select: { id: true, title: true } },
        referrer: { select: { id: true, firstName: true, lastName: true } },
      },
    }),
    prisma.jobApplication.count({ where }),
  ]);

  res.json({
    success: true,
    data: applications,
    pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) },
  });
}

export async function getApplication(req, res) {
  const tenantId = req.user.tenantId;
  const { id } = req.params;

  const application = await prisma.jobApplication.findFirst({
    where: { id: parseInt(id), tenantId },
    include: {
      jobPosting: {
        select: { id: true, title: true, department: { select: { name: true } }, location: { select: { name: true } } },
      },
      referrer: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  if (!application) {
    return res.status(404).json({ success: false, message: 'Application not found' });
  }

  res.json({ success: true, data: application });
}

export async function createApplication(req, res) {
  const tenantId = req.user.tenantId;

  const {
    jobPostingId,
    firstName,
    lastName,
    email,
    phone,
    resumeUrl,
    coverLetter,
    linkedinUrl,
    portfolioUrl,
    currentCompany,
    currentRole,
    noticePeriod,
    expectedSalary,
    source,
    referredBy,
  } = req.body;

  if (!jobPostingId || !firstName || !lastName || !email || !phone) {
    return res.status(400).json({
      success: false,
      message: 'Job posting, first name, last name, email, and phone are required',
    });
  }

  // Verify job exists and is active
  const job = await prisma.jobPosting.findFirst({
    where: { id: parseInt(jobPostingId), tenantId, status: 'ACTIVE' },
  });

  if (!job) {
    return res.status(400).json({ success: false, message: 'Job posting not found or not accepting applications' });
  }

  // Check for duplicate application
  const existing = await prisma.jobApplication.findFirst({
    where: { jobPostingId: parseInt(jobPostingId), email, tenantId },
  });

  if (existing) {
    return res.status(400).json({ success: false, message: 'Application already exists for this email' });
  }

  const application = await prisma.jobApplication.create({
    data: {
      tenantId,
      jobPostingId: parseInt(jobPostingId),
      firstName,
      lastName,
      email,
      phone,
      resumeUrl,
      coverLetter,
      linkedinUrl,
      portfolioUrl,
      currentCompany,
      currentRole,
      noticePeriod,
      expectedSalary: expectedSalary ? parseFloat(expectedSalary) : null,
      source,
      referredBy: referredBy ? parseInt(referredBy) : null,
    },
    include: {
      jobPosting: { select: { id: true, title: true } },
    },
  });

  res.status(201).json({ success: true, data: application });
}

export async function updateApplicationStatus(req, res) {
  const tenantId = req.user.tenantId;
  const userId = req.user.id;
  const { id } = req.params;
  const { status, rating, notes } = req.body;

  const application = await prisma.jobApplication.findFirst({
    where: { id: parseInt(id), tenantId },
  });

  if (!application) {
    return res.status(404).json({ success: false, message: 'Application not found' });
  }

  const updateData = {};
  if (status !== undefined) updateData.status = status;
  if (rating !== undefined) updateData.rating = parseInt(rating);
  if (notes !== undefined) updateData.notes = notes;

  const updated = await prisma.jobApplication.update({
    where: { id: parseInt(id) },
    data: updateData,
    include: {
      jobPosting: { select: { id: true, title: true } },
    },
  });

  await createAuditLog({
    tenantId,
    userId,
    action: 'UPDATE',
    entityType: 'JobApplication',
    entityId: application.id,
    oldValues: application,
    newValues: updated,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  res.json({ success: true, data: updated });
}

export async function deleteApplication(req, res) {
  const tenantId = req.user.tenantId;
  const userId = req.user.id;
  const { id } = req.params;

  const application = await prisma.jobApplication.findFirst({
    where: { id: parseInt(id), tenantId },
  });

  if (!application) {
    return res.status(404).json({ success: false, message: 'Application not found' });
  }

  await prisma.jobApplication.delete({ where: { id: parseInt(id) } });

  await createAuditLog({
    tenantId,
    userId,
    action: 'DELETE',
    entityType: 'JobApplication',
    entityId: application.id,
    oldValues: application,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  res.json({ success: true, message: 'Application deleted' });
}

// ==================== STATS ====================

export async function getRecruitmentStats(req, res) {
  const tenantId = req.user.tenantId;

  const [jobStats, applicationStats, statusCounts] = await Promise.all([
    prisma.jobPosting.groupBy({
      by: ['status'],
      where: { tenantId },
      _count: { id: true },
    }),
    prisma.jobApplication.aggregate({
      where: { tenantId },
      _count: { id: true },
    }),
    prisma.jobApplication.groupBy({
      by: ['status'],
      where: { tenantId },
      _count: { id: true },
    }),
  ]);

  const jobsByStatus = jobStats.reduce((acc, s) => {
    acc[s.status] = s._count.id;
    return acc;
  }, {});

  const applicationsByStatus = statusCounts.reduce((acc, s) => {
    acc[s.status] = s._count.id;
    return acc;
  }, {});

  res.json({
    success: true,
    data: {
      jobs: {
        total: Object.values(jobsByStatus).reduce((a, b) => a + b, 0),
        active: jobsByStatus.ACTIVE || 0,
        draft: jobsByStatus.DRAFT || 0,
        paused: jobsByStatus.PAUSED || 0,
        closed: jobsByStatus.CLOSED || 0,
      },
      applications: {
        total: applicationStats._count.id || 0,
        byStatus: applicationsByStatus,
        new: applicationsByStatus.NEW || 0,
        screening: applicationsByStatus.SCREENING || 0,
        interview: applicationsByStatus.INTERVIEW || 0,
        offer: applicationsByStatus.OFFER || 0,
        hired: applicationsByStatus.HIRED || 0,
        rejected: applicationsByStatus.REJECTED || 0,
      },
    },
  });
}

// ==================== PUBLIC API ====================

export async function listPublicJobs(req, res) {
  const { tenantSlug } = req.params;
  const { departmentId, locationId, employmentType, page = 1, limit = 20 } = req.query;

  // Find tenant by slug
  const tenant = await prisma.tenant.findFirst({
    where: { slug: tenantSlug, status: 'ACTIVE' },
  });

  if (!tenant) {
    return res.status(404).json({ success: false, message: 'Company not found' });
  }

  const where = {
    tenantId: tenant.id,
    status: 'ACTIVE',
  };

  if (departmentId) where.departmentId = parseInt(departmentId);
  if (locationId) where.locationId = parseInt(locationId);
  if (employmentType) where.employmentType = employmentType;

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [jobs, total] = await Promise.all([
    prisma.jobPosting.findMany({
      where,
      skip,
      take: parseInt(limit),
      orderBy: [{ postedAt: 'desc' }],
      select: {
        id: true,
        title: true,
        description: true,
        requirements: true,
        responsibilities: true,
        experience: true,
        salaryMin: true,
        salaryMax: true,
        currency: true,
        employmentType: true,
        skills: true,
        openings: true,
        postedAt: true,
        closingDate: true,
        isRemote: true,
        department: { select: { name: true } },
        designation: { select: { name: true } },
        location: { select: { name: true, city: true } },
      },
    }),
    prisma.jobPosting.count({ where }),
  ]);

  res.json({
    success: true,
    data: jobs,
    company: { name: tenant.name, logo: tenant.logo },
    pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) },
  });
}

export async function getPublicJob(req, res) {
  const { tenantSlug, id } = req.params;

  // Find tenant by slug
  const tenant = await prisma.tenant.findFirst({
    where: { slug: tenantSlug, status: 'ACTIVE' },
  });

  if (!tenant) {
    return res.status(404).json({ success: false, message: 'Company not found' });
  }

  const job = await prisma.jobPosting.findFirst({
    where: { id: parseInt(id), tenantId: tenant.id, status: 'ACTIVE' },
    select: {
      id: true,
      title: true,
      description: true,
      requirements: true,
      responsibilities: true,
      experience: true,
      salaryMin: true,
      salaryMax: true,
      currency: true,
      employmentType: true,
      skills: true,
      openings: true,
      postedAt: true,
      closingDate: true,
      isRemote: true,
      department: { select: { name: true } },
      designation: { select: { name: true } },
      location: { select: { name: true, city: true, address: true } },
    },
  });

  if (!job) {
    return res.status(404).json({ success: false, message: 'Job not found' });
  }

  res.json({
    success: true,
    data: job,
    company: { name: tenant.name, logo: tenant.logo },
  });
}

export async function submitPublicApplication(req, res) {
  const { tenantSlug, id } = req.params;

  // Find tenant by slug
  const tenant = await prisma.tenant.findFirst({
    where: { slug: tenantSlug, status: 'ACTIVE' },
  });

  if (!tenant) {
    return res.status(404).json({ success: false, message: 'Company not found' });
  }

  const job = await prisma.jobPosting.findFirst({
    where: { id: parseInt(id), tenantId: tenant.id, status: 'ACTIVE' },
  });

  if (!job) {
    return res.status(404).json({ success: false, message: 'Job not found or not accepting applications' });
  }

  const {
    firstName,
    lastName,
    email,
    phone,
    resumeUrl,
    coverLetter,
    linkedinUrl,
    portfolioUrl,
    currentCompany,
    currentRole,
    noticePeriod,
    expectedSalary,
    source = 'Website',
  } = req.body;

  if (!firstName || !lastName || !email || !phone) {
    return res.status(400).json({
      success: false,
      message: 'First name, last name, email, and phone are required',
    });
  }

  // Check for duplicate
  const existing = await prisma.jobApplication.findFirst({
    where: { jobPostingId: job.id, email, tenantId: tenant.id },
  });

  if (existing) {
    return res.status(400).json({ success: false, message: 'You have already applied for this position' });
  }

  const application = await prisma.jobApplication.create({
    data: {
      tenantId: tenant.id,
      jobPostingId: job.id,
      firstName,
      lastName,
      email,
      phone,
      resumeUrl,
      coverLetter,
      linkedinUrl,
      portfolioUrl,
      currentCompany,
      currentRole,
      noticePeriod,
      expectedSalary: expectedSalary ? parseFloat(expectedSalary) : null,
      source,
    },
  });

  res.status(201).json({
    success: true,
    message: 'Application submitted successfully',
    applicationId: application.id,
  });
}

// ==================== INTERVIEWS ====================

export async function listInterviews(req, res) {
  const tenantId = req.user.tenantId;
  const { applicationId, interviewerId, status, startDate, endDate, page = 1, limit = 20 } = req.query;

  const where = { tenantId };

  if (applicationId) where.applicationId = parseInt(applicationId);
  if (interviewerId) where.interviewerId = parseInt(interviewerId);
  if (status) where.status = status;

  if (startDate || endDate) {
    where.scheduledAt = {};
    if (startDate) where.scheduledAt.gte = new Date(startDate);
    if (endDate) where.scheduledAt.lte = new Date(endDate);
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [interviews, total] = await Promise.all([
    prisma.interview.findMany({
      where,
      skip,
      take: parseInt(limit),
      orderBy: [{ scheduledAt: 'asc' }],
      include: {
        application: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            jobPosting: { select: { id: true, title: true } },
          },
        },
        interviewer: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    }),
    prisma.interview.count({ where }),
  ]);

  res.json({
    success: true,
    data: interviews,
    pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) },
  });
}

export async function getInterview(req, res) {
  const tenantId = req.user.tenantId;
  const { id } = req.params;

  const interview = await prisma.interview.findFirst({
    where: { id: parseInt(id), tenantId },
    include: {
      application: {
        include: {
          jobPosting: { select: { id: true, title: true, department: { select: { name: true } } } },
        },
      },
      interviewer: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  });

  if (!interview) {
    return res.status(404).json({ success: false, message: 'Interview not found' });
  }

  res.json({ success: true, data: interview });
}

export async function scheduleInterview(req, res) {
  const tenantId = req.user.tenantId;
  const userId = req.user.id;

  const { applicationId, interviewerId, title, type = 'VIDEO', scheduledAt, duration = 60, location } = req.body;

  if (!applicationId || !interviewerId || !title || !scheduledAt) {
    return res.status(400).json({
      success: false,
      message: 'Application, interviewer, title, and scheduled time are required',
    });
  }

  // Verify application exists
  const application = await prisma.jobApplication.findFirst({
    where: { id: parseInt(applicationId), tenantId },
  });

  if (!application) {
    return res.status(400).json({ success: false, message: 'Application not found' });
  }

  // Verify interviewer exists
  const interviewer = await prisma.user.findFirst({
    where: { id: parseInt(interviewerId), tenantId },
  });

  if (!interviewer) {
    return res.status(400).json({ success: false, message: 'Interviewer not found' });
  }

  const interview = await prisma.interview.create({
    data: {
      tenantId,
      applicationId: parseInt(applicationId),
      interviewerId: parseInt(interviewerId),
      title,
      type,
      scheduledAt: new Date(scheduledAt),
      duration: parseInt(duration),
      location,
    },
    include: {
      application: {
        select: { firstName: true, lastName: true, jobPosting: { select: { title: true } } },
      },
      interviewer: { select: { firstName: true, lastName: true } },
    },
  });

  // Update application status to INTERVIEW if not already further
  if (['NEW', 'SCREENING', 'SHORTLISTED'].includes(application.status)) {
    await prisma.jobApplication.update({
      where: { id: parseInt(applicationId) },
      data: { status: 'INTERVIEW' },
    });
  }

  await createAuditLog({
    tenantId,
    userId,
    action: 'CREATE',
    entityType: 'Interview',
    entityId: interview.id,
    newValues: interview,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  res.status(201).json({ success: true, data: interview });
}

export async function updateInterview(req, res) {
  const tenantId = req.user.tenantId;
  const userId = req.user.id;
  const { id } = req.params;

  const existing = await prisma.interview.findFirst({
    where: { id: parseInt(id), tenantId },
  });

  if (!existing) {
    return res.status(404).json({ success: false, message: 'Interview not found' });
  }

  const { title, type, scheduledAt, duration, location, interviewerId } = req.body;

  const updateData = {};
  if (title !== undefined) updateData.title = title;
  if (type !== undefined) updateData.type = type;
  if (scheduledAt !== undefined) updateData.scheduledAt = new Date(scheduledAt);
  if (duration !== undefined) updateData.duration = parseInt(duration);
  if (location !== undefined) updateData.location = location;
  if (interviewerId !== undefined) updateData.interviewerId = parseInt(interviewerId);

  const interview = await prisma.interview.update({
    where: { id: parseInt(id) },
    data: updateData,
    include: {
      application: { select: { firstName: true, lastName: true } },
      interviewer: { select: { firstName: true, lastName: true } },
    },
  });

  res.json({ success: true, data: interview });
}

export async function cancelInterview(req, res) {
  const tenantId = req.user.tenantId;
  const userId = req.user.id;
  const { id } = req.params;

  const interview = await prisma.interview.findFirst({
    where: { id: parseInt(id), tenantId },
  });

  if (!interview) {
    return res.status(404).json({ success: false, message: 'Interview not found' });
  }

  if (interview.status === 'COMPLETED') {
    return res.status(400).json({ success: false, message: 'Cannot cancel completed interview' });
  }

  const updated = await prisma.interview.update({
    where: { id: parseInt(id) },
    data: { status: 'CANCELLED' },
  });

  res.json({ success: true, data: updated, message: 'Interview cancelled' });
}

export async function submitInterviewFeedback(req, res) {
  const tenantId = req.user.tenantId;
  const userId = req.user.id;
  const { id } = req.params;

  const interview = await prisma.interview.findFirst({
    where: { id: parseInt(id), tenantId },
  });

  if (!interview) {
    return res.status(404).json({ success: false, message: 'Interview not found' });
  }

  // Only interviewer can submit feedback
  if (interview.interviewerId !== userId) {
    return res.status(403).json({ success: false, message: 'Only the interviewer can submit feedback' });
  }

  const { feedback, rating, strengths, weaknesses, recommendation, status = 'COMPLETED' } = req.body;

  const updated = await prisma.interview.update({
    where: { id: parseInt(id) },
    data: {
      feedback,
      rating: rating ? parseInt(rating) : null,
      strengths,
      weaknesses,
      recommendation,
      status,
    },
    include: {
      application: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  await createAuditLog({
    tenantId,
    userId,
    action: 'UPDATE',
    entityType: 'Interview',
    entityId: interview.id,
    newValues: { feedback: 'submitted', rating, recommendation },
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  res.json({ success: true, data: updated, message: 'Feedback submitted' });
}

export async function deleteInterview(req, res) {
  const tenantId = req.user.tenantId;
  const userId = req.user.id;
  const { id } = req.params;

  const interview = await prisma.interview.findFirst({
    where: { id: parseInt(id), tenantId },
  });

  if (!interview) {
    return res.status(404).json({ success: false, message: 'Interview not found' });
  }

  if (interview.status === 'COMPLETED') {
    return res.status(400).json({ success: false, message: 'Cannot delete completed interview' });
  }

  await prisma.interview.delete({ where: { id: parseInt(id) } });

  await createAuditLog({
    tenantId,
    userId,
    action: 'DELETE',
    entityType: 'Interview',
    entityId: interview.id,
    oldValues: interview,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  res.json({ success: true, message: 'Interview deleted' });
}

export async function getMyInterviews(req, res) {
  const tenantId = req.user.tenantId;
  const userId = req.user.id;
  const { status, startDate, endDate } = req.query;

  const where = { tenantId, interviewerId: userId };

  if (status) where.status = status;

  if (startDate || endDate) {
    where.scheduledAt = {};
    if (startDate) where.scheduledAt.gte = new Date(startDate);
    if (endDate) where.scheduledAt.lte = new Date(endDate);
  }

  const interviews = await prisma.interview.findMany({
    where,
    orderBy: [{ scheduledAt: 'asc' }],
    include: {
      application: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          resumeUrl: true,
          jobPosting: { select: { id: true, title: true } },
        },
      },
    },
  });

  res.json({ success: true, data: interviews });
}

export async function getApplicationWithInterviews(req, res) {
  const tenantId = req.user.tenantId;
  const { id } = req.params;

  const application = await prisma.jobApplication.findFirst({
    where: { id: parseInt(id), tenantId },
    include: {
      jobPosting: {
        select: {
          id: true,
          title: true,
          department: { select: { name: true } },
          designation: { select: { name: true } },
          location: { select: { name: true, city: true } },
        },
      },
      referrer: { select: { id: true, firstName: true, lastName: true } },
      interviews: {
        orderBy: { scheduledAt: 'asc' },
        include: {
          interviewer: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      },
    },
  });

  if (!application) {
    return res.status(404).json({ success: false, message: 'Application not found' });
  }

  res.json({ success: true, data: application });
}
