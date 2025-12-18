import prisma from '@shared/config/database.js';
import { createAuditLog } from '@shared/utilities/audit.js';

// ==================== SKILLS ====================

export async function listSkills(req, res) {
  const tenantId = req.user.tenantId;
  const { category, isActive, search } = req.query;

  const where = { tenantId };

  if (category) where.category = category;
  if (isActive !== undefined) where.isActive = isActive === 'true';
  if (search) where.name = { contains: search, mode: 'insensitive' };

  const skills = await prisma.skill.findMany({
    where,
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
    include: {
      _count: { select: { employeeSkills: true } },
    },
  });

  res.json({ success: true, data: skills });
}

export async function getSkill(req, res) {
  const tenantId = req.user.tenantId;
  const { id } = req.params;

  const skill = await prisma.skill.findFirst({
    where: { id: parseInt(id), tenantId },
    include: {
      employeeSkills: {
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              department: { select: { name: true } },
              designation: { select: { name: true } },
            },
          },
          certifier: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { level: 'desc' },
      },
    },
  });

  if (!skill) {
    return res.status(404).json({ success: false, message: 'Skill not found' });
  }

  res.json({ success: true, data: skill });
}

export async function createSkill(req, res) {
  const tenantId = req.user.tenantId;
  const userId = req.user.id;

  const { name, category = 'TECHNICAL', description } = req.body;

  if (!name) {
    return res.status(400).json({ success: false, message: 'Skill name is required' });
  }

  // Check for duplicate
  const existing = await prisma.skill.findFirst({
    where: { tenantId, name: { equals: name, mode: 'insensitive' } },
  });

  if (existing) {
    return res.status(400).json({ success: false, message: 'Skill with this name already exists' });
  }

  const skill = await prisma.skill.create({
    data: {
      tenantId,
      name,
      category,
      description,
    },
  });

  await createAuditLog({
    tenantId,
    userId,
    action: 'CREATE',
    entityType: 'Skill',
    entityId: skill.id,
    newValues: skill,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  res.status(201).json({ success: true, data: skill });
}

export async function updateSkill(req, res) {
  const tenantId = req.user.tenantId;
  const userId = req.user.id;
  const { id } = req.params;

  const existing = await prisma.skill.findFirst({
    where: { id: parseInt(id), tenantId },
  });

  if (!existing) {
    return res.status(404).json({ success: false, message: 'Skill not found' });
  }

  const { name, category, description, isActive } = req.body;

  // Check for duplicate name if changing
  if (name && name !== existing.name) {
    const duplicate = await prisma.skill.findFirst({
      where: { tenantId, name: { equals: name, mode: 'insensitive' }, id: { not: parseInt(id) } },
    });
    if (duplicate) {
      return res.status(400).json({ success: false, message: 'Skill with this name already exists' });
    }
  }

  const updateData = {};
  if (name !== undefined) updateData.name = name;
  if (category !== undefined) updateData.category = category;
  if (description !== undefined) updateData.description = description;
  if (isActive !== undefined) updateData.isActive = isActive;

  const skill = await prisma.skill.update({
    where: { id: parseInt(id) },
    data: updateData,
  });

  res.json({ success: true, data: skill });
}

export async function deleteSkill(req, res) {
  const tenantId = req.user.tenantId;
  const userId = req.user.id;
  const { id } = req.params;

  const skill = await prisma.skill.findFirst({
    where: { id: parseInt(id), tenantId },
    include: { _count: { select: { employeeSkills: true } } },
  });

  if (!skill) {
    return res.status(404).json({ success: false, message: 'Skill not found' });
  }

  if (skill._count.employeeSkills > 0) {
    return res.status(400).json({
      success: false,
      message: 'Cannot delete skill with employee assignments. Deactivate it instead.',
    });
  }

  await prisma.skill.delete({ where: { id: parseInt(id) } });

  await createAuditLog({
    tenantId,
    userId,
    action: 'DELETE',
    entityType: 'Skill',
    entityId: skill.id,
    oldValues: skill,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  res.json({ success: true, message: 'Skill deleted' });
}

// ==================== EMPLOYEE SKILLS ====================

export async function getEmployeeSkills(req, res) {
  const tenantId = req.user.tenantId;
  const { userId } = req.params;

  const skills = await prisma.employeeSkill.findMany({
    where: { tenantId, userId: parseInt(userId) },
    include: {
      skill: true,
      certifier: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: [{ skill: { category: 'asc' } }, { level: 'desc' }],
  });

  res.json({ success: true, data: skills });
}

export async function assignSkill(req, res) {
  const tenantId = req.user.tenantId;
  const currentUserId = req.user.id;
  const { userId } = req.params;
  const { skillId, level = 1, yearsOfExp, lastUsed, isCertified, notes } = req.body;

  if (!skillId) {
    return res.status(400).json({ success: false, message: 'Skill ID is required' });
  }

  // Verify skill exists
  const skill = await prisma.skill.findFirst({
    where: { id: parseInt(skillId), tenantId, isActive: true },
  });

  if (!skill) {
    return res.status(400).json({ success: false, message: 'Skill not found or inactive' });
  }

  // Verify user exists
  const user = await prisma.user.findFirst({
    where: { id: parseInt(userId), tenantId },
  });

  if (!user) {
    return res.status(400).json({ success: false, message: 'User not found' });
  }

  // Check if already assigned
  const existing = await prisma.employeeSkill.findFirst({
    where: { userId: parseInt(userId), skillId: parseInt(skillId) },
  });

  if (existing) {
    return res.status(400).json({ success: false, message: 'Skill already assigned to this employee' });
  }

  const employeeSkill = await prisma.employeeSkill.create({
    data: {
      tenantId,
      userId: parseInt(userId),
      skillId: parseInt(skillId),
      level: parseInt(level),
      yearsOfExp: yearsOfExp ? parseFloat(yearsOfExp) : null,
      lastUsed: lastUsed ? new Date(lastUsed) : null,
      isCertified: isCertified || false,
      certifiedAt: isCertified ? new Date() : null,
      certifiedBy: isCertified ? currentUserId : null,
      notes,
    },
    include: {
      skill: true,
      user: { select: { firstName: true, lastName: true } },
    },
  });

  res.status(201).json({ success: true, data: employeeSkill });
}

export async function updateEmployeeSkill(req, res) {
  const tenantId = req.user.tenantId;
  const currentUserId = req.user.id;
  const { userId, skillId } = req.params;
  const { level, yearsOfExp, lastUsed, isCertified, notes } = req.body;

  const existing = await prisma.employeeSkill.findFirst({
    where: { userId: parseInt(userId), skillId: parseInt(skillId), tenantId },
  });

  if (!existing) {
    return res.status(404).json({ success: false, message: 'Employee skill not found' });
  }

  const updateData = {};
  if (level !== undefined) updateData.level = parseInt(level);
  if (yearsOfExp !== undefined) updateData.yearsOfExp = yearsOfExp ? parseFloat(yearsOfExp) : null;
  if (lastUsed !== undefined) updateData.lastUsed = lastUsed ? new Date(lastUsed) : null;
  if (notes !== undefined) updateData.notes = notes;

  // Handle certification
  if (isCertified !== undefined) {
    updateData.isCertified = isCertified;
    if (isCertified && !existing.isCertified) {
      updateData.certifiedAt = new Date();
      updateData.certifiedBy = currentUserId;
    } else if (!isCertified) {
      updateData.certifiedAt = null;
      updateData.certifiedBy = null;
    }
  }

  const employeeSkill = await prisma.employeeSkill.update({
    where: { id: existing.id },
    data: updateData,
    include: {
      skill: true,
      certifier: { select: { firstName: true, lastName: true } },
    },
  });

  res.json({ success: true, data: employeeSkill });
}

export async function removeEmployeeSkill(req, res) {
  const tenantId = req.user.tenantId;
  const { userId, skillId } = req.params;

  const existing = await prisma.employeeSkill.findFirst({
    where: { userId: parseInt(userId), skillId: parseInt(skillId), tenantId },
  });

  if (!existing) {
    return res.status(404).json({ success: false, message: 'Employee skill not found' });
  }

  await prisma.employeeSkill.delete({ where: { id: existing.id } });

  res.json({ success: true, message: 'Skill removed from employee' });
}

export async function bulkAssignSkill(req, res) {
  const tenantId = req.user.tenantId;
  const currentUserId = req.user.id;
  const { skillId, userIds, level = 1 } = req.body;

  if (!skillId || !userIds || !Array.isArray(userIds) || userIds.length === 0) {
    return res.status(400).json({ success: false, message: 'Skill ID and user IDs are required' });
  }

  // Verify skill exists
  const skill = await prisma.skill.findFirst({
    where: { id: parseInt(skillId), tenantId, isActive: true },
  });

  if (!skill) {
    return res.status(400).json({ success: false, message: 'Skill not found or inactive' });
  }

  const results = await Promise.all(
    userIds.map(async (uid) => {
      try {
        return await prisma.employeeSkill.create({
          data: {
            tenantId,
            userId: parseInt(uid),
            skillId: parseInt(skillId),
            level: parseInt(level),
          },
        });
      } catch (err) {
        // Unique constraint violation - already assigned
        return null;
      }
    })
  );

  const created = results.filter(Boolean);

  res.status(201).json({
    success: true,
    message: `Skill assigned to ${created.length} employee(s)`,
    data: created,
  });
}

// ==================== SKILL MATRIX ====================

export async function getSkillMatrix(req, res) {
  const tenantId = req.user.tenantId;
  const { departmentId, skillCategory } = req.query;

  // Get all active skills
  const skillWhere = { tenantId, isActive: true };
  if (skillCategory) skillWhere.category = skillCategory;

  const skills = await prisma.skill.findMany({
    where: skillWhere,
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
  });

  // Get employees with their skills
  const userWhere = { tenantId, status: 'ACTIVE' };
  if (departmentId) userWhere.departmentId = parseInt(departmentId);

  const employees = await prisma.user.findMany({
    where: userWhere,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      department: { select: { name: true } },
      designation: { select: { name: true } },
      employeeSkills: {
        select: {
          skillId: true,
          level: true,
          isCertified: true,
        },
      },
    },
    orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
  });

  // Build matrix: { employeeId: { skillId: { level, isCertified } } }
  const matrix = employees.map((emp) => {
    const skillMap = {};
    emp.employeeSkills.forEach((es) => {
      skillMap[es.skillId] = { level: es.level, isCertified: es.isCertified };
    });
    return {
      id: emp.id,
      name: `${emp.firstName} ${emp.lastName || ''}`.trim(),
      department: emp.department?.name,
      designation: emp.designation?.name,
      skills: skillMap,
    };
  });

  res.json({
    success: true,
    data: {
      skills,
      employees: matrix,
    },
  });
}

export async function getSkillGapAnalysis(req, res) {
  const tenantId = req.user.tenantId;
  const { departmentId, minLevel = 3 } = req.query;

  // Get all active skills
  const skills = await prisma.skill.findMany({
    where: { tenantId, isActive: true },
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
  });

  // Get employee skill counts by skill and level
  const userWhere = { tenantId, status: 'ACTIVE' };
  if (departmentId) userWhere.departmentId = parseInt(departmentId);

  const totalEmployees = await prisma.user.count({ where: userWhere });

  const skillStats = await Promise.all(
    skills.map(async (skill) => {
      const employeeSkillWhere = { skillId: skill.id, tenantId };
      if (departmentId) {
        employeeSkillWhere.user = { departmentId: parseInt(departmentId) };
      }

      const counts = await prisma.employeeSkill.groupBy({
        by: ['level'],
        where: employeeSkillWhere,
        _count: { id: true },
      });

      const levelCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      counts.forEach((c) => {
        levelCounts[c.level] = c._count.id;
      });

      const totalWithSkill = Object.values(levelCounts).reduce((a, b) => a + b, 0);
      const proficient = levelCounts[3] + levelCounts[4] + levelCounts[5]; // Intermediate and above
      const expert = levelCounts[5];

      return {
        skillId: skill.id,
        skillName: skill.name,
        category: skill.category,
        totalEmployees,
        withSkill: totalWithSkill,
        withoutSkill: totalEmployees - totalWithSkill,
        proficient,
        expert,
        gapPercentage: totalEmployees > 0 ? Math.round(((totalEmployees - totalWithSkill) / totalEmployees) * 100) : 0,
        levelDistribution: levelCounts,
      };
    })
  );

  // Sort by gap (descending)
  skillStats.sort((a, b) => b.gapPercentage - a.gapPercentage);

  res.json({ success: true, data: skillStats });
}

export async function getSkillStats(req, res) {
  const tenantId = req.user.tenantId;

  const [totalSkills, totalAssignments, byCategory, topSkills, certifiedCount] = await Promise.all([
    prisma.skill.count({ where: { tenantId, isActive: true } }),
    prisma.employeeSkill.count({ where: { tenantId } }),
    prisma.skill.groupBy({
      by: ['category'],
      where: { tenantId, isActive: true },
      _count: { id: true },
    }),
    prisma.employeeSkill.groupBy({
      by: ['skillId'],
      where: { tenantId },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5,
    }),
    prisma.employeeSkill.count({ where: { tenantId, isCertified: true } }),
  ]);

  // Get skill names for top skills
  const topSkillIds = topSkills.map((s) => s.skillId);
  const topSkillNames = await prisma.skill.findMany({
    where: { id: { in: topSkillIds } },
    select: { id: true, name: true },
  });

  const topSkillsWithNames = topSkills.map((s) => ({
    skillId: s.skillId,
    skillName: topSkillNames.find((sn) => sn.id === s.skillId)?.name || 'Unknown',
    count: s._count.id,
  }));

  res.json({
    success: true,
    data: {
      totalSkills,
      totalAssignments,
      certifiedCount,
      byCategory: byCategory.map((c) => ({ category: c.category, count: c._count.id })),
      topSkills: topSkillsWithNames,
    },
  });
}

// ==================== MY SKILLS ====================

export async function getMySkills(req, res) {
  const tenantId = req.user.tenantId;
  const userId = req.user.id;

  const skills = await prisma.employeeSkill.findMany({
    where: { tenantId, userId },
    include: {
      skill: true,
      certifier: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: [{ skill: { category: 'asc' } }, { level: 'desc' }],
  });

  res.json({ success: true, data: skills });
}

export async function updateMySkill(req, res) {
  const tenantId = req.user.tenantId;
  const userId = req.user.id;
  const { skillId } = req.params;
  const { level, yearsOfExp, lastUsed } = req.body;

  const existing = await prisma.employeeSkill.findFirst({
    where: { userId, skillId: parseInt(skillId), tenantId },
  });

  if (!existing) {
    return res.status(404).json({ success: false, message: 'Skill not found in your profile' });
  }

  const updateData = {};
  if (level !== undefined) updateData.level = parseInt(level);
  if (yearsOfExp !== undefined) updateData.yearsOfExp = yearsOfExp ? parseFloat(yearsOfExp) : null;
  if (lastUsed !== undefined) updateData.lastUsed = lastUsed ? new Date(lastUsed) : null;

  const employeeSkill = await prisma.employeeSkill.update({
    where: { id: existing.id },
    data: updateData,
    include: { skill: true },
  });

  res.json({ success: true, data: employeeSkill });
}

export async function addMySkill(req, res) {
  const tenantId = req.user.tenantId;
  const userId = req.user.id;
  const { skillId, level = 1, yearsOfExp, lastUsed } = req.body;

  if (!skillId) {
    return res.status(400).json({ success: false, message: 'Skill ID is required' });
  }

  // Verify skill exists
  const skill = await prisma.skill.findFirst({
    where: { id: parseInt(skillId), tenantId, isActive: true },
  });

  if (!skill) {
    return res.status(400).json({ success: false, message: 'Skill not found or inactive' });
  }

  // Check if already assigned
  const existing = await prisma.employeeSkill.findFirst({
    where: { userId, skillId: parseInt(skillId) },
  });

  if (existing) {
    return res.status(400).json({ success: false, message: 'You already have this skill in your profile' });
  }

  const employeeSkill = await prisma.employeeSkill.create({
    data: {
      tenantId,
      userId,
      skillId: parseInt(skillId),
      level: parseInt(level),
      yearsOfExp: yearsOfExp ? parseFloat(yearsOfExp) : null,
      lastUsed: lastUsed ? new Date(lastUsed) : null,
    },
    include: { skill: true },
  });

  res.status(201).json({ success: true, data: employeeSkill });
}
