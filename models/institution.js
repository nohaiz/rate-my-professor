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
  departments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Department",
    default: [],
  }],
}, { timestamps: true, });

const Institution = mongoose.model('Institution', institutionSchema);

module.exports = Institution;
