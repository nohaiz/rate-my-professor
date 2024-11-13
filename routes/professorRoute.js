// IMPORTED MODULES

const express = require("express");
const router = express.Router();

// CONTROLLERS

const { indexProfessor, getProfessor, createProfessorReview, updateProfessorReview, deleteProfessorReview } = require('../controllers/professorController');

// ROUTES

router.get('/', indexProfessor);

router.get('/:id', getProfessor);

router.post('/:id/review', createProfessorReview)

router.put('/:id/review/:reviewId', updateProfessorReview)

router.delete('/:id/review/:reviewId', deleteProfessorReview)


module.exports = router;
