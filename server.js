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
// ADMIN
const adminCourseRoute = require('./routes/adminCourseRoute.js');
const adminDepartmentRoute = require('./routes/adminDepartmentRoute.js');
const adminInstituteRoute = require('./routes/adminInstituteRoute.js');
const adminUserRoute = require('./routes/adminUserRoute.js');
// USER
const courseRoute = require('./routes/courseRoute.js');
const departmentRoute = require('./routes/departmentRoute.js');
const instituteRoute = require('./routes/instituteRoute.js');
const profileRoute = require('./routes/profileRoute.js');
const professorRoute = require('./routes/professorRoute.js')

const reportRoute = require('./routes/report.Route.js')
const searchRoute = require('./routes/search.js')
const notificationRoute = require('./routes/notificationRoute.js')
const adminAuditTrailRoute = require('./routes/adminAuditTrailRoute.js')

// MIDDLEWARE
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// ROUTES

// PUBLIC ROUTES
app.use('/auth', authorizationRoute);
app.use('/institutes', instituteRoute)
app.use('/departments', departmentRoute)
app.use('/courses', courseRoute)
app.use('/professors', professorRoute)

// PRIVATE ROUTES
app.use(verifyToken);
// ADMIN 
app.use('/admin/courses', adminCourseRoute)
app.use('/admin/departments', adminDepartmentRoute)
app.use('/admin/institutes', adminInstituteRoute)
app.use('/admin/users', adminUserRoute)
app.use('/admin/audit-trails', adminAuditTrailRoute)
// USER
app.use("/profile", profileRoute)
app.use("/reports", reportRoute)
app.use("/searchHistory", searchRoute)
app.use("/notifications", notificationRoute)



app.listen(port, () => {
  console.log("The express app is ready!");
});

