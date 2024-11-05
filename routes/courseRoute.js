// IMPORTED MODULES

const express = require("express");
const router = express.Router();

// CONTROLLERS

const { indexCourse, getCourse } = require('../controllers/courseController');

// ROUTES

router.get('/', indexCourse);

router.get('/:id', getCourse);

module.exports = router;
