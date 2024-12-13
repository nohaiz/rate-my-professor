const mongoose = require('mongoose');

const Institution = require("../models/institution")
const Department = require('../models/department');
const Course = require("../models/course")

const textFormatting = require('../utils/textFormatting');

const createInstitute = async (req, res, next) => {
  try {
    if (req.user.type.role !== 'admin') {
      return res.status(400).json({ error: 'Oops something went wrong' });
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
      return res.status(400).json({ error: 'Duplicate department IDs found.', duplicates: invalidDepartments });
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

    const departmentsInOtherInstitutions = await Institution.find({
      _id: { $ne: institutionInDatabase ? institutionInDatabase._id : null },
      departments: { $in: departments.map(id => new mongoose.Types.ObjectId(id)) }
    }).populate('departments');

    if (departmentsInOtherInstitutions.length > 0) {
      const conflictingDepartments = new Set();

      departmentsInOtherInstitutions.forEach(institution => {
        institution.departments.forEach(department => {
          if (departments.includes(department._id.toString())) {
            conflictingDepartments.add(department.name);
          }
        });
      });

      return res.status(400).json({
        error: `The following departments are already assigned to other institutions: ${[...conflictingDepartments].join(', ')}.`
      });
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
};


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

    const existingInstitution = await Institution.findOne({ name: formattedText });

    if (existingInstitution && existingInstitution._id.toString() !== id) {
      return res.status(400).json({ error: 'This institution name is already in use.' });
    }

    const uniqueDepartments = new Set();
    const invalidDepartments = [];

    for (const id of departments) {
      uniqueDepartments.has(id) ? invalidDepartments.push(id) : uniqueDepartments.add(id);
    }

    if (invalidDepartments.length > 0) {
      return res.status(400).json({ error: 'Duplicate department IDs found.', duplicates: invalidDepartments });
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

    const departmentsInOtherInstitutions = await Institution.find({
      _id: { $ne: id },
      departments: { $in: departments.map(id => new mongoose.Types.ObjectId(id)) }
    }).populate('departments');

    if (departmentsInOtherInstitutions.length > 0) {
      const conflictingDepartments = new Set();

      departmentsInOtherInstitutions.forEach(institution => {
        institution.departments.forEach(department => {
          if (departments.includes(department._id.toString())) {
            conflictingDepartments.add(department.name);
          }
        });
      });

      return res.status(400).json({
        error: `The following departments are already assigned to other institutions: ${[...conflictingDepartments].join(', ')}.`
      });
    }

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

    return res.status(200).json({ message: 'Institution and associated departments and courses have been successfully deleted.' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};


module.exports = { createInstitute, indexInstitute, getInstitute, updateInstitute, deleteInstitute }