const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    userName: String,

    action: {
      type: String,
      enum: ['CREATE', 'UPDATE', 'DELETE', 'VIEW'],
      required: true,
    },

    collection: {
      type: String,
      required: true,
    },
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    changes: {
      before: mongoose.Schema.Types.Mixed,
      after: mongoose.Schema.Types.Mixed,
    },

    ipAddress: String,
    userAgent: String,

    description: String,
  },
  {
    timestamps: true,
  }
);

// Indexes for fast search
auditLogSchema.index({ collection: 1, documentId: 1 });
auditLogSchema.index({ user: 1, createdAt: -1 });
auditLogSchema.index({ createdAt: -1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);
module.exports = AuditLog;
