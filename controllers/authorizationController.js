// IMPORTED MODULES

const bcrypt = require("bcrypt");

// MODELS

const User = require('../models/user');
const StudentAccount = require('../models/studentAccount');
const ProfessorAccount = require('../models/professorAccount');

// IMPORTED FUNCTION

const { createToken } = require('../utils/createToken')

const signUp = async (req, res, next) => {

  const session = await User.startSession();
  session.startTransaction();

  try {
    const { email, password, confirmPassword, isProfessor, isStudent, firstName, lastName, institution } = req.body

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
    if (isProfessor && isStudent || !isProfessor && !isStudent) {
      return res.status(400).json({ error: 'The user cannot be both a student and a professor.' });
    }

    let studentId;
    let professorId;

    if (isStudent) {
      let studentPayLoad = {
        firstName: firstName,
        lastName: lastName,
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
    let payLoad = {
      email: email,
      hashedPassword: bcrypt.hashSync(password, parseInt(process.env.SALT_ROUNDS)),
      adminAccount: null,
      professorAccount: professorId ? professorId : null,
      studentAccount: studentId,
    }
    await User.create([payLoad], { session });

    let userType = {};

    if (professorId) {
      userType.professorId = professorId;
      userType.role = 'professor';
    }
    if (studentId) {
      userType.studentId = studentId;
      userType.role = 'student';
    }

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

const signIn = async (req, res, next) => {

  try {
    const { email, password } = req.body

    const userInDatabase = await User.findOne({ email: email });

    if (!userInDatabase) {
      return res.status(404).json({ error: 'User not found.' });
    }
    if (!bcrypt.compareSync(password, userInDatabase.hashedPassword)) {
      return res.status(400).json({ error: 'The provided password is incorrect.' });
    }

    let userType = {};
    const studentId = userInDatabase.studentAccount;
    const professorId = userInDatabase.professorAccount;
    const adminId = userInDatabase.adminAccount;

    if (professorId) {
      userType.professorId = professorId;
      userType.role = 'professor';
    }
    if (studentId) {
      userType.studentId = studentId;
      userType.role = 'student';
    }
    if (adminId) {
      userType.adminId = adminId;
      userType.role = 'admin';
    }

    const token = createToken(userType);
    res.status(200).json({ token });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

module.exports = { signUp, signIn }