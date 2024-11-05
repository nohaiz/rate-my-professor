// IMPORTED MODULES

const express = require("express");
const router = express.Router();

// CONTROLLERS

const { indexDepartment, getDepartment } = require('../controllers/departmentController');

// ROUTES

router.get('/', indexDepartment);

router.get('/:id', getDepartment);

module.exports = router;
