const mongoose = require('mongoose');

const professorAccountSchema = mongoose.Schema({

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
  bio: {
    type: String,
    trim: true,
  },
  institution: {
    type: String,
    required: true,
    trim: true
  },
  department: {
    type: String,
    trim: true,
  },
  courses: [{
    type: String,
    trim: true,
  }],

})

const ProfessorAccount = mongoose.model('ProfessorAccount', professorAccountSchema);

module.exports = ProfessorAccount;