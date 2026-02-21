const express = require('express');
const auditLogController = require('../controllers/auditLogController');
const authController = require('../controllers/authController');

const router = express.Router();

// Protect all routes
router.use(authController.protect);

// Admin only routes (check in controller)
router.route('/').get(auditLogController.getAllAuditLogs);

router.route('/summary').get(auditLogController.getAuditLogSummary);

router
  .route('/document/:collection/:documentId')
  .get(auditLogController.getDocumentAuditLogs);

router.route('/clean').delete(auditLogController.cleanAuditLogs);

router.route('/:id').get(auditLogController.getAuditLog);

module.exports = router;
