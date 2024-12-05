// IMPORTED MODULES

const express = require("express");
const router = express.Router();

// CONTROLLERS

const { signUp, signIn, verifyOtp } = require('../controllers/authorizationController')

// ROUTES

router.post('/sign-up', signUp)

router.post('/sign-in', signIn)

router.post('/verify-otp', verifyOtp); 


module.exports = router;
