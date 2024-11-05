// IMPORTED MODULES

const express = require("express");
const router = express.Router();

// CONTROLLERS

const { indexInstitute, getInstitute } = require('../controllers/instituteController');

// ROUTES

router.get('/', indexInstitute);

router.get('/:id', getInstitute);

module.exports = router;
