const express = require('express');
const router = express.Router();

const { getAllAuditTrails, getAuditTrailsByCollection, deleteAuditTrail } = require('../controllers/auditTrailController')

router.get('/', getAllAuditTrails);

router.get('/:collectionName', getAuditTrailsByCollection);

router.delete('/:id', deleteAuditTrail);


module.exports = router;
