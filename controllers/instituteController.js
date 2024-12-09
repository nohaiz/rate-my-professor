const mongoose = require('mongoose');

const Institution = require("../models/institution")
const Department = require('../models/department');
const Course = require("../models/course")

const textFormatting = require('../utils/textFormatting');

const createInstitute = async (req, res, next) => {
  try {
    if (req.user.type.role !== 'admin') {
      return res.status(400).json({ error: 'Opps something went wrong' });
    }

    const { name, location, type, departments } = req.body;
    const { formattedText } = textFormatting(name);

    const institutionInDatabase = await Institution.findOne({ name: formattedText });
    if (institutionInDatabase) {
      return res.status(400).json({ error: 'This institution has already been added.' });
    }

    const uniqueDepartments = new Set();
    const invalidDepartments = [];
    for (const id of departments) {
      uniqueDepartments.has(id) ? invalidDepartments.push(id) : uniqueDepartments.add(id);
    }
    if (invalidDepartments.length > 0) {
      return res.status(400).json({ error: 'Duplicate departments IDs found.', duplicates: invalidDepartments });
    }

    const departmentInDatabase = await Promise.all(
      departments.map(async (id) => {
        const departmentExist = await Department.findById(id);
        return departmentExist ? true : false;
      })
    );
    if (departmentInDatabase.includes(false)) {
      return res.status(400).json({ error: 'One or more department IDs are invalid.' });
    }

    const payLoad = {
      name: formattedText,
      location: location,
      type: type,
      departments: departments.map(id => new mongoose.Types.ObjectId(id)),
    };

    const institution = await Institution.create(payLoad);

    const populatedInstitution = await institution.populate('departments');

    return res.status(201).json({ institution: populatedInstitution });

  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

const indexInstitute = async (req, res, next) => {
  try {
    const { page = 1, limit, name = '' } = req.query;
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { name: 1 },
    };

    const filter = name ? { name: { $regex: name, $options: 'i' } } : {};

    const institution = await Institution.find(filter)
      .sort(options.sort)
      .skip((options.page - 1) * options.limit)
      .limit(options.limit)
      .populate({ path: 'departments', populate: { path: 'courses' } });

    if (institution.length === 0) {
      return res.status(400).json({ error: 'There are currently no institutions available.' });
    }

    const institutionData = institution.map((inst) => inst.toObject());

    const totalInstitution = await Institution.countDocuments(filter);
    return res.status(200).json({
      institutions: institutionData,
      totalInstitution,
      currentInstitution: options.page,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getInstitute = async (req, res, next) => {

  try {

    const { id } = req.params
    const institute = await Institution.findById(id).populate({ path: 'departments', populate: { path: 'courses' } });

    if (!institute) {
      return res.status(400).json({ error: 'This institution is not available.' });
    }
    return res.status(200).json({ institute })
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

const updateInstitute = async (req, res, next) => {

  try {

    if (req.user.type.role !== 'admin') {
      return res.status(400).json({ error: 'Oops something went wrong' });
    }

    const { id } = req.params;
    const { name, location, type, departments } = req.body;
    const { formattedText } = textFormatting(name);

    // Check if the institution name already exists
    const existingInstitution = await Institution.findOne({ name: formattedText });

    if (existingInstitution && existingInstitution._id.toString() !== id) {
      return res.status(400).json({ error: 'This institution name is already in use.' });
    }

    // Check for duplicate department IDs
    const uniqueDepartments = new Set();
    const invalidDepartments = [];

    for (const id of departments) {
      uniqueDepartments.has(id) ? invalidDepartments.push(id) : uniqueDepartments.add(id);
    }

    if (invalidDepartments.length > 0) {
      return res.status(400).json({ error: 'Duplicate departments IDs found.', duplicates: invalidDepartments });
    }

    // Validate that all department IDs are valid
    const departmentInDatabase = await Promise.all(
      departments.map(async (id) => {
        const departmentExist = await Department.findById(id);
        return departmentExist ? true : false;
      })
    );

    if (departmentInDatabase.includes(false)) {
      return res.status(400).json({ error: 'One or more department IDs are invalid.' });
    }

    // Update the institution
    const institution = await Institution.findByIdAndUpdate(
      id,
      {
        name: formattedText,
        location: location,
        type: type,
        departments: departments.map(id => new mongoose.Types.ObjectId(id)),
      },
      { new: true, runValidators: true }
    );

    if (!institution) {
      return res.status(404).json({ error: 'Institution not found.' });
    }

    // Populate the updated institution with departments and courses
    const populatedInstitution = await institution.populate({
      path: 'departments',
      populate: { path: 'courses' }
    });

    return res.status(200).json({ institution: populatedInstitution });

  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};


const deleteInstitute = async (req, res, next) => {
  try {
    if (req.user.type.role !== 'admin') {
      return res.status(400).json({ error: 'Oops something went wrong' });
    }

    const { id } = req.params;
    const institution = await Institution.findByIdAndDelete(id);

    if (!institution) {
      return res.status(400).json({ error: 'Institution not found.' });
    }

    if (institution.departments && institution.departments.length > 0) {
      await Promise.all(institution.departments.map(async (departmentId) => {
        const department = await Department.findById(departmentId);
        if (department && department.courses && department.courses.length > 0) {
          await Course.deleteMany({ _id: { $in: department.courses } });
        }
      }));

      await Department.deleteMany({ _id: { $in: institution.departments } });
    }

    return res.status(200).json({ message: 'Institution and associated departments and courses have been successfully deleted.' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};


module.exports = { createInstitute, indexInstitute, getInstitute, updateInstitute, deleteInstitute }