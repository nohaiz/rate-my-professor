// IMPORTED MODULES

const express = require("express");
const router = express.Router();
const verifyToken = require('../middlewares/verify-token')


// CONTROLLERS

const { indexProfessor, getProfessor, createProfessorReview, updateProfessorReview, deleteProfessorReview } = require('../controllers/professorController');

// ROUTES

router.get('/', indexProfessor);

router.get('/:id', getProfessor);

router.post('/:id/review', verifyToken, createProfessorReview)

router.put('/:id/review/:reviewId', verifyToken, updateProfessorReview)

router.delete('/:id/review/:reviewId', deleteProfessorReview)


module.exports = router;
