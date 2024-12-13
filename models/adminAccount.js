const mongoose = require('mongoose');

const adminAccountSchema = mongoose.Schema({

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
}, { timestamps: true, })

const AdminAccount = mongoose.model('AdminAccount', adminAccountSchema);

module.exports = AdminAccount;