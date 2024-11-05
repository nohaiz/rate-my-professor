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
const adminDepartmentRoute = require('./routes/adminDepartmentRoute.js');
const adminInstituteRoute = require('./routes/adminInstituteRoute.js');
const adminUserRoute = require('./routes/adminUserRoute.js')
const profileRoute = require('./routes/profileRoute.js')


// MIDDLEWARE
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// ROUTES

app.use('/', authorizationRoute);

app.use(verifyToken);
app.use('/admin/courses', adminCourseRoute)
app.use('/admin/departments', adminDepartmentRoute)
app.use('/admin/institutes', adminInstituteRoute)
app.use('/admin/users', adminUserRoute)
app.use("/profile", profileRoute)


app.listen(port, () => {
  console.log("The express app is ready!");
});

