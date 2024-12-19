const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StudentAccount',
    required: true
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
  },
  text: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500,
    match: /^[\p{L}\p{N}\p{P}\s]+$/gu,
  },
  comments: [{
    text: {
      type: String,
      trim: true,
      maxlength: 500,
      match: /^[\p{L}\p{N}\p{P}\s]+$/gu,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }
  }],
  rating: {
    type: Number,
    min: 0,
    max: 5,
    required: true
  },
}, { timestamps: true, });

const professorAccountSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
    trim: true,
    minlength: 3,
    maxlength: 15,
    match: /^[a-zA-Z]+$/,
  },
  lastName: {
    type: String,
    required: true,
    trim: true,
    minlength: 3,
    maxlength: 15,
    match: /^[a-zA-Z]+$/,
  },
  bio: {
    type: String,
    trim: true,
    maxlength: 500,
    match: /^[\w\s.,'’“-]+$/i,
    default: null,
  },
  institution: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Institution",
    default: null,
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
  reviewCount: {
    type: Number,
    default: 0,
  },
}, { timestamps: true, });

const ProfessorAccount = mongoose.model('ProfessorAccount', professorAccountSchema);

module.exports = ProfessorAccount;
