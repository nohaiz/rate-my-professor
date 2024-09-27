const mongoose = require('mongoose');

const institutionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  location: {
    type: String,
    required: true,
    trim: true,
  },
  type: {
    type: String,
    enum: ['University', 'College', 'Community College', 'Other'],
    required: true,
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Department",
  },
  faculty: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProfessorAccount',
  }],
});

const Institution = mongoose.model('Institution', institutionSchema);

module.exports = Institution;
