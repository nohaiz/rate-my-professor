const mongoose = require('mongoose');

const userSchema = mongoose.Schema({

  email: {
    type: String,
    trim: true,
    required: true,
    match: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  },
  hashedPassword: {
    type: String,
    required: true
  },
  adminAccount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "AdminAccount",
    default: null,
    validate: {
      validator: function (v) {
        return v == null || mongoose.Types.ObjectId.isValid(v);
      },
      message: "Invalid Admin ObjectId",
    },
  },
  professorAccount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ProfessorAccount",
    default: null,
    validate: {
      validator: function (v) {
        return v == null || mongoose.Types.ObjectId.isValid(v);
      },
      message: "Invalid Professor ObjectId",
    },
  },
  studentAccount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "StudentAccount",
    default: null,
    validate: {
      validator: function (v) {
        return v == null || mongoose.Types.ObjectId.isValid(v);
      },
      message: "Invalid Student ObjectId",
    },
  },
  '2fa': {
    secret: { type: String, default: false },
    enabled: { type: Boolean, default: false }
  },
  bookMarkedProfessor: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "ProfessorAccount",
    default: null,
  }],
},
  { timestamps: true, }
)

const User = mongoose.model('User', userSchema);

module.exports = User;