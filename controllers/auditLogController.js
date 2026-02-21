const AuditLog = require('../models/auditLogModel');
const catchAsync = require('../utils/catchAsync');
const APIFeatures = require('../utils/apiFeatures');
const AppError = require('../utils/appError');

// @desc    Get all audit logs
// @route   GET /api/v1/audit-logs
// @access  Private (admin only)
exports.getAllAuditLogs = catchAsync(async (req, res, next) => {
  // Only allow admins to view audit logs
  if (req.user.role !== 'admin') {
    return next(
      new AppError('You do not have permission to view audit logs', 403),
    );
  }

  // Build query
  let query = AuditLog.find();

  // Filter by user if provided
  if (req.query.userId) {
    query = query.find({ user: req.query.userId });
  }

  // Filter by action if provided
  if (req.query.action) {
    query = query.find({ action: req.query.action });
  }

  // Filter by collection if provided
  if (req.query.collection) {
    query = query.find({ collection: req.query.collection });
  }

  // Filter by document if provided
  if (req.query.documentId) {
    query = query.find({ documentId: req.query.documentId });
  }

  // Date range filter
  if (req.query.startDate || req.query.endDate) {
    const dateFilter = {};
    if (req.query.startDate) {
      dateFilter.$gte = new Date(req.query.startDate);
    }
    if (req.query.endDate) {
      dateFilter.$lte = new Date(req.query.endDate);
    }
    query = query.find({ createdAt: dateFilter });
  }

  // Apply features
  const features = new APIFeatures(query, req.query)
    .sort()
    .limitedFields()
    .paginate();

  const logs = await features.query
    .populate('user', 'userName email')
    .sort('-createdAt');

  // Get total count
  const totalCount = await AuditLog.countDocuments(query._conditions);

  res.status(200).json({
    status: 'success',
    results: totalCount,
    data: {
      data: logs,
    },
  });
});

// @desc    Get audit log by ID
// @route   GET /api/v1/audit-logs/:id
// @access  Private (admin only)
exports.getAuditLog = catchAsync(async (req, res, next) => {
  if (req.user.role !== 'admin') {
    return next(
      new AppError('You do not have permission to view audit logs', 403),
    );
  }

  const log = await AuditLog.findById(req.params.id).populate(
    'user',
    'userName email',
  );

  if (!log) {
    return next(new AppError('No audit log found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      data: log,
    },
  });
});

// @desc    Get audit logs for a specific document
// @route   GET /api/v1/audit-logs/document/:collection/:documentId
// @access  Private (admin only)
exports.getDocumentAuditLogs = catchAsync(async (req, res, next) => {
  if (req.user.role !== 'admin') {
    return next(
      new AppError('You do not have permission to view audit logs', 403),
    );
  }

  const { collection, documentId } = req.params;

  const logs = await AuditLog.find({
    collection,
    documentId,
  })
    .populate('user', 'userName email')
    .sort('-createdAt');

  res.status(200).json({
    status: 'success',
    results: logs.length,
    data: {
      data: logs,
    },
  });
});

// @desc    Get audit log summary
// @route   GET /api/v1/audit-logs/summary
// @access  Private (admin only)
exports.getAuditLogSummary = catchAsync(async (req, res, next) => {
  if (req.user.role !== 'admin') {
    return next(
      new AppError('You do not have permission to view audit logs', 403),
    );
  }

  const { days = 7 } = req.query;

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Get counts by action
  const actionCounts = await AuditLog.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: '$action',
        count: { $sum: 1 },
      },
    },
  ]);

  // Get counts by collection
  const collectionCounts = await AuditLog.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: '$collection',
        count: { $sum: 1 },
      },
    },
  ]);

  // Get counts by user
  const userCounts = await AuditLog.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: '$user',
        count: { $sum: 1 },
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'userInfo',
      },
    },
    {
      $project: {
        userName: { $arrayElemAt: ['$userInfo.userName', 0] },
        count: 1,
      },
    },
    {
      $sort: { count: -1 },
    },
    {
      $limit: 5,
    },
  ]);

  // Get recent activity timeline
  const recentActivity = await AuditLog.find({
    createdAt: { $gte: startDate },
  })
    .populate('user', 'userName')
    .sort('-createdAt')
    .limit(20);

  res.status(200).json({
    status: 'success',
    data: {
      period: `${days} days`,
      summary: {
        totalLogs: await AuditLog.countDocuments({
          createdAt: { $gte: startDate },
        }),
        byAction: actionCounts,
        byCollection: collectionCounts,
        topUsers: userCounts,
      },
      recentActivity: recentActivity.map((log) => ({
        id: log._id,
        user: log.user?.userName || 'System',
        action: log.action,
        collection: log.collection,
        description: log.description,
        timestamp: log.createdAt,
      })),
    },
  });
});

// @desc    Clean old audit logs (admin only)
// @route   DELETE /api/v1/audit-logs/clean
// @access  Private (admin only)
exports.cleanAuditLogs = catchAsync(async (req, res, next) => {
  if (req.user.role !== 'admin') {
    return next(
      new AppError('You do not have permission to clean audit logs', 403),
    );
  }

  const { olderThan = 90 } = req.query; // days

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThan);

  const result = await AuditLog.deleteMany({
    createdAt: { $lt: cutoffDate },
  });

  res.status(200).json({
    status: 'success',
    data: {
      message: `Deleted ${result.deletedCount} audit logs older than ${olderThan} days`,
    },
  });
});
