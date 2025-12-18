import prisma from '../../shared/config/database.js';
import { createAuditLog } from '../../shared/utilities/audit.js';

// ==================== COMPANY DOCUMENTS ====================

/**
 * List company documents with filters
 */
export const listDocuments = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const {
      page = 1,
      limit = 20,
      type,
      category,
      isPublic,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build where clause
    const where = {
      tenantId,
      isActive: true,
      parentId: null, // Only show latest versions
    };

    // Filter by document type
    if (type) {
      where.type = type;
    }

    // Filter by category
    if (category) {
      where.category = category;
    }

    // Filter by public status
    if (isPublic !== undefined) {
      where.isPublic = isPublic === 'true';
    }

    // Non-admins can only see public documents
    if (req.user.type !== 'tenant_admin' && req.user.role?.code !== 'ADMIN' && req.user.role?.code !== 'HR') {
      where.isPublic = true;
    }

    // Search by name or description
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Build orderBy
    const orderBy = {};
    orderBy[sortBy] = sortOrder;

    const [documents, total] = await Promise.all([
      prisma.document.findMany({
        where,
        include: {
          uploader: {
            select: { id: true, firstName: true, lastName: true, email: true }
          },
          _count: {
            select: { versions: true }
          }
        },
        orderBy,
        skip,
        take: parseInt(limit),
      }),
      prisma.document.count({ where }),
    ]);

    res.json({
      documents,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (error) {
    console.error('Error listing documents:', error);
    res.status(500).json({ error: 'Failed to list documents' });
  }
};

/**
 * Get single document with versions
 */
export const getDocument = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const { id } = req.params;

    const document = await prisma.document.findFirst({
      where: {
        id: parseInt(id),
        tenantId,
        isActive: true,
      },
      include: {
        uploader: {
          select: { id: true, firstName: true, lastName: true, email: true }
        },
        versions: {
          where: { isActive: true },
          orderBy: { version: 'desc' },
          include: {
            uploader: {
              select: { id: true, firstName: true, lastName: true, email: true }
            }
          }
        },
        parent: {
          select: { id: true, name: true, version: true }
        }
      },
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Check access - non-admins can only see public documents
    if (!document.isPublic &&
        req.user.type !== 'tenant_admin' &&
        req.user.role?.code !== 'ADMIN' &&
        req.user.role?.code !== 'HR') {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(document);
  } catch (error) {
    console.error('Error getting document:', error);
    res.status(500).json({ error: 'Failed to get document' });
  }
};

/**
 * Create/upload a new document
 */
export const createDocument = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const userId = req.user.id;
    const {
      name,
      type,
      category,
      description,
      fileUrl,
      fileName,
      fileSize,
      mimeType,
      isPublic = false,
      tags
    } = req.body;

    // Validate required fields
    if (!name || !type || !category || !fileUrl || !fileName || !fileSize || !mimeType) {
      return res.status(400).json({
        error: 'Missing required fields: name, type, category, fileUrl, fileName, fileSize, mimeType'
      });
    }

    const document = await prisma.document.create({
      data: {
        tenantId,
        name,
        type,
        category,
        description,
        fileUrl,
        fileName,
        fileSize: parseInt(fileSize),
        mimeType,
        uploadedBy: userId,
        isPublic: Boolean(isPublic),
        version: 1,
        tags: tags ? JSON.stringify(tags) : null,
      },
      include: {
        uploader: {
          select: { id: true, firstName: true, lastName: true, email: true }
        }
      }
    });

    // Audit log
    await createAuditLog({
      tenantId,
      userId,
      action: 'CREATE',
      entity: 'Document',
      entityId: document.id,
      newValues: { name, type, category, isPublic },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.status(201).json(document);
  } catch (error) {
    console.error('Error creating document:', error);
    res.status(500).json({ error: 'Failed to create document' });
  }
};

/**
 * Update document metadata
 */
export const updateDocument = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const userId = req.user.id;
    const { id } = req.params;
    const { name, description, isPublic, tags, category } = req.body;

    const existing = await prisma.document.findFirst({
      where: { id: parseInt(id), tenantId, isActive: true },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Only uploader or admin can update
    if (existing.uploadedBy !== userId &&
        req.user.type !== 'tenant_admin' &&
        req.user.role?.code !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (isPublic !== undefined) updateData.isPublic = Boolean(isPublic);
    if (tags !== undefined) updateData.tags = JSON.stringify(tags);
    if (category !== undefined) updateData.category = category;

    const document = await prisma.document.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: {
        uploader: {
          select: { id: true, firstName: true, lastName: true, email: true }
        }
      }
    });

    // Audit log
    await createAuditLog({
      tenantId,
      userId,
      action: 'UPDATE',
      entity: 'Document',
      entityId: document.id,
      oldValues: { name: existing.name, isPublic: existing.isPublic },
      newValues: updateData,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json(document);
  } catch (error) {
    console.error('Error updating document:', error);
    res.status(500).json({ error: 'Failed to update document' });
  }
};

/**
 * Upload new version of document
 */
export const uploadNewVersion = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const userId = req.user.id;
    const { id } = req.params;
    const { fileUrl, fileName, fileSize, mimeType, description } = req.body;

    // Validate required fields
    if (!fileUrl || !fileName || !fileSize || !mimeType) {
      return res.status(400).json({
        error: 'Missing required fields: fileUrl, fileName, fileSize, mimeType'
      });
    }

    const existing = await prisma.document.findFirst({
      where: { id: parseInt(id), tenantId, isActive: true },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Create new version
    const newVersion = await prisma.document.create({
      data: {
        tenantId,
        name: existing.name,
        type: existing.type,
        category: existing.category,
        description: description || existing.description,
        fileUrl,
        fileName,
        fileSize: parseInt(fileSize),
        mimeType,
        uploadedBy: userId,
        isPublic: existing.isPublic,
        version: existing.version + 1,
        parentId: existing.id, // Link to previous version
        tags: existing.tags,
      },
      include: {
        uploader: {
          select: { id: true, firstName: true, lastName: true, email: true }
        }
      }
    });

    // Audit log
    await createAuditLog({
      tenantId,
      userId,
      action: 'CREATE',
      entity: 'Document',
      entityId: newVersion.id,
      newValues: { version: newVersion.version, parentId: existing.id },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.status(201).json(newVersion);
  } catch (error) {
    console.error('Error uploading new version:', error);
    res.status(500).json({ error: 'Failed to upload new version' });
  }
};

/**
 * Delete document (soft delete)
 */
export const deleteDocument = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const userId = req.user.id;
    const { id } = req.params;

    const existing = await prisma.document.findFirst({
      where: { id: parseInt(id), tenantId, isActive: true },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Only uploader or admin can delete
    if (existing.uploadedBy !== userId &&
        req.user.type !== 'tenant_admin' &&
        req.user.role?.code !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Soft delete document and all its versions
    await prisma.document.updateMany({
      where: {
        OR: [
          { id: parseInt(id) },
          { parentId: parseInt(id) }
        ],
        tenantId,
      },
      data: { isActive: false }
    });

    // Audit log
    await createAuditLog({
      tenantId,
      userId,
      action: 'DELETE',
      entity: 'Document',
      entityId: parseInt(id),
      oldValues: { name: existing.name },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
};

/**
 * Get document categories
 */
export const getDocumentCategories = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;

    const categories = await prisma.document.findMany({
      where: {
        tenantId,
        isActive: true,
        parentId: null,
      },
      distinct: ['category'],
      select: { category: true },
      orderBy: { category: 'asc' },
    });

    res.json(categories.map(c => c.category));
  } catch (error) {
    console.error('Error getting document categories:', error);
    res.status(500).json({ error: 'Failed to get document categories' });
  }
};

/**
 * Get document statistics
 */
export const getDocumentStats = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;

    const [
      totalDocuments,
      byType,
      byCategory,
      recentUploads,
      totalSize,
    ] = await Promise.all([
      prisma.document.count({
        where: { tenantId, isActive: true, parentId: null }
      }),
      prisma.document.groupBy({
        by: ['type'],
        where: { tenantId, isActive: true, parentId: null },
        _count: { id: true },
      }),
      prisma.document.groupBy({
        by: ['category'],
        where: { tenantId, isActive: true, parentId: null },
        _count: { id: true },
      }),
      prisma.document.count({
        where: {
          tenantId,
          isActive: true,
          parentId: null,
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        }
      }),
      prisma.document.aggregate({
        where: { tenantId, isActive: true },
        _sum: { fileSize: true },
      }),
    ]);

    res.json({
      totalDocuments,
      byType: byType.map(t => ({ type: t.type, count: t._count.id })),
      byCategory: byCategory.map(c => ({ category: c.category, count: c._count.id })),
      recentUploads,
      totalSizeBytes: totalSize._sum.fileSize || 0,
      totalSizeMB: Math.round((totalSize._sum.fileSize || 0) / (1024 * 1024) * 100) / 100,
    });
  } catch (error) {
    console.error('Error getting document stats:', error);
    res.status(500).json({ error: 'Failed to get document stats' });
  }
};

// ==================== EMPLOYEE DOCUMENTS ====================

/**
 * List employee documents
 */
export const listEmployeeDocuments = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const {
      userId,
      documentType,
      isVerified,
      expiringBefore,
      page = 1,
      limit = 20,
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build where clause
    const where = {
      tenantId,
      isActive: true,
    };

    // Non-admins can only see their own documents
    if (req.user.type !== 'tenant_admin' && req.user.role?.code !== 'ADMIN' && req.user.role?.code !== 'HR') {
      where.userId = req.user.id;
    } else if (userId) {
      where.userId = parseInt(userId);
    }

    if (documentType) {
      where.documentType = documentType;
    }

    if (isVerified !== undefined) {
      where.isVerified = isVerified === 'true';
    }

    if (expiringBefore) {
      where.expiryDate = {
        lte: new Date(expiringBefore),
        not: null,
      };
    }

    const [documents, total] = await Promise.all([
      prisma.employeeDocument.findMany({
        where,
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true, employeeCode: true }
          },
          verifier: {
            select: { id: true, firstName: true, lastName: true, email: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.employeeDocument.count({ where }),
    ]);

    res.json({
      documents,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (error) {
    console.error('Error listing employee documents:', error);
    res.status(500).json({ error: 'Failed to list employee documents' });
  }
};

/**
 * Get single employee document
 */
export const getEmployeeDocument = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const { id } = req.params;

    const document = await prisma.employeeDocument.findFirst({
      where: {
        id: parseInt(id),
        tenantId,
        isActive: true,
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true, employeeCode: true }
        },
        verifier: {
          select: { id: true, firstName: true, lastName: true, email: true }
        }
      },
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Check access - non-admins can only see their own documents
    if (document.userId !== req.user.id &&
        req.user.type !== 'tenant_admin' &&
        req.user.role?.code !== 'ADMIN' &&
        req.user.role?.code !== 'HR') {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(document);
  } catch (error) {
    console.error('Error getting employee document:', error);
    res.status(500).json({ error: 'Failed to get employee document' });
  }
};

/**
 * Create employee document
 */
export const createEmployeeDocument = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const {
      userId,
      documentType,
      name,
      description,
      fileUrl,
      fileName,
      fileSize,
      mimeType,
      expiryDate,
      issuedDate,
      issuer,
      documentNo,
    } = req.body;

    // Validate required fields
    if (!documentType || !name || !fileUrl || !fileName || !fileSize || !mimeType) {
      return res.status(400).json({
        error: 'Missing required fields: documentType, name, fileUrl, fileName, fileSize, mimeType'
      });
    }

    // Determine user ID - admins can upload for any user
    let targetUserId = req.user.id;
    if (userId && (req.user.type === 'tenant_admin' || req.user.role?.code === 'ADMIN' || req.user.role?.code === 'HR')) {
      targetUserId = parseInt(userId);
    }

    const document = await prisma.employeeDocument.create({
      data: {
        tenantId,
        userId: targetUserId,
        documentType,
        name,
        description,
        fileUrl,
        fileName,
        fileSize: parseInt(fileSize),
        mimeType,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        issuedDate: issuedDate ? new Date(issuedDate) : null,
        issuer,
        documentNo,
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true, employeeCode: true }
        }
      }
    });

    // Audit log
    await createAuditLog({
      tenantId,
      userId: req.user.id,
      action: 'CREATE',
      entity: 'EmployeeDocument',
      entityId: document.id,
      newValues: { documentType, name, userId: targetUserId },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.status(201).json(document);
  } catch (error) {
    console.error('Error creating employee document:', error);
    res.status(500).json({ error: 'Failed to create employee document' });
  }
};

/**
 * Update employee document
 */
export const updateEmployeeDocument = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const { id } = req.params;
    const { name, description, expiryDate, issuedDate, issuer, documentNo } = req.body;

    const existing = await prisma.employeeDocument.findFirst({
      where: { id: parseInt(id), tenantId, isActive: true },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Check access
    if (existing.userId !== req.user.id &&
        req.user.type !== 'tenant_admin' &&
        req.user.role?.code !== 'ADMIN' &&
        req.user.role?.code !== 'HR') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (expiryDate !== undefined) updateData.expiryDate = expiryDate ? new Date(expiryDate) : null;
    if (issuedDate !== undefined) updateData.issuedDate = issuedDate ? new Date(issuedDate) : null;
    if (issuer !== undefined) updateData.issuer = issuer;
    if (documentNo !== undefined) updateData.documentNo = documentNo;

    const document = await prisma.employeeDocument.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true, employeeCode: true }
        },
        verifier: {
          select: { id: true, firstName: true, lastName: true, email: true }
        }
      }
    });

    // Audit log
    await createAuditLog({
      tenantId,
      userId: req.user.id,
      action: 'UPDATE',
      entity: 'EmployeeDocument',
      entityId: document.id,
      oldValues: { name: existing.name },
      newValues: updateData,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json(document);
  } catch (error) {
    console.error('Error updating employee document:', error);
    res.status(500).json({ error: 'Failed to update employee document' });
  }
};

/**
 * Delete employee document (soft delete)
 */
export const deleteEmployeeDocument = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const { id } = req.params;

    const existing = await prisma.employeeDocument.findFirst({
      where: { id: parseInt(id), tenantId, isActive: true },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Check access
    if (existing.userId !== req.user.id &&
        req.user.type !== 'tenant_admin' &&
        req.user.role?.code !== 'ADMIN' &&
        req.user.role?.code !== 'HR') {
      return res.status(403).json({ error: 'Access denied' });
    }

    await prisma.employeeDocument.update({
      where: { id: parseInt(id) },
      data: { isActive: false }
    });

    // Audit log
    await createAuditLog({
      tenantId,
      userId: req.user.id,
      action: 'DELETE',
      entity: 'EmployeeDocument',
      entityId: parseInt(id),
      oldValues: { name: existing.name },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Error deleting employee document:', error);
    res.status(500).json({ error: 'Failed to delete employee document' });
  }
};

/**
 * Verify employee document (admin/HR only)
 */
export const verifyEmployeeDocument = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const userId = req.user.id;
    const { id } = req.params;
    const { isVerified } = req.body;

    const existing = await prisma.employeeDocument.findFirst({
      where: { id: parseInt(id), tenantId, isActive: true },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const document = await prisma.employeeDocument.update({
      where: { id: parseInt(id) },
      data: {
        isVerified: Boolean(isVerified),
        verifiedBy: isVerified ? userId : null,
        verifiedAt: isVerified ? new Date() : null,
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true, employeeCode: true }
        },
        verifier: {
          select: { id: true, firstName: true, lastName: true, email: true }
        }
      }
    });

    // Audit log
    await createAuditLog({
      tenantId,
      userId,
      action: 'UPDATE',
      entity: 'EmployeeDocument',
      entityId: document.id,
      oldValues: { isVerified: existing.isVerified },
      newValues: { isVerified: document.isVerified },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json(document);
  } catch (error) {
    console.error('Error verifying employee document:', error);
    res.status(500).json({ error: 'Failed to verify employee document' });
  }
};

/**
 * Get expiring documents
 */
export const getExpiringDocuments = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const { days = 30 } = req.query;

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + parseInt(days));

    const documents = await prisma.employeeDocument.findMany({
      where: {
        tenantId,
        isActive: true,
        expiryDate: {
          lte: expiryDate,
          gte: new Date(),
        }
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true, employeeCode: true }
        }
      },
      orderBy: { expiryDate: 'asc' },
    });

    res.json(documents);
  } catch (error) {
    console.error('Error getting expiring documents:', error);
    res.status(500).json({ error: 'Failed to get expiring documents' });
  }
};

/**
 * Get my documents (employee's own)
 */
export const getMyDocuments = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const userId = req.user.id;

    const documents = await prisma.employeeDocument.findMany({
      where: {
        tenantId,
        userId,
        isActive: true,
      },
      include: {
        verifier: {
          select: { id: true, firstName: true, lastName: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' },
    });

    // Group by document type
    const grouped = documents.reduce((acc, doc) => {
      if (!acc[doc.documentType]) {
        acc[doc.documentType] = [];
      }
      acc[doc.documentType].push(doc);
      return acc;
    }, {});

    res.json({
      documents,
      grouped,
      total: documents.length,
    });
  } catch (error) {
    console.error('Error getting my documents:', error);
    res.status(500).json({ error: 'Failed to get my documents' });
  }
};

/**
 * Get employee document statistics
 */
export const getEmployeeDocumentStats = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;

    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const [
      totalDocuments,
      verifiedCount,
      unverifiedCount,
      expiringCount,
      byType,
    ] = await Promise.all([
      prisma.employeeDocument.count({
        where: { tenantId, isActive: true }
      }),
      prisma.employeeDocument.count({
        where: { tenantId, isActive: true, isVerified: true }
      }),
      prisma.employeeDocument.count({
        where: { tenantId, isActive: true, isVerified: false }
      }),
      prisma.employeeDocument.count({
        where: {
          tenantId,
          isActive: true,
          expiryDate: {
            lte: thirtyDaysFromNow,
            gte: new Date(),
          }
        }
      }),
      prisma.employeeDocument.groupBy({
        by: ['documentType'],
        where: { tenantId, isActive: true },
        _count: { id: true },
      }),
    ]);

    res.json({
      totalDocuments,
      verifiedCount,
      unverifiedCount,
      expiringCount,
      byType: byType.map(t => ({ type: t.documentType, count: t._count.id })),
    });
  } catch (error) {
    console.error('Error getting employee document stats:', error);
    res.status(500).json({ error: 'Failed to get employee document stats' });
  }
};
