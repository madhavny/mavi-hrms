import prisma from '@shared/config/database.js';
import { createAuditLog } from '@shared/utilities/audit.js';

// ==================== ASSETS ====================

export async function listAssets(req, res) {
  const tenantId = req.user.tenantId;
  const { category, status, locationId, currentUserId, search, page = 1, limit = 50 } = req.query;

  const where = { tenantId };

  if (category) where.category = category;
  if (status) where.status = status;
  if (locationId) where.locationId = parseInt(locationId);
  if (currentUserId) where.currentUserId = parseInt(currentUserId);
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { assetCode: { contains: search, mode: 'insensitive' } },
      { serialNumber: { contains: search, mode: 'insensitive' } },
      { brand: { contains: search, mode: 'insensitive' } },
    ];
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [assets, total] = await Promise.all([
    prisma.asset.findMany({
      where,
      include: {
        currentUser: { select: { id: true, firstName: true, lastName: true, email: true } },
        location: { select: { id: true, name: true, code: true } },
        _count: { select: { allocations: true } },
      },
      orderBy: [{ createdAt: 'desc' }],
      skip,
      take: parseInt(limit),
    }),
    prisma.asset.count({ where }),
  ]);

  res.json({ success: true, data: assets, total, page: parseInt(page), limit: parseInt(limit) });
}

export async function getAsset(req, res) {
  const tenantId = req.user.tenantId;
  const { id } = req.params;

  const asset = await prisma.asset.findFirst({
    where: { id: parseInt(id), tenantId },
    include: {
      currentUser: { select: { id: true, firstName: true, lastName: true, email: true, department: { select: { name: true } } } },
      location: { select: { id: true, name: true, code: true, city: true } },
      allocations: {
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
          allocator: { select: { id: true, firstName: true, lastName: true } },
          returner: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { allocatedAt: 'desc' },
        take: 20,
      },
    },
  });

  if (!asset) {
    return res.status(404).json({ success: false, message: 'Asset not found' });
  }

  res.json({ success: true, data: asset });
}

export async function createAsset(req, res) {
  const tenantId = req.user.tenantId;
  const userId = req.user.id;

  const {
    name,
    assetCode,
    category = 'OTHER',
    brand,
    model,
    serialNumber,
    description,
    purchaseDate,
    purchasePrice,
    currency = 'INR',
    warrantyEnd,
    condition = 'NEW',
    locationId,
    notes,
  } = req.body;

  if (!name || !assetCode) {
    return res.status(400).json({ success: false, message: 'Name and asset code are required' });
  }

  // Check for duplicate asset code
  const existing = await prisma.asset.findFirst({
    where: { tenantId, assetCode: { equals: assetCode, mode: 'insensitive' } },
  });

  if (existing) {
    return res.status(400).json({ success: false, message: 'Asset with this code already exists' });
  }

  const asset = await prisma.asset.create({
    data: {
      tenantId,
      name,
      assetCode: assetCode.toUpperCase(),
      category,
      brand,
      model,
      serialNumber,
      description,
      purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
      purchasePrice: purchasePrice ? parseFloat(purchasePrice) : null,
      currency,
      warrantyEnd: warrantyEnd ? new Date(warrantyEnd) : null,
      status: 'AVAILABLE',
      condition,
      locationId: locationId ? parseInt(locationId) : null,
      notes,
    },
    include: {
      location: { select: { name: true } },
    },
  });

  await createAuditLog({
    tenantId,
    userId,
    action: 'CREATE',
    entityType: 'Asset',
    entityId: asset.id,
    newValues: asset,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  res.status(201).json({ success: true, data: asset });
}

export async function updateAsset(req, res) {
  const tenantId = req.user.tenantId;
  const userId = req.user.id;
  const { id } = req.params;

  const existing = await prisma.asset.findFirst({
    where: { id: parseInt(id), tenantId },
  });

  if (!existing) {
    return res.status(404).json({ success: false, message: 'Asset not found' });
  }

  const {
    name,
    assetCode,
    category,
    brand,
    model,
    serialNumber,
    description,
    purchaseDate,
    purchasePrice,
    currency,
    warrantyEnd,
    condition,
    locationId,
    notes,
  } = req.body;

  // Check for duplicate code if changing
  if (assetCode && assetCode.toUpperCase() !== existing.assetCode) {
    const duplicate = await prisma.asset.findFirst({
      where: { tenantId, assetCode: { equals: assetCode, mode: 'insensitive' }, id: { not: parseInt(id) } },
    });
    if (duplicate) {
      return res.status(400).json({ success: false, message: 'Asset with this code already exists' });
    }
  }

  const updateData = {};
  if (name !== undefined) updateData.name = name;
  if (assetCode !== undefined) updateData.assetCode = assetCode.toUpperCase();
  if (category !== undefined) updateData.category = category;
  if (brand !== undefined) updateData.brand = brand;
  if (model !== undefined) updateData.model = model;
  if (serialNumber !== undefined) updateData.serialNumber = serialNumber;
  if (description !== undefined) updateData.description = description;
  if (purchaseDate !== undefined) updateData.purchaseDate = purchaseDate ? new Date(purchaseDate) : null;
  if (purchasePrice !== undefined) updateData.purchasePrice = purchasePrice ? parseFloat(purchasePrice) : null;
  if (currency !== undefined) updateData.currency = currency;
  if (warrantyEnd !== undefined) updateData.warrantyEnd = warrantyEnd ? new Date(warrantyEnd) : null;
  if (condition !== undefined) updateData.condition = condition;
  if (locationId !== undefined) updateData.locationId = locationId ? parseInt(locationId) : null;
  if (notes !== undefined) updateData.notes = notes;

  const asset = await prisma.asset.update({
    where: { id: parseInt(id) },
    data: updateData,
    include: {
      currentUser: { select: { firstName: true, lastName: true } },
      location: { select: { name: true } },
    },
  });

  res.json({ success: true, data: asset });
}

export async function deleteAsset(req, res) {
  const tenantId = req.user.tenantId;
  const userId = req.user.id;
  const { id } = req.params;

  const asset = await prisma.asset.findFirst({
    where: { id: parseInt(id), tenantId },
    include: { _count: { select: { allocations: true } } },
  });

  if (!asset) {
    return res.status(404).json({ success: false, message: 'Asset not found' });
  }

  if (asset.status === 'ASSIGNED') {
    return res.status(400).json({ success: false, message: 'Cannot delete an assigned asset. Return it first.' });
  }

  // Delete allocation history first
  await prisma.assetAllocation.deleteMany({ where: { assetId: parseInt(id) } });
  await prisma.asset.delete({ where: { id: parseInt(id) } });

  await createAuditLog({
    tenantId,
    userId,
    action: 'DELETE',
    entityType: 'Asset',
    entityId: asset.id,
    oldValues: asset,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  res.json({ success: true, message: 'Asset deleted' });
}

// ==================== ALLOCATION ====================

export async function allocateAsset(req, res) {
  const tenantId = req.user.tenantId;
  const allocatedBy = req.user.id;
  const { id } = req.params;
  const { userId, expectedReturn, conditionOut = 'GOOD', notes } = req.body;

  if (!userId) {
    return res.status(400).json({ success: false, message: 'User ID is required' });
  }

  const asset = await prisma.asset.findFirst({
    where: { id: parseInt(id), tenantId },
  });

  if (!asset) {
    return res.status(404).json({ success: false, message: 'Asset not found' });
  }

  if (asset.status === 'ASSIGNED') {
    return res.status(400).json({ success: false, message: 'Asset is already assigned' });
  }

  if (asset.status === 'MAINTENANCE' || asset.status === 'REPAIR') {
    return res.status(400).json({ success: false, message: 'Asset is under maintenance/repair' });
  }

  if (asset.status === 'RETIRED' || asset.status === 'LOST') {
    return res.status(400).json({ success: false, message: 'Asset is retired or lost' });
  }

  // Verify user exists
  const user = await prisma.user.findFirst({
    where: { id: parseInt(userId), tenantId, status: 'ACTIVE' },
  });

  if (!user) {
    return res.status(400).json({ success: false, message: 'User not found or inactive' });
  }

  // Create allocation and update asset
  const [allocation] = await prisma.$transaction([
    prisma.assetAllocation.create({
      data: {
        tenantId,
        assetId: parseInt(id),
        userId: parseInt(userId),
        allocatedBy,
        expectedReturn: expectedReturn ? new Date(expectedReturn) : null,
        conditionOut,
        notes,
      },
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        asset: { select: { name: true, assetCode: true } },
      },
    }),
    prisma.asset.update({
      where: { id: parseInt(id) },
      data: { status: 'ASSIGNED', currentUserId: parseInt(userId), condition: conditionOut },
    }),
  ]);

  await createAuditLog({
    tenantId,
    userId: allocatedBy,
    action: 'UPDATE',
    entityType: 'Asset',
    entityId: asset.id,
    oldValues: { status: asset.status, currentUserId: asset.currentUserId },
    newValues: { status: 'ASSIGNED', currentUserId: parseInt(userId), action: 'ALLOCATE' },
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  res.status(201).json({ success: true, data: allocation, message: 'Asset allocated successfully' });
}

export async function returnAsset(req, res) {
  const tenantId = req.user.tenantId;
  const returnedBy = req.user.id;
  const { id } = req.params;
  const { conditionIn = 'GOOD', notes } = req.body;

  const asset = await prisma.asset.findFirst({
    where: { id: parseInt(id), tenantId },
    include: {
      allocations: {
        where: { returnedAt: null },
        orderBy: { allocatedAt: 'desc' },
        take: 1,
      },
    },
  });

  if (!asset) {
    return res.status(404).json({ success: false, message: 'Asset not found' });
  }

  if (asset.status !== 'ASSIGNED') {
    return res.status(400).json({ success: false, message: 'Asset is not currently assigned' });
  }

  const activeAllocation = asset.allocations[0];
  if (!activeAllocation) {
    return res.status(400).json({ success: false, message: 'No active allocation found' });
  }

  // Update allocation and asset
  const [updatedAllocation] = await prisma.$transaction([
    prisma.assetAllocation.update({
      where: { id: activeAllocation.id },
      data: {
        returnedAt: new Date(),
        returnedBy,
        conditionIn,
        notes: notes || activeAllocation.notes,
      },
      include: {
        user: { select: { firstName: true, lastName: true } },
        asset: { select: { name: true, assetCode: true } },
      },
    }),
    prisma.asset.update({
      where: { id: parseInt(id) },
      data: { status: 'AVAILABLE', currentUserId: null, condition: conditionIn },
    }),
  ]);

  await createAuditLog({
    tenantId,
    userId: returnedBy,
    action: 'UPDATE',
    entityType: 'Asset',
    entityId: asset.id,
    oldValues: { status: 'ASSIGNED', currentUserId: asset.currentUserId },
    newValues: { status: 'AVAILABLE', currentUserId: null, action: 'RETURN', conditionIn },
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  res.json({ success: true, data: updatedAllocation, message: 'Asset returned successfully' });
}

export async function updateAssetStatus(req, res) {
  const tenantId = req.user.tenantId;
  const userId = req.user.id;
  const { id } = req.params;
  const { status, notes } = req.body;

  if (!status) {
    return res.status(400).json({ success: false, message: 'Status is required' });
  }

  const asset = await prisma.asset.findFirst({
    where: { id: parseInt(id), tenantId },
  });

  if (!asset) {
    return res.status(404).json({ success: false, message: 'Asset not found' });
  }

  // Cannot change status of ASSIGNED asset without returning first
  if (asset.status === 'ASSIGNED' && status !== 'ASSIGNED') {
    return res.status(400).json({ success: false, message: 'Return the asset before changing status' });
  }

  // Cannot assign directly via status update
  if (status === 'ASSIGNED') {
    return res.status(400).json({ success: false, message: 'Use allocate endpoint to assign asset' });
  }

  const updateData = { status };
  if (notes !== undefined) updateData.notes = notes;

  const updatedAsset = await prisma.asset.update({
    where: { id: parseInt(id) },
    data: updateData,
  });

  await createAuditLog({
    tenantId,
    userId,
    action: 'UPDATE',
    entityType: 'Asset',
    entityId: asset.id,
    oldValues: { status: asset.status },
    newValues: { status, action: 'STATUS_CHANGE' },
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  res.json({ success: true, data: updatedAsset });
}

// ==================== HISTORY ====================

export async function getAssetHistory(req, res) {
  const tenantId = req.user.tenantId;
  const { id } = req.params;
  const { page = 1, limit = 20 } = req.query;

  const asset = await prisma.asset.findFirst({
    where: { id: parseInt(id), tenantId },
  });

  if (!asset) {
    return res.status(404).json({ success: false, message: 'Asset not found' });
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [allocations, total] = await Promise.all([
    prisma.assetAllocation.findMany({
      where: { assetId: parseInt(id) },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, department: { select: { name: true } } } },
        allocator: { select: { id: true, firstName: true, lastName: true } },
        returner: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { allocatedAt: 'desc' },
      skip,
      take: parseInt(limit),
    }),
    prisma.assetAllocation.count({ where: { assetId: parseInt(id) } }),
  ]);

  res.json({ success: true, data: allocations, total, page: parseInt(page), limit: parseInt(limit) });
}

// ==================== MY ASSETS ====================

export async function getMyAssets(req, res) {
  const tenantId = req.user.tenantId;
  const userId = req.user.id;

  const assets = await prisma.asset.findMany({
    where: { tenantId, currentUserId: userId },
    include: {
      location: { select: { name: true } },
    },
    orderBy: { name: 'asc' },
  });

  res.json({ success: true, data: assets });
}

export async function getMyAssetHistory(req, res) {
  const tenantId = req.user.tenantId;
  const userId = req.user.id;

  const allocations = await prisma.assetAllocation.findMany({
    where: { tenantId, userId },
    include: {
      asset: { select: { id: true, name: true, assetCode: true, category: true, brand: true, model: true } },
      allocator: { select: { firstName: true, lastName: true } },
    },
    orderBy: { allocatedAt: 'desc' },
    take: 50,
  });

  res.json({ success: true, data: allocations });
}

// ==================== STATS ====================

export async function getAssetStats(req, res) {
  const tenantId = req.user.tenantId;

  const [total, byStatus, byCategory, recentAllocations, upcomingReturns, warrantyExpiring] = await Promise.all([
    prisma.asset.count({ where: { tenantId } }),
    prisma.asset.groupBy({
      by: ['status'],
      where: { tenantId },
      _count: { id: true },
    }),
    prisma.asset.groupBy({
      by: ['category'],
      where: { tenantId },
      _count: { id: true },
    }),
    prisma.assetAllocation.findMany({
      where: { tenantId, returnedAt: null },
      include: {
        asset: { select: { name: true, assetCode: true, category: true } },
        user: { select: { firstName: true, lastName: true } },
      },
      orderBy: { allocatedAt: 'desc' },
      take: 5,
    }),
    prisma.assetAllocation.findMany({
      where: {
        tenantId,
        returnedAt: null,
        expectedReturn: {
          lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Next 7 days
          gte: new Date(),
        },
      },
      include: {
        asset: { select: { name: true, assetCode: true } },
        user: { select: { firstName: true, lastName: true } },
      },
      orderBy: { expectedReturn: 'asc' },
      take: 10,
    }),
    prisma.asset.findMany({
      where: {
        tenantId,
        warrantyEnd: {
          lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Next 30 days
          gte: new Date(),
        },
      },
      select: { id: true, name: true, assetCode: true, warrantyEnd: true },
      orderBy: { warrantyEnd: 'asc' },
      take: 10,
    }),
  ]);

  const totalValue = await prisma.asset.aggregate({
    where: { tenantId, purchasePrice: { not: null } },
    _sum: { purchasePrice: true },
  });

  res.json({
    success: true,
    data: {
      total,
      totalValue: totalValue._sum.purchasePrice || 0,
      byStatus: byStatus.map((s) => ({ status: s.status, count: s._count.id })),
      byCategory: byCategory.map((c) => ({ category: c.category, count: c._count.id })),
      recentAllocations,
      upcomingReturns,
      warrantyExpiring,
    },
  });
}
