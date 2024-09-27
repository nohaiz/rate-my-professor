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
  },
  credits: {
    type: Number,
    min: 1,
    max: 5,
  }
});

const Course = mongoose.model('Course', courseSchema);

module.exports = Course;
