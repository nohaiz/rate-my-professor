// IMPORTED MODULES

const bcrypt = require("bcrypt");

// MODELS

const User = require('../models/user');
const AdminAccount = require('../models/adminAccount')

// IMPORTED FUNCTION

const { createToken } = require('../utils/createToken');
const { signUp } = require('../controllers/authorizationController')

const createUser = async (req, res, next) => {

  if (req.user.type.role !== 'admin') {
    return res.status(400).json({ error: 'Opps something went wrong' });
  }
  const session = await User.startSession();
  session.startTransaction();

  try {
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

    let userType = {};

    userType.adminId = adminId;
    userType.role = 'admin';

    const token = createToken(userType);
    await session.commitTransaction();
    res.status(201).json({ token });

  } catch (error) {
    await session.abortTransaction();
    return res.status(500).json({ message: error.message });
  }
  finally {
    session.endSession();
  }
}
const indexUser = async (req, res, next) => {

  if (req.user.type.role !== 'admin') {
    return res.status(400).json({ error: 'Opps something went wrong' });
  }
  try {
    const { page = 1, limit = 10 } = req.query;
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
    };

    const users = await User.find({})
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

  if (req.user.type.role !== 'admin') {
    return res.status(400).json({ error: 'Opps something went wrong' });
  }

  const userId = req.params.id;
  try {
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
  if (req.user.type.role !== 'admin') {
    return res.status(400).json({ error: 'Opps something went wrong' });
  }

}
const deleteUser = async (req, res, next) => {
  if (req.user.type.role !== 'admin') {
    return res.status(400).json({ error: 'Opps something went wrong' });
  }
}



module.exports = { createUser, indexUser, getUser, updateUser, deleteUser }