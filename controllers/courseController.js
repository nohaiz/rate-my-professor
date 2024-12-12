const mongoose = require('mongoose');


const Course = require('../models/course');
const Department = require('../models/department')
const ProfessorAccount = require('../models/professorAccount')


const textFormatting = require('../utils/textFormatting');

const createCourse = async (req, res, next) => {
  try {
    if (req.user.type.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can create courses' });
    }

    const { title, code, credits, professors } = req.body;
    const { formattedText, formattedCode } = textFormatting(title, code);

    const courseInDatabase = await Course.findOne({ code: formattedCode });
    if (courseInDatabase) {
      return res.status(400).json({ error: 'This course has already been added.' });
    }

    const professorsExist = await ProfessorAccount.find({ '_id': { $in: professors } });
    if (professorsExist.length !== professors.length) {
      return res.status(400).json({ error: 'One or more professors not found' });
    }

    const payLoad = {
      title: formattedText,
      code: formattedCode,
      credits: credits,
      professors: professors ? professors.map(id => new mongoose.Types.ObjectId(id)) : [],
    };

    const course = await Course.create(payLoad);
    const populatedCourses = await course.populate('professors')
    return res.status(201).json({ course: populatedCourses });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: error.message });
  }
};

const indexCourse = async (req, res, next) => {

  try {

    const { page = 1, limit } = req.query;
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { title: 1 },
    };

    const courses = await Course.find({})
      .sort(options.sort)
      .skip((options.page - 1) * options.limit)
      .limit(options.limit)
      .populate('professors');

    if (courses.length === 0) {
      return res.status(400).json({ error: 'There are currently no courses available.' });
    }

    const totalCourses = await Course.countDocuments();
    return res.status(200).json({ courses, totalCourses, currentPage: options.page });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

const getCourse = async (req, res, next) => {

  try {

    const { id } = req.params
    const course = await Course.findById(id).populate('professors');;

    if (!course) {
      return res.status(400).json({ error: 'This course is not available.' });
    }
    return res.status(200).json({ course })
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

const updateCourse = async (req, res, next) => {
  try {
    if (req.user.type.role !== 'admin') {
      return res.status(400).json({ error: 'Opps something went wrong' });
    }

    const { id } = req.params;
    const { title, code, credits, professors } = req.body;

    const { formattedText, formattedCode } = textFormatting(title, code);

    const existingCourse = await Course.findOne({ code: formattedCode });

    if (existingCourse && existingCourse._id.toString() !== id) {
      return res.status(400).json({ error: 'This course code is already in use.' });
    }
    const updateData = {
      title: formattedText,
      code: formattedCode,
      credits,
      professors: professors ? professors.map(id => new mongoose.Types.ObjectId(id)) : null,
    };

    const course = await Course.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!course) {
      return res.status(404).json({ error: 'Course not found.' });
    }

    const populatedCourses = await course.populate('professors')
    return res.status(200).json({ course: populatedCourses });
  } catch (error) {
    return res.status(500).json({ message: error });
  }
};

const deleteCourse = async (req, res, next) => {
  try {
    if (req.user.type.role !== 'admin') {
      return res.status(400).json({ error: 'Opps something went wrong' });
    }
    const { id } = req.params
    const course = await Course.findByIdAndDelete(id)

    if (!course) {
      return res.status(400).json({ error: 'Course not found.' })
    }
    await Department.updateMany(
      { courses: id },
      { $pull: { courses: id } }
    );

    return res.status(200).json({ message: 'Course deletion was successful.' })

  } catch (error) {
    console.error('Error deleting course:', error); 
    return res.status(500).json({ message: error.message });
  }
}

module.exports = { createCourse, indexCourse, getCourse, updateCourse, deleteCourse }