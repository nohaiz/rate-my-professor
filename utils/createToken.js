const jwt = require("jsonwebtoken");

const createToken = (type) => {
  const token = jwt.sign({ type }, process.env.JWT_SECRET);
  return token;
};

module.exports = { createToken };
