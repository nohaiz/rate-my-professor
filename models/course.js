const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  code: {
    type: String,
    required: true,
    unique: true,
    match: /^[^\s]+$/,
  },
  credits: {
    type: Number,
    min: 1,
    max: 5,
  },
  professors: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProfessorAccount',
  }],
}, { timestamps: true });

const Course = mongoose.model('Course', courseSchema);

module.exports = Course;
