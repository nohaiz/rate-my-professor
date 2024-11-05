// IMPORTED MODULES

const bcrypt = require("bcrypt");

// MODELS

const User = require('../models/user');
const AdminAccount = require('../models/adminAccount');
const ProfessorAccount = require("../models/professorAccount");
const StudentAccount = require("../models/studentAccount");

// IMPORTED FUNCTION

const { signUp } = require('../controllers/authorizationController');

const createUser = async (req, res, next) => {

  try {
    if (req.user.type.role !== 'admin') {
      return res.status(400).json({ error: 'Opps something went wrong' });
    }
    const session = await User.startSession();
    session.startTransaction();

    const { email, password, confirmPassword, isAdmin, firstName, lastName } = req.body

    if (!isAdmin) {
      return signUp(req, res, next)
    }

    const userInDatabase = await User.findOne({ email: email });
    if (userInDatabase) {
      return res.status(400).json({ error: 'Username already taken' })
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json('Password must be at least 8 characters long and include uppercase, lowercase, number, and special character');
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Confirm password and password needs to match' });
    }

    let adminId;
    let adminPayLoad = {
      firstName: firstName,
      lastName: lastName,
    }
    const admin = await AdminAccount.create([adminPayLoad], { session });
    adminId = admin[0]._id;

    let payLoad = {
      email: email,
      hashedPassword: bcrypt.hashSync(password, parseInt(process.env.SALT_ROUNDS)),
      adminAccount: adminId,
      professorAccount: null,
      studentAccount: null,
    }
    await User.create([payLoad], { session });

    await session.commitTransaction();
    res.status(201).json({ message: "User has been successfully created." });

  } catch (error) {
    await session.abortTransaction();
    return res.status(500).json({ message: error.message });
  }
  finally {
    session.endSession();
  }
}
const indexUser = async (req, res, next) => {

  try {
    if (req.user.type.role !== 'admin') {
      return res.status(400).json({ error: 'Opps something went wrong' });
    }
    const { page = 1, limit = 10 } = req.query;
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
    };

    const users = await User.find({})
      .sort({ createdAt: -1 })
      .skip((options.page - 1) * options.limit)
      .limit(options.limit);

    const populatedUsers = await Promise.all(users.map(async (u) => {
      if (u.adminAccount) {
        u = await u.populate('adminAccount');
      }
      if (u.professorAccount) {
        u = await u.populate('professorAccount');
      }
      if (u.studentAccount) {
        u = await u.populate('studentAccount');
      }
      return u;
    }));

    if (populatedUsers.length === 0) {
      return res.status(400).json({ error: 'There are currently no users available.' });
    }
    const totalUsers = await User.countDocuments();
    return res.status(200).json({ users: populatedUsers, totalUsers, currentPage: options.page });

  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

const getUser = async (req, res, next) => {

  try {
    if (req.user.type.role !== 'admin') {
      return res.status(400).json({ error: 'Opps something went wrong' });
    }

    const userId = req.params.id;
    const user = await User.findById(userId)
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

const updateUser = async (req, res, next) => {

  try {
    if (req.user.type.role !== 'admin') {
      return res.status(400).json({ error: 'Opps something went wrong' });
    }
    const { id } = req.params;
    const userInDatabase = await User.findById(id);
    if (!userInDatabase) {
      return res.status(404).json({ error: "User could not be found." });
    }
    if (userInDatabase.adminAccount) {
      const adminProfile = await AdminAccount.findByIdAndUpdate(userInDatabase.adminAccount, req.body, { new: true, runValidators: true });
      return res.status(200).json({ adminProfile })
    }
    if (userInDatabase.studentAccount) {
      const studentProfile = await StudentAccount.findByIdAndUpdate(userInDatabase.studentAccount, req.body, { new: true, runValidators: true });
      return res.status(200).json({ studentProfile })
    }
    if (userInDatabase.professorAccount) {
      const professorProfile = await ProfessorAccount.findByIdAndUpdate(userInDatabase.professorAccount, req.body, { new: true, runValidators: true });
      return res.status(200).json({ professorProfile })
    }
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const deleteUser = async (req, res, next) => {
  try {
    if (req.user.type.role !== 'admin') {
      return res.status(400).json({ error: 'Opps something went wrong' });
    }
    const { id } = req.params
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

module.exports = { createUser, indexUser, getUser, updateUser, deleteUser }