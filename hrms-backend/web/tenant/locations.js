import prisma from '@shared/config/database.js';
import { auditCreate, auditUpdate, auditDelete } from '@shared/utilities/audit.js';

/**
 * List all locations for the tenant
 * GET /tenant/locations
 */
export const listLocations = async (req, res) => {
  const { includeInactive } = req.query;
  const tenantId = req.user.tenantId;

  const where = { tenantId };

  // By default, only show active locations
  if (!includeInactive || includeInactive !== 'true') {
    where.isActive = true;
  }

  const locations = await prisma.location.findMany({
    where,
    orderBy: [
      { country: 'asc' },
      { state: 'asc' },
      { city: 'asc' },
      { name: 'asc' }
    ],
    include: {
      _count: {
        select: { users: true }
      }
    }
  });

  // Transform to include employee count
  const transformedLocations = locations.map(loc => ({
    id: loc.id,
    name: loc.name,
    code: loc.code,
    address: loc.address,
    city: loc.city,
    state: loc.state,
    country: loc.country,
    pincode: loc.pincode,
    isActive: loc.isActive,
    employeeCount: loc._count.users,
    createdAt: loc.createdAt,
    updatedAt: loc.updatedAt
  }));

  res.json({
    success: true,
    data: {
      locations: transformedLocations,
      total: transformedLocations.length
    }
  });
};

/**
 * Get a single location by ID
 * GET /tenant/locations/:id
 */
export const getLocation = async (req, res) => {
  const { id } = req.params;
  const tenantId = req.user.tenantId;

  const location = await prisma.location.findFirst({
    where: {
      id: parseInt(id),
      tenantId
    },
    include: {
      _count: {
        select: { users: true }
      },
      users: {
        where: { isActive: true },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          employeeCode: true
        },
        take: 10 // Limit to first 10 employees
      }
    }
  });

  if (!location) {
    return res.status(404).json({
      success: false,
      message: 'Location not found'
    });
  }

  res.json({
    success: true,
    data: {
      location: {
        id: location.id,
        name: location.name,
        code: location.code,
        address: location.address,
        city: location.city,
        state: location.state,
        country: location.country,
        pincode: location.pincode,
        isActive: location.isActive,
        employeeCount: location._count.users,
        employees: location.users,
        createdAt: location.createdAt,
        updatedAt: location.updatedAt
      }
    }
  });
};

/**
 * Create a new location
 * POST /tenant/locations
 */
export const createLocation = async (req, res) => {
  const { name, code, address, city, state, country, pincode } = req.body;
  const tenantId = req.user.tenantId;

  // Check if code already exists for this tenant
  const existingLocation = await prisma.location.findFirst({
    where: {
      tenantId,
      code: code.toUpperCase()
    }
  });

  if (existingLocation) {
    return res.status(400).json({
      success: false,
      message: `Location with code "${code}" already exists`
    });
  }

  const location = await prisma.location.create({
    data: {
      tenantId,
      name,
      code: code.toUpperCase(),
      address: address || null,
      city: city || null,
      state: state || null,
      country: country || 'India',
      pincode: pincode || null,
      isActive: true
    }
  });

  // Audit log
  await auditCreate(req, 'Location', location.id, location.name, location);

  res.status(201).json({
    success: true,
    message: 'Location created successfully',
    data: { location }
  });
};

/**
 * Update a location
 * PATCH /tenant/locations/:id
 */
export const updateLocation = async (req, res) => {
  const { id } = req.params;
  const { name, code, address, city, state, country, pincode, isActive } = req.body;
  const tenantId = req.user.tenantId;

  // Check if location exists
  const existingLocation = await prisma.location.findFirst({
    where: {
      id: parseInt(id),
      tenantId
    }
  });

  if (!existingLocation) {
    return res.status(404).json({
      success: false,
      message: 'Location not found'
    });
  }

  // If updating code, check for uniqueness
  if (code && code.toUpperCase() !== existingLocation.code) {
    const codeExists = await prisma.location.findFirst({
      where: {
        tenantId,
        code: code.toUpperCase(),
        id: { not: parseInt(id) }
      }
    });

    if (codeExists) {
      return res.status(400).json({
        success: false,
        message: `Location with code "${code}" already exists`
      });
    }
  }

  // Build update data
  const updateData = {};
  if (name !== undefined) updateData.name = name;
  if (code !== undefined) updateData.code = code.toUpperCase();
  if (address !== undefined) updateData.address = address || null;
  if (city !== undefined) updateData.city = city || null;
  if (state !== undefined) updateData.state = state || null;
  if (country !== undefined) updateData.country = country;
  if (pincode !== undefined) updateData.pincode = pincode || null;
  if (isActive !== undefined) updateData.isActive = isActive;

  const location = await prisma.location.update({
    where: { id: parseInt(id) },
    data: updateData
  });

  // Audit log
  await auditUpdate(req, 'Location', location.id, location.name, existingLocation, location);

  res.json({
    success: true,
    message: 'Location updated successfully',
    data: { location }
  });
};

/**
 * Delete a location
 * DELETE /tenant/locations/:id
 */
export const deleteLocation = async (req, res) => {
  const { id } = req.params;
  const { force } = req.query;
  const tenantId = req.user.tenantId;

  // Check if location exists
  const location = await prisma.location.findFirst({
    where: {
      id: parseInt(id),
      tenantId
    },
    include: {
      _count: {
        select: { users: true }
      }
    }
  });

  if (!location) {
    return res.status(404).json({
      success: false,
      message: 'Location not found'
    });
  }

  // Check if location has employees
  if (location._count.users > 0 && force !== 'true') {
    return res.status(400).json({
      success: false,
      message: `Cannot delete location "${location.name}" because it has ${location._count.users} employee(s) assigned. Remove employees from this location first or use force=true to deactivate instead.`,
      data: {
        employeeCount: location._count.users,
        suggestion: 'deactivate'
      }
    });
  }

  // If force delete with employees, just deactivate
  if (location._count.users > 0 && force === 'true') {
    const deactivatedLocation = await prisma.location.update({
      where: { id: parseInt(id) },
      data: { isActive: false }
    });

    await auditUpdate(req, 'Location', location.id, location.name, location, deactivatedLocation);

    return res.json({
      success: true,
      message: `Location "${location.name}" has been deactivated (has ${location._count.users} employees)`,
      data: { location: deactivatedLocation, action: 'deactivated' }
    });
  }

  // Hard delete if no employees
  await prisma.location.delete({
    where: { id: parseInt(id) }
  });

  // Audit log
  await auditDelete(req, 'Location', location.id, location.name, location);

  res.json({
    success: true,
    message: `Location "${location.name}" deleted successfully`
  });
};
