const AuditTrail = require('../models/auditTrail');

const getAllAuditTrails = async (req, res, next) => {
  try {
    const auditTrails = await AuditTrail.find();
    res.json(auditTrails);
  } catch (err) {
    next(new Error('Error fetching all audit trails: ' + err.message));
  }
};

const getAuditTrailsByCollection = async (req, res, next) => {
  try {
    const { collectionName } = req.params;
    const auditTrails = await AuditTrail.find({ collectionName });
    res.json(auditTrails);
  } catch (err) {
    next(new Error(`Error fetching audit trails for collection ${collectionName}: ` + err.message));
  }
};
const deleteAuditTrail = async (req, res, next) => {
  try {
    const { id } = req.params;
    const auditTrail = await AuditTrail.findByIdAndDelete(id);

    if (!auditTrail) {
      return res.status(404).json({ message: 'Audit trail not found' });
    }

    res.json({ message: 'Audit trail deleted successfully' });
  } catch (err) {
    next(new Error('Error deleting audit trail: ' + err.message));
  }
};

module.exports = { getAllAuditTrails, getAuditTrailsByCollection, deleteAuditTrail };
