const mongoose = require('mongoose');

const Course = require('../models/course');
const Department = require('../models/department');

const textFormatting = require('../utils/textFormatting');

const createDepartment = async (req, res, next) => {

  try {

    if (req.user.type.role !== 'admin') {
      return res.status(400).json({ error: 'Opps something went wrong' });
    }
    const { name, courses } = req.body
    const { formattedText } = textFormatting(name);
    const departmentInDatabase = await Department.findOne({ name: formattedText })

    if (departmentInDatabase) {
      return res.status(400).json({ error: 'This department has already been added.' })
    }

    const uniqueCourses = new Set();
    const invalidCourseIds = [];

    for (const id of courses) {
      uniqueCourses.has(id) ? invalidCourseIds.push(id) : uniqueCourses.add(id);
    }
    if (invalidCourseIds.length > 0) {
      return res.status(400).json({ error: 'Duplicate course IDs found.', duplicates: invalidCourseIds });
    }

    const courseInDatabase = await Promise.all(
      courses.map(async (id) => {
        const courseExist = await Course.findById(id);
        return courseExist ? true : false;
      })
    )

    if (courseInDatabase.includes(false)) {
      return res.status(400).json({ error: 'One or more course IDs are invalid.' });
    }

    const payLoad = {
      name: formattedText,
      courses: courses.map(id => new mongoose.Types.ObjectId(id)),
    }
    const department = await Department.create(payLoad);
    return res.status(201).json({ department })

  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

const indexDepartment = async (req, res, next) => {

  try {

    if (req.user.type.role !== 'admin') {
      return res.status(400).json({ error: 'Opps something went wrong' });
    }
    const { page = 1, limit = 10 } = req.query;
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { name: 1 },
    };

    const departments = await Department.find({})
      .sort(options.sort)
      .skip((options.page - 1) * options.limit)
      .limit(options.limit)
      .populate('courses');

    if (departments.length === 0) {
      return res.status(400).json({ error: 'There are currently no departments available.' });
    }
    const totalDepartments = await Department.countDocuments();
    return res.status(200).json({ departments, totalDepartments, currentDepartment: options.page })
  } catch (error) {
    return res.status(500).json({ message: error.message });

  }
}

const getDepartment = async (req, res, next) => {

  try {

    if (req.user.type.role !== 'admin') {
      return res.status(400).json({ error: 'Opps something went wrong' });
    }
    const { id } = req.params
    const department = await Department.findById(id).populate('courses');

    if (!department) {
      return res.status(400).json({ error: 'This department is not available.' });
    }
    return res.status(200).json({ department })
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

const updateDepartment = async (req, res, next) => {

  try {

    if (req.user.type.role !== 'admin') {
      return res.status(400).json({ error: 'Opps something went wrong' });
    }
    const { id } = req.params;
    const { name, courses } = req.body
    const { formattedText } = textFormatting(name);

    const existingDepartment = await Department.findOne({ name: formattedText });

    if (existingDepartment && existingDepartment._id.toString() !== id) {
      return res.status(400).json({ error: 'This department name is already in use.' });
    }

    const uniqueCourses = new Set();
    const invalidCourseIds = [];

    for (const id of courses) {
      uniqueCourses.has(id) ? invalidCourseIds.push(id) : uniqueCourses.add(id);
    }
    if (invalidCourseIds.length > 0) {
      return res.status(400).json({ error: 'Duplicate course IDs found.', duplicates: invalidCourseIds });
    }

    const courseInDatabase = await Promise.all(
      courses.map(async (id) => {
        const courseExist = await Course.findById(id);
        return courseExist ? true : false;
      })
    )

    if (courseInDatabase.includes(false)) {
      return res.status(400).json({ error: 'One or more course IDs are invalid.' });
    }

    const department = await Department.findByIdAndUpdate(
      id,
      {
        name: formattedText,
        courses: courses.map(id => new mongoose.Types.ObjectId(id)),
      },
      { new: true, runValidators: true }
    );

    if (!department) {
      return res.status(404).json({ error: 'Department not found.' });
    }
    return res.status(200).json({ department });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

const deleteDepartment = async (req, res, next) => {

  try {

    if (req.user.type.role !== 'admin') {
      return res.status(400).json({ error: 'Opps something went wrong' });
    }
    const { id } = req.params
    const department = await Department.findByIdAndDelete(id)

    if (!department) {
      return res.status(400).json({ error: 'Department not found.' })
    }
    return res.status(200).json({ message: 'Department deletion was successful.' })

  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

module.exports = { createDepartment, indexDepartment, getDepartment, updateDepartment, deleteDepartment }
