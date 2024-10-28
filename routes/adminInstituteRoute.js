// IMPORTED MODULES

const express = require("express");
const router = express.Router();

// CONTROLLERS

const { createInstitute, indexInstitute, getInstitute, updateInstitute, deleteInstitute } = require('../controllers/instituteController');

// ROUTES

router.post('/', createInstitute);

router.get('/', indexInstitute);

router.get('/:id', getInstitute);

router.put('/:id', updateInstitute);

router.delete('/:id', deleteInstitute);

module.exports = router;
