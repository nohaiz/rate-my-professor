const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StudentAccount',
    required: true
  },
  text: {
    type: String,
    required: true,
    trim: true,
  },
  rating: {
    type: Number,
    min: 0,
    max: 5,
    required: true
  },
});

const professorAccountSchema = new mongoose.Schema({
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
  bio: {
    type: String,
    trim: true,
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Department",
  },
  averageRating: {
    type: Number,
    min: 0,
    max: 5,
    default: 0,
  },
  reviews: {
    type: [reviewSchema],
    default: [],
  },
});

const ProfessorAccount = mongoose.model('ProfessorAccount', professorAccountSchema);

module.exports = ProfessorAccount;
