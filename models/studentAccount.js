const mongoose = require('mongoose');

const studentAccountSchema = mongoose.Schema({

  firstName: {
    type: String,
    required: true,
    trim: true,
    match: /^[^\s]+$/,
  },
  lastName: {
    type: String,
    required: true,
    trim: true,
    match: /^[^\s]+$/,
  },
  institution: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Institution",
  },
  fieldOfStudy: [{
    type: String,
    trim: true,
  }],
  GPA: {
    type: Number,
    min: 0.0,
    max: 4.0,
  }
})

const StudentAccount = mongoose.model('StudentAccount', studentAccountSchema);

module.exports = StudentAccount;