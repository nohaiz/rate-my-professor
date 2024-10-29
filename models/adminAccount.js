const mongoose = require('mongoose');

const adminAccountSchema = mongoose.Schema({

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
}, { timestamps: true, })

const AdminAccount = mongoose.model('AdminAccount', adminAccountSchema);

module.exports = AdminAccount;