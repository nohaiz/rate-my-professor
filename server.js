// IMPORTED MODULES

require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");
const morgan = require("morgan"); // DEV TOOL
const verifyToken = require('./middlewares/verify-token.js')

// DATABASE
require("./config/database.js");

// PORT
const port = process.env.PORT ? process.env.PORT : "3000";

// IMPORTED ROUTES

const authorizationRoute = require('./routes/authorizationRoute.js');
const adminCourseRoute = require('./routes/adminCourseRoute.js');

// MIDDLEWARE
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// ROUTES

app.use('/', authorizationRoute);

// app.use(verifyToken);
app.use('/admin/courses', adminCourseRoute)

app.listen(port, () => {
  console.log("The express app is ready!");
});

