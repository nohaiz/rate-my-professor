// IMPORTED MODULES

const express = require("express");
const router = express.Router();

// CONTROLLERS

const { signUp, signIn } = require('../controllers/authorizationController')

// ROUTES

router.post('/sign-up', signUp)

router.post('/sign-in', signIn)

module.exports = router;
