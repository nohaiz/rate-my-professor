// IMPORTED MODULES

const bcrypt = require('bcrypt');
const mongoose = require('mongoose');

// MODELS

const User = require('../models/user');
const ProfessorAccount = require("../models/professorAccount");
const StudentAccount = require('../models/studentAccount');
const Course = require('../models/course');
const Department = require('../models/department');

const indexProfessor = async (req, res, next) => {
  try {
    const { page = 1, limit, name } = req.query;
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { firstName: 1, lastName: 1 },
    };

    let searchCriteria = {};

    if (name) {
      const nameParts = name.trim().split(' ');

      if (nameParts.length === 2) {
        const [firstName, lastName] = nameParts;
        searchCriteria = {
          $and: [
            { firstName: { $regex: firstName, $options: 'i' } },
            { lastName: { $regex: lastName, $options: 'i' } }
          ]
        };
      } else {
        searchCriteria = {
          $or: [
            { firstName: { $regex: name, $options: 'i' } },
            { lastName: { $regex: name, $options: 'i' } }
          ]
        };
      }
    }

    const professors = await ProfessorAccount.find(searchCriteria)
      .sort(options.sort)
      .skip((options.page - 1) * options.limit)
      .limit(options.limit);

    if (professors.length === 0) {
      return res.status(404).json({ error: 'No professors found' });
    }

    const professorsData = await Promise.all(professors.map(async (professor) => {
      const populatedProfessor = await professor.populate({
        path: 'institution',
        select: '-departments'
      });

      const courses = await Course.find({ professors: professor._id }).select('-professors');

      const departmentIds = courses.map(course => course._id);
      const department = await Department.findOne({ courses: { $in: departmentIds } }).select('-courses');

      return { ...populatedProfessor.toObject(), courses, department };
    }));

    const totalProfessors = await ProfessorAccount.countDocuments(searchCriteria);

    return res.status(200).json({
      professorsData,
      totalProfessors,
      currentPage: options.page,
    });

  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getProfessor = async (req, res, next) => {

  try {

    const { id } = req.params;

    const professor = await ProfessorAccount.findById(id).populate('institution', '-departments');
    if (!professor) {
      return res.status(404).json({ error: 'Professor not found' });
    }
    const course = await Course.findOne({ professors: id }).select('-professors');
    if (!course) {
      return res.status(404).json({ error: 'Course not found' })
    }
    const department = await Department.findOne({ courses: course._id }).select('-courses');;
    if (!department) {
      return res.status(404).json({ error: 'Department not found' })
    }

    let professorData = { professor, department, course };
    return res.status(200).json(professorData);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

const createProfessorReview = async (req, res, next) => {

  try {
    if (req.user.type.role !== 'student') {
      return res.status(400).json({ error: 'Oops, something went wrong' });
    }

    const { id } = req.params;
    const studentId = req.user.type.Id;
    let { courseId, text, rating } = req.body;

    if (!courseId || !text || !rating) {
      return res.status(404).json({ error: 'Please fill in all the fields' });
    }

    const course = await Course.findOne({ professors: id });
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }
    if (course._id.toString() !== courseId) {
      return res.status(404).json({ error: 'Course ID does not match the assigned professor' });
    }

    const student = await User.findById(studentId).populate('studentAccount');
    if (!student.studentAccount.GPA) {
      return res.status(404).json({ error: "Update your profile GPA before submitting a review." });
    }

    const review = { studentId, courseId, text, rating };

    const professor = await ProfessorAccount.findById(id);
    if (!professor) {
      return res.status(404).json({ error: 'Professor not found' });
    }

    const currentReviewCount = professor.reviewCount || 0;
    const currentAverageRating = professor.averageRating || 0;

    const normalizedGPA = (student.studentAccount.GPA / 4) * 5;
    const weightedRating = normalizedGPA * rating;

    const totalRating = currentAverageRating * currentReviewCount + weightedRating;

    const newReviewCount = currentReviewCount + 1;
    let newAverageRating = totalRating / newReviewCount;

    newAverageRating = Math.min(newAverageRating, 5);

    professor.reviews.push(review);
    professor.reviewCount = newReviewCount;
    professor.averageRating = newAverageRating;

    await professor.save();
    return res.status(200).json(professor);

  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const updateProfessorReview = async (req, res, next) => {

  try {
    if (req.user.type.role !== 'student') {
      return res.status(400).json({ error: 'Oops, something went wrong' });
    }

    const { id, reviewId } = req.params;

    const professorInDatabase = await ProfessorAccount.findById(id)

    if (!professorInDatabase) {
      return res.status(404).json({ error: 'Professor not found' });
    }
    const reviewInDatabase = professorInDatabase.reviews.find((review) => review._id.toString() === reviewId && review.studentId.toString() === req.user.type.Id)

    if (!reviewInDatabase) {
      return res.status(404).json({ error: 'Review not found.' });
    }
    let { text, rating } = req.body;

    if (!text || !rating) {
      return res.status(404).json({ error: 'Please fill in all the fields' });
    }

    const student = await User.findById(req.user.type.Id).populate('studentAccount');
    if (!student.studentAccount.GPA) {
      return res.status(404).json({ error: "Update your profile GPA before submitting a review." });
    }

    const oldRating = reviewInDatabase.rating;
    const currentReviewCount = professorInDatabase.reviewCount || 0;
    const currentAverageRating = professorInDatabase.averageRating || 0;

    const normalizedGPA = (student.studentAccount.GPA / 4) * 5;
    const weightedRating = normalizedGPA * rating;

    const totalRating = currentAverageRating * currentReviewCount - (normalizedGPA * oldRating) + weightedRating;

    const newAverageRating = totalRating / currentReviewCount;

    const finalAverageRating = Math.min(newAverageRating, 5);

    reviewInDatabase.text = text;
    reviewInDatabase.rating = rating;

    professorInDatabase.averageRating = finalAverageRating;

    await professorInDatabase.save();
    return res.status(200).json(professorInDatabase);

  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

const deleteProfessorReview = async (req, res, next) => {
  try {
    if (req.user.type.role !== 'student') {
      return res.status(400).json({ error: 'Oops, something went wrong' });
    }

    const { id, reviewId } = req.params;

    const professorInDatabase = await ProfessorAccount.findById(id);
    if (!professorInDatabase) {
      return res.status(404).json({ error: 'Professor not found' });
    }

    const reviewIndex = professorInDatabase.reviews.findIndex(
      (review) => review._id.toString() === reviewId && review.studentId.toString() === req.user.type.Id
    );

    if (reviewIndex === -1) {
      return res.status(404).json({ error: 'Review not found or you are not authorized to delete this review.' });
    }

    const reviewToDelete = professorInDatabase.reviews[reviewIndex];
    const oldRating = reviewToDelete.rating;
    const currentReviewCount = professorInDatabase.reviewCount || 0;
    const currentAverageRating = professorInDatabase.averageRating || 0;

    professorInDatabase.reviews.splice(reviewIndex, 1);

    const newReviewCount = currentReviewCount - 1;

    let newAverageRating = 0;
    if (newReviewCount > 0) {
      const totalRating = currentAverageRating * currentReviewCount - oldRating;
      newAverageRating = totalRating / newReviewCount;
    }

    professorInDatabase.reviewCount = newReviewCount;
    professorInDatabase.averageRating = Math.min(newAverageRating, 5);

    await professorInDatabase.save();

    return res.status(200).json({ message: 'Review deleted successfully', professor: professorInDatabase });

  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};


module.exports = { indexProfessor, getProfessor, createProfessorReview, updateProfessorReview, deleteProfessorReview }