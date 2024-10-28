const textFormatting = require('../utils/textFormatting');

const createInstitute = async (req, res, next) => {
  try {
    // NEEDS TO CHECK FOR ADMIN
    const { name, location, type, department } = req.body
    const { formattedText } = textFormatting(name);
    // const Institution = 
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}
const indexInstitute = async (req, res, next) => {

}
const getInstitute = async (req, res, next) => {

}
const updateInstitute = async (req, res, next) => {

}
const deleteInstitute = async (req, res, next) => {

}

module.exports = { createInstitute, indexInstitute, getInstitute, updateInstitute, deleteInstitute }