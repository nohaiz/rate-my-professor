const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  professorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProfessorAccount',
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
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
}, { timestamps: true, });

const studentAccountSchema = mongoose.Schema({

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
  institution: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Institution",
    default: null,
  },
  fieldOfStudy: {
    type: String,
    trim: true,
    maxlength: 30,
    match: /^[a-zA-Z\s]+$/,
    default: null,
  },
  GPA: {
    type: Number,
    min: 0.0,
    max: 4.0,
    default: null,
  },
  reviews: {
    type: [reviewSchema],
    default: [],
  },
  reviewCount: {
    type: Number,
    default: 0,
  },
}, { timestamps: true, })

const StudentAccount = mongoose.model('StudentAccount', studentAccountSchema);

module.exports = StudentAccount;