// IMPORTED MODULES

const express = require("express");
const router = express.Router();

// CONTROLLERS

const { createUser, indexUser, getUser, updateUser, deleteUser } = require('../controllers/userController');
const { getProfessorReviews } = require('../controllers/professorController')

// ROUTES

router.post('/', createUser);

router.get('/', indexUser);

router.get('/:id', getUser);

router.put('/:id', updateUser);

router.delete('/:id', deleteUser);

router.get('/:id/reviews', getProfessorReviews);

router.put('/:id/reviews/:reviewId');

router.delete('/:id/reviews/:reviewId');

router.put('/:id/reviews/:reviewId/comments/:commentId');

router.delete('/:id/reviews/:reviewId/comments/:commentId');


module.exports = router;
