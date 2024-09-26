// IMPORTED MODULES

require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");
const morgan = require("morgan"); // DEV TOOL

// DATABASE
require("./config/database.js");

// PORT
const port = process.env.PORT ? process.env.PORT : "3000";

// IMPORTED CONTROLLERS


// MIDDLEWARE

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// ROUTES


app.listen(port, () => {
  console.log("The express app is ready!");
});

