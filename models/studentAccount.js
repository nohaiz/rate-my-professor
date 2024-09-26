const mongoose = require('mongoose');

const studentAccountSchema = mongoose.Schema({

  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  institution: {
    type: String,
    required: true,
    trim: true
  },
  GPA: {
    type: Number,
    required: true,
    min: 0.0,
    max: 4.0,
    validate: {
      validator: function (v) {
        return v >= 0.0 && v <= 4.0;
      },
      message: 'GPA must be between 0.0 and 4.0.'
    }
  }
})

const StudentAccount = mongoose.model('StudentAccount', studentAccountSchema);

module.exports = StudentAccount;