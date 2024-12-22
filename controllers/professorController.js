// IMPORTED MODULES

const bcrypt = require('bcrypt');
const mongoose = require('mongoose');

// MODELS

const User = require('../models/user');
const ProfessorAccount = require("../models/professorAccount");
const StudentAccount = require('../models/studentAccount');

const Course = require('../models/course');
const Department = require('../models/department');
const Institution = require('../models/institution');

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
      const department = await Department.find({ courses: { $in: departmentIds } }).select('-courses');

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

    const professor = await ProfessorAccount.findById(id).populate('institution', '-departments')
      .populate('reviews.studentId')
      .populate('reviews.courseId', '-professors')

    if (!professor) {
      return res.status(404).json({ error: 'Professor not found' });
    }
    const courses = await Course.find({ professors: id }).select('-professors');

    let departments = null;
    if (courses) {
      const courseIds = courses.map(course => course._id);
      departments = await Department.find({ courses: { $in: courseIds } }).select('-courses');
    }

    let professorData = { professor, course: courses || null, department: departments || null };
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
    const userId = req.user.type.Id;

    let { courseId, text, rating } = req.body;

    if (!courseId || !text || !rating) {
      return res.status(404).json({ error: 'Please fill in all the fields' });
    }

    const courses = await Course.find({ professors: id });
    if (!courses || courses.length === 0) {
      return res.status(404).json({ error: 'No courses found for this professor' });
    }

    const foundCourse = courses.find(c => c._id.toString() === courseId);
    if (!foundCourse) {
      return res.status(404).json({ error: 'Course ID does not match the professor\'s courses' });
    }

    const student = await User.findById(userId).populate('studentAccount');
    if (!student.studentAccount.GPA) {
      return res.status(404).json({ error: "Update your profile GPA before submitting a review." });
    }

    const reviewId = new mongoose.Types.ObjectId();

    const review = {
      _id: reviewId,
      studentId: student.studentAccount._id,
      courseId,
      text,
      rating
    };

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

    professor.reviews.push({ ...review, _id: reviewId });
    professor.reviewCount = newReviewCount;
    professor.averageRating = newAverageRating;

    const studentReview = {
      professorId: id,
      text,
      courseId,
      rating,
      _id: reviewId
    };

    student.studentAccount.reviews.push(studentReview);
    student.studentAccount.reviewCount = student.studentAccount.reviewCount + 1;

    await student.studentAccount.save();
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
    const userId = req.user.type.Id;

    const student = await User.findById(userId).populate('studentAccount');

    if (!student.studentAccount.GPA) {
      return res.status(400).json({ error: "Update your profile GPA before submitting a review." });
    }

    const professorInDatabase = await ProfessorAccount.findById(id);
    if (!professorInDatabase) {
      return res.status(404).json({ error: 'Professor not found' });
    }

    const reviewInDatabase = professorInDatabase.reviews.find((review) =>
      review._id.toString() === reviewId && review.studentId.toString() === student.studentAccount._id.toString()
    );

    if (!reviewInDatabase) {
      return res.status(404).json({ error: 'Review not found or you are not authorized to edit it.' });
    }

    const { text, rating } = req.body;

    if (!text || !rating) {
      return res.status(400).json({ error: 'Please fill in all the fields' });
    }

    const oldRating = reviewInDatabase.rating;
    const currentReviewCount = professorInDatabase.reviewCount || 0;
    const currentAverageRating = professorInDatabase.averageRating || 0;

    const normalizedGPA = (student.studentAccount.GPA / 4) * 5;
    const weightedRating = normalizedGPA * rating;

    const totalRating = (currentAverageRating * currentReviewCount) - (normalizedGPA * oldRating) + weightedRating;

    const newAverageRating = totalRating / currentReviewCount;
    const finalAverageRating = Math.min(newAverageRating, 5);

    reviewInDatabase.text = text;
    reviewInDatabase.rating = rating;

    professorInDatabase.averageRating = finalAverageRating;

    const studentReview = student.studentAccount.reviews.find(
      (review) => review._id.toString() === reviewId && review.professorId.toString() === id
    );

    if (!studentReview) {
      return res.status(404).json({ error: 'Student review not found' });
    }

    studentReview.text = text;
    studentReview.rating = rating;

    await professorInDatabase.save();
    await student.studentAccount.save();

    return res.status(200).json(professorInDatabase);

  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const deleteProfessorReview = async (req, res, next) => {
  try {
    if (req.user.type.role !== 'student') {
      return res.status(400).json({ error: 'Only students can delete reviews' });
    }

    const { id, reviewId } = req.params;
    const userId = req.user.type.Id;

    const user = await User.findById(userId).populate('studentAccount');
    const student = user.studentAccount;

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const professorInDatabase = await ProfessorAccount.findById(id);
    if (!professorInDatabase) {
      return res.status(404).json({ error: 'Professor not found' });
    }

    const professorReview = professorInDatabase.reviews.find(
      (review) => {
        return review._id.toString() === reviewId && review.studentId.toString() === student._id.toString();
      }
    );

    const studentReview = student.reviews.find(
      (review) => {
        return review._id.toString() === reviewId && review.professorId.toString() === professorInDatabase._id.toString();
      }
    );

    if (!professorReview || !studentReview) {
      return res.status(404).json({ error: 'Review not found or you are not authorized to delete this review.' });
    }

    const oldProfessorRating = professorReview.rating;
    const currentProfessorReviewCount = professorInDatabase.reviewCount || 0;
    const currentProfessorAverageRating = professorInDatabase.averageRating || 0;

    await ProfessorAccount.updateOne(
      { _id: id },
      { $pull: { reviews: { _id: reviewId, studentId: student._id } } }
    );

    await StudentAccount.updateOne(
      { _id: student._id },
      { $pull: { reviews: { _id: reviewId, professorId: id } } }
    );

    const newProfessorReviewCount = currentProfessorReviewCount - 1;
    let newProfessorAverageRating = 0;

    if (newProfessorReviewCount > 0) {
      const totalProfessorRating = currentProfessorAverageRating * currentProfessorReviewCount - oldProfessorRating;
      newProfessorAverageRating = totalProfessorRating / newProfessorReviewCount;
    }

    await ProfessorAccount.updateOne(
      { _id: id },
      {
        $set: {
          reviewCount: newProfessorReviewCount,
          averageRating: Math.max(0, Math.min(newProfessorAverageRating, 5)),
        },
      }
    );

    await StudentAccount.updateOne(
      { _id: student._id },
      { $set: { reviewCount: student.reviewCount - 1 } }
    );

    return res.status(200).json({ message: 'Both reviews deleted successfully' });

  } catch (error) {
    console.error("Error occurred during review deletion:", error);
    return res.status(500).json({ message: 'An error occurred while deleting the review', error: error.message });
  }
};

const addProfessorComment = async (req, res) => {

  try {

    const { id, reviewId } = req.params;
    const userId = req.user.type.Id;

    const professor = await ProfessorAccount.findById(id);
    if (!professor) {
      return res.status(404).json({ error: 'Professor not found' });
    }

    const review = professor.reviews.find(review => review._id.toString() === reviewId);
    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    const { comment } = req.body;
    if (!comment || typeof comment !== 'string') {
      return res.status(400).json({ error: 'Please provide a valid comment text.' });
    }

    const newComment = {
      text: comment,
      userId,
    };

    review.comments.push(newComment);

    await professor.save();

    return res.status(200).json({
      message: 'Comment added successfully',
      review: review,
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const updateProfessorComment = async (req, res) => {
  try {
    const { id, reviewId, commentId } = req.params;
    const { comment } = req.body;
    const userId = req.user.type.Id;

    const professor = await ProfessorAccount.findById(id);
    if (!professor) {
      return res.status(404).json({ error: 'Professor not found' });
    }

    const review = professor.reviews.find(review => review._id.toString() === reviewId);
    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    const commentToUpdate = review.comments.find(comment => comment._id.toString() === commentId);
    if (!commentToUpdate) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    if (commentToUpdate.userId.toString() !== userId.toString()) {
      return res.status(403).json({ error: 'You can only update your own comments' });
    }

    if (!comment || typeof comment.text !== 'string' || comment.text.trim() === '') {
      return res.status(400).json({ error: 'Please provide a valid comment text.' });
    }

    commentToUpdate.text = comment.text;

    await professor.save();

    return res.status(200).json({
      message: 'Comment updated successfully',
      review: review,
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};


const removeProfessorComment = async (req, res) => {
  try {
    const { id, reviewId, commentId } = req.params;
    const userId = req.user.type.Id;

    const professor = await ProfessorAccount.findById(id);
    if (!professor) {
      return res.status(404).json({ error: 'Professor not found' });
    }

    const review = professor.reviews.find(review => review._id.toString() === reviewId);
    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    const commentIndex = review.comments.findIndex(comment => comment._id.toString() === commentId);
    if (commentIndex === -1) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    if (review.comments[commentIndex].userId.toString() !== userId) {
      return res.status(403).json({ error: 'You are not authorized to delete this comment' });
    }

    review.comments.splice(commentIndex, 1);

    await professor.save();

    return res.status(200).json({
      message: 'Comment removed successfully',
      review: review,
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};


const addProfessorCourse = async (req, res, next) => {
  const { institution, selectedCourse } = req.body;
  const { id } = req.params;

  if (req.user.type.Id.toString() !== id.toString()) {
    return res.status(400).json({ error: 'Invalid Professor Id' });
  }

  try {
    if (!institution || !selectedCourse) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const withinInstitution = await Institution.findById(institution).populate({
      path: 'departments',
      populate: { path: 'courses' }
    });

    if (!withinInstitution) {
      return res.status(404).json({ error: 'Institution not found' });
    }

    let selectedCourseObject = null;
    for (const department of withinInstitution.departments) {
      selectedCourseObject = department.courses.find(course => course._id.toString() === selectedCourse);
      if (selectedCourseObject) break;
    }

    const professor = await User.findById(id).populate("professorAccount");

    const updatedCourse = await Course.findByIdAndUpdate(
      selectedCourse,
      { $addToSet: { professors: professor.professorAccount._id } },
      { new: true }
    );

    return res.status(200).json({ message: 'Professor successfully added to the course.' });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'An unexpected error occurred' });
  }
};

const removeProfessorCourse = async (req, res, next) => {

  const { institution, selectedCourse } = req.body;
  const { id } = req.params;

  if (req.user.type.Id.toString() !== id.toString()) {
    return res.status(400).json({ error: 'Invalid Professor Id' });
  }

  try {
    if (!institution || !selectedCourse) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    const professor = await User.findById(id).populate("professorAccount")

    const updatedCourse = await Course.findOneAndUpdate(
      { _id: selectedCourse },
      { $pull: { professors: professor.professorAccount._id } },
      { new: true }
    );

    if (!updatedCourse) {
      return res.status(404).json({ error: 'Failed to remove professor from the course' });
    }

    return res.status(200).json({ message: 'Professor successfully removed from the course.' });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'An unexpected error occurred' });
  }
};

const addProfessorToBookmarks = async (req, res, next) => {
  try {
    const { id } = req.params;
    const professor = await ProfessorAccount.findById(id);
    if (!professor) {
      return res.status(404).json({ error: 'Professor not found' });
    }

    const updatedUser = await User.findOneAndUpdate(
      { _id: req.user.type.Id },
      { $push: { bookMarkedProfessor: id } },
      { new: true }
    );
    return res.status(200).json(updatedUser);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const removeProfessorFromBookmarks = async (req, res, next) => {
  try {
    const { id } = req.params;
    const professor = await ProfessorAccount.findById(id);
    if (!professor) {
      return res.status(404).json({ error: 'Professor not found' });
    }

    const updatedUser = await User.findOneAndUpdate(
      { _id: req.user.type.Id },
      { $pull: { bookMarkedProfessor: id } },
      { new: true }
    );

    return res.status(200).json(updatedUser);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = { indexProfessor, getProfessor, addProfessorCourse, removeProfessorCourse, createProfessorReview, updateProfessorReview, deleteProfessorReview, addProfessorToBookmarks, removeProfessorFromBookmarks, addProfessorComment, updateProfessorComment, removeProfessorComment }