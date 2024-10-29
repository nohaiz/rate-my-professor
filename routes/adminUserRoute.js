// IMPORTED MODULES

const express = require("express");
const router = express.Router();

// CONTROLLERS

const { createUser, indexUser, getUser, updateUser, deleteUser } = require('../controllers/adminUserController');

// ROUTES

router.post('/', createUser);

router.get('/', indexUser);

router.get('/:id', getUser);

router.put('/:id', updateUser);

router.delete('/:id', deleteUser);

module.exports = router;
