// IMPORTED MODULES

const bcrypt = require("bcrypt");
const speakeasy = require('speakeasy');


// MODELS

const User = require('../models/user');
const AdminAccount = require('../models/adminAccount');
const ProfessorAccount = require("../models/professorAccount");
const StudentAccount = require("../models/studentAccount");
const Course = require('../models/course');

// IMPORTED FUNCTION

const createUser = async (req, res, next) => {
  let session;

  try {
    if (req.user.type.role !== 'admin') {
      return res.status(400).json({ error: 'Opps something went wrong' });
    }
    session = await User.startSession();
    session.startTransaction();

    const { email, password, confirmPassword, isAdmin, isProfessor, isStudent, firstName, lastName, institution, fieldOfStudy, GPA } = req.body

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
    let studentId;
    let professorId;

    if (isStudent) {
      let studentPayLoad = {
        firstName: firstName,
        lastName: lastName,
        institution: institution,
        fieldOfStudy: fieldOfStudy,
        GPA: GPA
      }
      const student = await StudentAccount.create([studentPayLoad], { session });
      studentId = student[0]._id;
    }
    if (isProfessor) {
      let professorPayLoad = {
        firstName: firstName,
        lastName: lastName,
        institution: institution,
      }
      const professor = await ProfessorAccount.create([professorPayLoad], { session });
      professorId = professor[0]._id;
    }

    if (isAdmin) {
      let adminPayLoad = {
        firstName: firstName,
        lastName: lastName,
      }
      const admin = await AdminAccount.create([adminPayLoad], { session });
      adminId = admin[0]._id;
    }

    let payLoad = {
      email: email,
      hashedPassword: bcrypt.hashSync(password, parseInt(process.env.SALT_ROUNDS)),
      adminAccount: adminId ? adminId : null,
      professorAccount: professorId ? professorId : null,
      studentAccount: studentId ? studentId : null,
    }
    const secret = speakeasy.generateSecret({ length: 20 });

    const user = await User.create([payLoad], { session });
    const createdUser = user[0];

    await User.updateOne(
      { _id: createdUser._id },
      { $set: { '2fa.secret': secret.base32, '2fa.enabled': false } },
      { session }
    );
    await session.commitTransaction();
    res.status(201).json({ success: "User has been successfully created." });

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
    const { page = 1, limit } = req.query;
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
        u = await u.populate({
          path: 'professorAccount',
          populate: { path: 'institution' }
        });
      }
      if (u.studentAccount) {
        u = await u.populate({
          path: 'studentAccount',
          populate: { path: 'institution' }
        });
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

    const updateData = {};

    if (req.body.email) {
      updateData.email = req.body.email;
    } else {
      return res.status(400).json({ error: "Email is required for update." });
    }
    if (req.body.password && req.body.password.trim()) {
      updateData.hashedPassword = bcrypt.hashSync(req.body.password, parseInt(process.env.SALT_ROUNDS));
    } else {
      updateData.hashedPassword = userInDatabase.hashedPassword;
    }

    await User.findByIdAndUpdate(id, updateData, { new: true });
    if (userInDatabase.adminAccount) {
      const adminProfile = await AdminAccount.findByIdAndUpdate(userInDatabase.adminAccount, req.body, { new: true, runValidators: true });
      return res.status(200).json({ adminProfile, success: 200 })
    }
    if (userInDatabase.studentAccount) {
      const studentProfile = await StudentAccount.findByIdAndUpdate(userInDatabase.studentAccount, req.body, { new: true, runValidators: true });
      return res.status(200).json({ studentProfile, success: 200 })
    }
    if (userInDatabase.professorAccount) {
      const professorProfile = await ProfessorAccount.findByIdAndUpdate(userInDatabase.professorAccount, req.body, { new: true, runValidators: true });
      return res.status(200).json({ professorProfile, success: 200 })
    }
    return res.status(200).json({ success: 200, message: 'User updated successfully.' });


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
      await Course.updateMany(
        { professors: userInDatabase.professorAccount },
        { $pull: { professors: userInDatabase.professorAccount } }
      );
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