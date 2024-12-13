const mongoose = require('mongoose');

const Course = require('../models/course');
const Department = require('../models/department');

const textFormatting = require('../utils/textFormatting');
const Institution = require('../models/institution');

const createDepartment = async (req, res, next) => {

  try {

    if (req.user.type.role !== 'admin') {
      return res.status(400).json({ error: 'Oops something went wrong' });
    }
    const { name, courses } = req.body;
    const { formattedText } = textFormatting(name);

    const departmentInDatabase = await Department.findOne({ name: formattedText });

    if (departmentInDatabase) {
      return res.status(400).json({ error: 'This department has already been added.' });
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
    );

    if (courseInDatabase.includes(false)) {
      return res.status(400).json({ error: 'One or more course IDs are invalid.' });
    }

    const coursesInOtherDepartments = await Department.find({
      _id: { $ne: departmentInDatabase ? departmentInDatabase._id : null },
      courses: { $in: courses.map(id => new mongoose.Types.ObjectId(id)) }
    }).populate('courses'); 

    if (coursesInOtherDepartments.length > 0) {
      const conflictingCourses = new Set();

      coursesInOtherDepartments.forEach(department => {
        department.courses.forEach(course => {
          if (courses.includes(course._id.toString())) {
            conflictingCourses.add(course.title); 
          }
        });
      });

      return res.status(400).json({
        error: `The following courses are already assigned to other departments: ${[...conflictingCourses].join(', ')}.`
      });
    }

    const payLoad = {
      name: formattedText,
      courses: courses.map(id => new mongoose.Types.ObjectId(id)),
    };
    const department = await Department.create(payLoad);
    const populatedDepartment = await Department.findById(department._id).populate('courses');

    return res.status(201).json({ department: populatedDepartment });

  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const indexDepartment = async (req, res, next) => {

  try {

    const { page = 1, limit } = req.query;
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
      return res.status(400).json({ error: 'Oops something went wrong' });
    }

    const { id } = req.params;
    const { name, courses } = req.body;
    const { formattedText } = textFormatting(name);

    const existingDepartment = await Department.findOne({ name: formattedText });

    if (existingDepartment && existingDepartment._id.toString() !== id) {
      return res.status(400).json({ error: 'This department name is already in use.' });
    }

    const uniqueCourses = new Set();
    const invalidCourseIds = [];

    for (const courseId of courses) {
      uniqueCourses.has(courseId) ? invalidCourseIds.push(courseId) : uniqueCourses.add(courseId);
    }

    if (invalidCourseIds.length > 0) {
      return res.status(400).json({ error: 'Duplicate course IDs found.', duplicates: invalidCourseIds });
    }

    const courseInDatabase = await Promise.all(
      courses.map(async (courseId) => {
        const courseExist = await Course.findById(courseId);
        return courseExist ? true : false;
      })
    );

    if (courseInDatabase.includes(false)) {
      return res.status(400).json({ error: 'One or more course IDs are invalid.' });
    }

    const coursesInOtherDepartments = await Department.find({
      _id: { $ne: id },
      courses: { $in: courses.map(courseId => new mongoose.Types.ObjectId(courseId)) }
    }).populate('courses');


    if (coursesInOtherDepartments.length > 0) {
      const conflictingCourses = new Set();

      coursesInOtherDepartments.forEach(department => {
        department.courses.forEach(course => {
          if (courses.includes(course._id.toString())) {
            conflictingCourses.add(course.title);
          }
        });
      });

      return res.status(400).json({
        error: `The following courses are already assigned to other department: ${[...conflictingCourses].join(', ')}.`
      });
    }

    const department = await Department.findByIdAndUpdate(
      id,
      {
        name: formattedText,
        courses: courses.map(courseId => new mongoose.Types.ObjectId(courseId)),
      },
      { new: true, runValidators: true }
    ).populate('courses');

    if (!department) {
      return res.status(404).json({ error: 'Department not found.' });
    }

    return res.status(200).json({ department });

  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const deleteDepartment = async (req, res, next) => {
  try {
    if (req.user.type.role !== 'admin') {
      return res.status(400).json({ error: 'Oops something went wrong' });
    }

    const { id } = req.params;
    const department = await Department.findById(id);

    if (!department) {
      return res.status(400).json({ error: 'Department not found.' });
    }
    const institution = await Institution.find({ departments: id });
    await Institution.findByIdAndUpdate(
      institution._id,
      { $pull: { departments: id } },
      { new: true }
    )
    await Department.findByIdAndDelete(id);

    return res.status(200).json({ message: 'Department and associated courses have been successfully deleted.' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};


module.exports = { createDepartment, indexDepartment, getDepartment, updateDepartment, deleteDepartment }
