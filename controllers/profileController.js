// IMPORTED MODULES

const bcrypt = require('bcrypt');
const mongoose = require('mongoose');

// MODELS

const User = require('../models/user');
const AdminAccount = require('../models/adminAccount');
const ProfessorAccount = require("../models/professorAccount");
const StudentAccount = require("../models/studentAccount");

const getProfile = async (req, res, next) => {

  try {

    const id = req.params.id;
    if (req.user.type.Id !== id) {
      return res.status(400).json({ error: 'Opps something went wrong' });
    }
    const user = await User.findById(id)
      .populate('adminAccount')
      .populate('professorAccount')
      .populate('studentAccount');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.status(200).json(user);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

const updateProfile = async (req, res, next) => {

  try {

    const session = await mongoose.startSession();
    session.startTransaction();

    const { id } = req.params;
    const { password, confirmPassword } = req.body;

    if (req.user.type.Id !== id) {
      return res.status(400).json({ error: 'Oops something went wrong' });
    }

    const userInDatabase = await User.findById(id).session(session);
    if (!userInDatabase) {
      return res.status(404).json({ error: "User could not be found." });
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long and include uppercase, lowercase, number, and special character' });
    }

    if (password) {
      if (password !== confirmPassword) {
        return res.status(400).json({ error: 'Passwords do not match' });
      }
      req.body.hashedPassword = bcrypt.hashSync(password, parseInt(process.env.SALT_ROUNDS));
    }

    const updatedUserData = await User.findByIdAndUpdate(userInDatabase._id, req.body, {
      new: true,
      runValidators: true,
      session,
    });

    if (userInDatabase.adminAccount) {
      await AdminAccount.findByIdAndUpdate(userInDatabase.adminAccount, req.body, { new: true, runValidators: true, session });
    }
    if (userInDatabase.studentAccount) {
      await StudentAccount.findByIdAndUpdate(userInDatabase.studentAccount, req.body, { new: true, runValidators: true, session });
    }
    if (userInDatabase.professorAccount) {
      await ProfessorAccount.findByIdAndUpdate(userInDatabase.professorAccount, req.body, { new: true, runValidators: true, session });
    }

    await session.commitTransaction();
    session.endSession();

    const updatedUserWithAccounts = await User.findById(updatedUserData._id)
      .populate('adminAccount')
      .populate('professorAccount')
      .populate('studentAccount');

    return res.status(200).json({ userData: updatedUserWithAccounts });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    return res.status(500).json({ message: error.message });
  }
};

const deleteProfile = async (req, res, next) => {

  try {

    const { id } = req.params;

    if (req.user.type.Id !== id) {
      return res.status(400).json({ error: 'Oops something went wrong' });
    }
    const userInDatabase = await User.findById(id);
    if (!userInDatabase) {
      return res.status(404).json({ error: "User could not be found" })
    }

    if (userInDatabase.adminAccount) {
      await AdminAccount.findByIdAndDelete(userInDatabase.adminAccount);
    }
    if (userInDatabase.professorAccount) {
      await ProfessorAccount.findByIdAndDelete(userInDatabase.professorAccount);
    }
    if (userInDatabase.studentAccount) {
      await StudentAccount.findByIdAndDelete(userInDatabase.studentAccount);
    }
    await User.findByIdAndDelete(id)
    return res.status(200).json({ message: "User successfully deleted." });

  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

module.exports = { getProfile, updateProfile, deleteProfile }