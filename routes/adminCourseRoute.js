// IMPORTED MODULES

const express = require("express");
const router = express.Router();

// CONTROLLERS

const { createCourse, indexCourse, getCourse, updateCourse, deleteCourse } = require('../controllers/courseController');

// ROUTES

router.post('/', createCourse);

router.get('/', indexCourse);

router.get('/:id', getCourse);

router.put('/:id', updateCourse);

router.delete('/:id', deleteCourse);

module.exports = router;
