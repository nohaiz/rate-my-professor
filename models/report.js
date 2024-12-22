const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  reporterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  professorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProfessorAccount',
    required: true,
  },
  reviewId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  reportReason: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500,
    match: /^[\p{L}\p{N}\p{P}\s]+$/gu,
  },
  category: {
    type: String,
    enum: [
      'inappropriate-review',
      'offensive-language',
      'irrelevant-content',
      'spam',
      'misleading-information',
      'harassment',
      'violates-guidelines'
    ],
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'resolved', 'rejected'],
    default: 'pending',
  },
}, { timestamps: true });

const Report = mongoose.model('Report', reportSchema);

module.exports = Report;
