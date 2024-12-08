const mongoose = require('mongoose');

mongoose.connect(process.env.DATABASE_URL);

mongoose.connection.on('connected', () => {
  console.log(`Connected to MongoDB ${mongoose.connection.name}.`);
});

// mongoose.connection.on('error', (err) => {
//   console.error('MongoDB connection error:', err);
// });


