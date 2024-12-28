const mongoose = require('mongoose');

const auditTrailSchema = new mongoose.Schema({
  collectionName: { type: String, required: true },
  operationType: { type: String, required: true },
  documentKey: mongoose.Schema.Types.Mixed,
  fullDocument: mongoose.Schema.Types.Mixed,
  updateDescription: mongoose.Schema.Types.Mixed,
  timestamp: { type: Date, default: Date.now },
  uniqueId: { type: String, unique: true }
});

const AuditTrail = mongoose.model('AuditTrail', auditTrailSchema);

module.exports = AuditTrail;
