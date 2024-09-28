// IMPORTED MODULES

const express = require("express");
const router = express.Router();

// CONTROLLERS

const { createDepartment, indexDepartment, getDepartment, updateDepartment, deleteDepartment } = require('../controllers/departmentController');

// ROUTES

router.post('/', createDepartment);

router.get('/', indexDepartment);

router.get('/:id', getDepartment);

router.put('/:id', updateDepartment);

router.delete('/:id', deleteDepartment);

module.exports = router;
