// IMPORTED MODULES

const bcrypt = require("bcrypt");

// MODELS

const User = require('../models/user');
const StudentAccount = require('../models/studentAccount');
const ProfessorAccount = require('../models/professorAccount');
const AdminAccount = require('../models/adminAccount')

// IMPORTED FUNCTION

const { createToken } = require('../utils/createToken');
const { signUp } = require('../controllers/authorizationController')

const createUser = async (req, res, next) => {

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

}
const getUser = async (req, res, next) => {

}
const updateUser = async (req, res, next) => {

}
const deleteUser = async (req, res, next) => {

}



module.exports = { createUser, indexUser, getUser, updateUser, deleteUser }