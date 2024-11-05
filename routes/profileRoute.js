// IMPORTED MODULES

const express = require("express");
const router = express.Router();

// CONTROLLERS

const { getProfile, updateProfile, deleteProfile } = require('../controllers/profileController');

// ROUTES

router.get('/:id', getProfile);

router.put('/:id', updateProfile);

router.delete('/:id', deleteProfile);

module.exports = router;
