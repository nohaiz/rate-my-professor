// IMPORTED MODULES

const bcrypt = require("bcrypt");
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const cron = require('node-cron');


// MODELS

const User = require('../models/user');
const StudentAccount = require('../models/studentAccount');
const ProfessorAccount = require('../models/professorAccount');

// IMPORTED FUNCTION

const { createToken } = require('../utils/createToken')

let tokenCreated
let userType = {};


const signUp = async (req, res, next) => {

  let session;
  try {
    session = await User.startSession();
    session.startTransaction();

    const { email, password, confirmPassword, isProfessor, isStudent, firstName, lastName, institution } = req.body

    const userInDatabase = await User.findOne({ email: email });

    if (userInDatabase) {
      if (userInDatabase['2fa'].enabled === false) {

        const secret = speakeasy.generateSecret({ length: 20 });
        const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

        await User.updateOne(
          { _id: userInDatabase._id },
          { $set: { '2fa.secret': secret.base32 } },
        );
        return res.status(200).json({
          qrCodeUrl,
          email: userInDatabase.email,
          twoFactorEnabled: false,
          twofaRequired: true,
        });
      }
      return res.status(400).json({ error: 'Username already taken' })
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long and include uppercase, lowercase, number, and special character' });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Confirm password and password needs to match' });
    }
    if (isProfessor && isStudent || !isProfessor && !isStudent) {
      return res.status(400).json({ error: 'Please select a role: student or professor.' });
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

    const secret = speakeasy.generateSecret({ length: 20 });
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

    const user = await User.create([payLoad], { session });
    const createdUser = user[0];

    await User.updateOne(
      { _id: createdUser._id },
      { $set: { '2fa.secret': secret.base32, '2fa.enabled': false } },
      { session }
    );

    if (professorId || studentId) {
      userType.Id = createdUser._id;
      userType.role = professorId ? 'professor' : 'student';
    }

    await session.commitTransaction();
    return res.status(201).json({
      qrCodeUrl,
      email: createdUser.email,
      twoFactorEnabled: false,
      twofaRequired: true,
    });
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
    if (userInDatabase['2fa'].enabled === false) {

      const secret = speakeasy.generateSecret({ length: 20 });
      const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

      await User.updateOne(
        { _id: userInDatabase._id },
        { $set: { '2fa.secret': secret.base32 } },
      );
      return res.status(200).json({
        qrCodeUrl,
        email: userInDatabase.email,
        twoFactorEnabled: false,
        twofaRequired: true,
      });
    }

    const studentId = userInDatabase.studentAccount;
    const professorId = userInDatabase.professorAccount;
    const adminId = userInDatabase.adminAccount;

    if (professorId) {
      userType.Id = userInDatabase._id;
      userType.role = 'professor';
    }
    if (studentId) {
      userType.Id = userInDatabase._id;
      userType.role = 'student';
    }
    if (adminId) {
      userType.Id = userInDatabase._id;
      userType.role = 'admin';
    }

    res.status(200).json({ message: 'ok' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

const verifyOtp = async (req, res) => {

  const { email, otp } = req.body;
  try {

    const userInDatabase = await User.findOne({ email: email });

    if (!userInDatabase) {
      return res.status(404).json({ error: 'User not found' });
    }

    const verified = speakeasy.totp.verify({
      secret: userInDatabase['2fa'].secret,
      encoding: 'base32',
      token: otp,
    });

    if (!verified) {
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    tokenCreated = createToken(userType);

    await User.updateOne(
      { _id: userInDatabase._id },
      { $set: { '2fa.enabled': true } }
    );
    return res.status(200).json({ tokenCreated });

  } catch (error) {
    return res.status(500).json({ message: 'An error occurred during OTP verification', error: error.message });
  }
};

cron.schedule('0 0 * * *', async () => {
  try {
    const expirationTime = 24 * 60 * 60 * 1000;
    const now = Date.now();

    const expiredUsers = await User.find({
      '2fa.enabled': false,
      createdAt: { $lt: new Date(now - expirationTime) },
    });

    if (expiredUsers.length > 0) {
      const expiredUserIds = expiredUsers.map(user => user._id);

      await User.deleteMany(
        { _id: { $in: expiredUserIds } }
      );

      await AdminAccount.updateMany(
        { users: { $in: expiredUserIds } },
        { $pull: { users: { $in: expiredUserIds } } }
      );

      await ProfessorAccount.updateMany(
        { users: { $in: expiredUserIds } },
        { $pull: { users: { $in: expiredUserIds } } }
      );

      await StudentAccount.updateMany(
        { users: { $in: expiredUserIds } },
        { $pull: { users: { $in: expiredUserIds } } }
      );
    }

  } catch (error) {
    console.error("Error during cron job execution:", error);
  }
});



module.exports = { signUp, signIn, verifyOtp }