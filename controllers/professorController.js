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

const Notification = require('../models/notifications')

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

const getProfessorReviews = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id)
      .populate('studentAccount')
      .populate('professorAccount');

    if (user.studentAccount) {
      const student = await StudentAccount.findById(user.studentAccount._id)
        .populate({
          path: 'reviews.professorId',
          select: 'firstName lastName averageRating reviewCount',
        })
        .populate('reviews.courseId')
        .populate({
          path: 'reviews.comments.userId',
          select: 'firstName lastName email',
          strictPopulate: false,
        });

      if (!student || !Array.isArray(student.reviews) || student.reviews.length === 0) {
        return res.status(404).json({ message: 'No reviews found for this student' });
      }

      const professorComments = await ProfessorAccount.find().populate({
        path: 'reviews.comments.userId',
        select: 'email',
      });

      return res.status(200).json({
        userType: 'student',
        userDetails: {
          _id: student._id,
          firstName: student.firstName,
          lastName: student.lastName,
          GPA: student.GPA,
          email: student.email,
        },
        reviews: student.reviews.map(review => {
          const course = review.courseId;

          const professor = professorComments.find(p => p.reviews.some(r => r.courseId.toString() === course._id.toString()));

          if (!professor) {
            return {
              professor: {},
              course: review.courseId ? {
                _id: review.courseId._id,
                courseName: review.courseId.title,
                courseCode: review.courseId.code,
              } : null,
              text: review.text,
              rating: review.rating,
              createdAt: review.createdAt,
              comments: [],
              reviewId: review._id,
            };
          }

          const professorReview = professor.reviews.find(professorReview => professorReview._id.toString() === review._id.toString());
          const comments = professorReview ? professorReview.comments : [];

          return {
            professor: professor ? {
              _id: professor._id,
              firstName: professor.firstName,
              lastName: professor.lastName,
              averageRating: professor.averageRating,
              reviewCount: professor.reviewCount,
              bio: professor.bio,
              institution: professor.institution,
            } : {},
            course: review.courseId ? {
              _id: review.courseId._id,
              courseName: review.courseId.title,
              courseCode: review.courseId.code,
            } : null,
            text: review.text,
            rating: review.rating,
            createdAt: review.createdAt,
            comments: comments.map(comment => ({
              _id: comment._id,
              text: comment.text,
              user: {
                _id: comment.userId._id,
                email: comment.userId.email,
              },
            })) || [],
            reviewId: review._id,
          };
        }),
      });
    } else if (user.professorAccount) {
      const professor = await ProfessorAccount.findById(user.professorAccount._id)
        .populate({
          path: 'reviews.studentId',
          select: 'firstName lastName GPA',
        })
        .populate('reviews.courseId')
        .populate({
          path: 'reviews.comments.userId',
          select: 'firstName lastName email',
          strictPopulate: false,
        });

      if (!professor || !Array.isArray(professor.reviews) || professor.reviews.length === 0) {
        return res.status(404).json({ message: 'No reviews found for this professor' });
      }

      return res.status(200).json({
        userType: 'professor',
        userDetails: {
          _id: professor._id,
          firstName: professor.firstName,
          lastName: professor.lastName,
          averageRating: professor.averageRating,
          reviewCount: professor.reviewCount,
        },
        reviews: professor.reviews.map(review => ({
          reviewId: review._id,
          student: review.studentId ? {
            _id: review.studentId._id,
            firstName: review.studentId.firstName,
            lastName: review.studentId.lastName,
            GPA: review.studentId.GPA,
            email: review.studentId.email,
          } : {},
          course: review.courseId ? {
            _id: review.courseId._id,
            courseName: review.courseId.title,
            courseCode: review.courseId.code,
          } : null,
          text: review.text,
          rating: review.rating,
          createdAt: review.createdAt,
          comments: (review.comments || []).map(comment => ({
            _id: comment._id,
            user: {
              _id: comment.userId._id,
              firstName: comment.userId.firstName,
              lastName: comment.userId.lastName,
              email: comment.userId.email,
            },
            text: comment.text,
            createdAt: comment.createdAt,
          })),
        })),
      });
    } else {
      return res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: error.message });
  }
};

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

    const user = await User.find({ professorAccount: professor._id })

    const notification = new Notification({
      userId: user[0]._id,
      message: `${student.studentAccount.firstName} has left a review for your course: ${text}`,
      reference: reviewId,
      referenceModel: 'Review',
    });

    await notification.save();

    return res.status(200).json(professor);

  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const updateProfessorReview = async (req, res, next) => {

  try {

    const { id, reviewId } = req.params;
    const userId = req.user?.type?.Id;
    const userRole = req.user?.type?.role;

    if (!userId || !userRole) {
      return res.status(400).json({ error: 'User information is missing' });
    }

    const professorInDatabase = await ProfessorAccount.findById(id);
    if (!professorInDatabase) {
      return res.status(404).json({ error: 'Professor not found' });
    }

    if (userRole !== 'student' && userRole !== 'admin') {
      return res.status(400).json({ error: 'Only students or admins can update reviews' });
    }

    let student = null;
    if (userRole === 'student') {
      student = await User.findById(userId).populate('studentAccount');
      if (!student || !student.studentAccount.GPA) {
        return res.status(400).json({ error: "Update your profile GPA before submitting a review." });
      }
    }

    const reviewInDatabase = professorInDatabase.reviews.find((review) =>
      review._id.toString() === reviewId && (userRole === 'admin' || review.studentId.toString() === student?.studentAccount._id.toString())
    );

    if (!reviewInDatabase) {
      return res.status(404).json({ error: 'Review not found or you are not authorized to edit it.' });
    }

    const { text, rating } = req.body;

    if (userRole === 'admin') {
      if (!text) {
        return res.status(400).json({ error: 'Please provide new text for the review' });
      }
      reviewInDatabase.text = text;
    }

    if (userRole === 'student') {
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
      await student.studentAccount.save();

    } else {
      student = await StudentAccount.findById(reviewInDatabase.studentId)
      const studentReview = student.reviews.find(
        (review) => review._id.toString() === reviewId && review.professorId.toString() === id
      );

      if (!studentReview) {
        return res.status(404).json({ error: 'Student review not found' });
      }
      studentReview.text = text;
      await student.save();
    }

    await professorInDatabase.save();

    return res.status(200).json(professorInDatabase);

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: error.message });
  }
};

const deleteProfessorReview = async (req, res, next) => {
  try {
    const { id, reviewId } = req.params;
    const userId = req.user.type.Id;
    const userRole = req.user.type.role;

    if (userRole !== 'student' && userRole !== 'admin') {
      return res.status(400).json({ error: 'Only students or admins can delete reviews' });
    }

    const professorInDatabase = await ProfessorAccount.findById(id);
    if (!professorInDatabase) {
      return res.status(404).json({ error: 'Professor not found' });
    }

    let student = null;
    if (userRole === 'student') {
      student = await User.findById(userId).populate('studentAccount');
      if (!student || !student.studentAccount) {
        return res.status(404).json({ error: 'Student not found' });
      }
    }

    const professorReview = professorInDatabase.reviews.find(
      (review) =>
        review._id.toString() === reviewId &&
        (userRole === 'admin' || review.studentId.equals(student?.studentAccount._id))
    );

    if (!professorReview) {
      return res.status(404).json({ error: 'Review not found or you are not authorized to delete this review.' });
    }

    const currentProfessorReviewCount = professorInDatabase.reviewCount || 0;

    const professorUpdates = [];
    const studentUpdates = [];

    professorUpdates.push({
      updateOne: {
        filter: { _id: id },
        update: { $pull: { reviews: { _id: reviewId } } },
      },
    });
    if (userRole === 'admin') {
      const studentAccount = await StudentAccount.findOne({ _id: professorReview.studentId });
      if (studentAccount) {
        const updatedReviewCount = Math.max(studentAccount.reviewCount - 1, 0);
        studentUpdates.push({
          updateOne: {
            filter: { _id: professorReview.studentId },
            update: {
              $set: { reviewCount: updatedReviewCount },
              $pull: { reviews: { _id: reviewId, professorId: id } }
            },
          },
        });
      }
    } else {
      const updatedReviewCount = Math.max(student.studentAccount.reviewCount - 1, 0);
      studentUpdates.push({
        updateOne: {
          filter: { _id: student.studentAccount._id },
          update: {
            $set: { reviewCount: updatedReviewCount },
            $pull: { reviews: { _id: reviewId, professorId: id } }
          },
        },
      });
    }

    const newProfessorReviewCount = Math.max(currentProfessorReviewCount - 1, 0);
    let newProfessorAverageRating = 0;

    if (newProfessorReviewCount > 0) {
      const totalProfessorRating = professorInDatabase.reviews.reduce((total, review) => total + review.rating, 0);
      newProfessorAverageRating = totalProfessorRating / newProfessorReviewCount;
    }

    professorUpdates.push({
      updateOne: {
        filter: { _id: id },
        update: {
          $set: {
            reviewCount: newProfessorReviewCount,
            averageRating: Math.max(0, Math.min(newProfessorAverageRating, 5)),
          },
        },
      },
    });

    await ProfessorAccount.bulkWrite(professorUpdates);
    if (studentUpdates.length > 0) {
      await StudentAccount.bulkWrite(studentUpdates);
    }

    return res.status(200).json({ message: 'Review deleted successfully' });
  } catch (error) {
    console.error("Error occurred during review deletion:", error);
    return res.status(500).json({ message: 'An error occurred while deleting the review', error: error.message });
  }
};


const addProfessorComment = async (req, res) => {

  try {

    const { id, reviewId } = req.params;
    const { comment } = req.body;
    const userId = req.user.type.Id;
    const userRole = req.user.type.role;

    const professor = await ProfessorAccount.findById(id);
    if (!professor) return res.status(404).json({ error: 'Professor not found' });

    const review = professor.reviews.find(review => review._id.toString() === reviewId);
    if (!review) return res.status(404).json({ error: 'Review not found' });

    if (!comment || typeof comment !== 'string') return res.status(400).json({ error: 'Invalid comment' });

    const newComment = { _id: new mongoose.Types.ObjectId(), text: comment, userId };
    review.comments.push(newComment);
    await professor.save();

    const userType = await User.findById(userId).populate('professorAccount').populate('studentAccount');
    if (review?.studentId.toString() === userType?.studentAccount?._id.toString()) {
      return res.status(200).json({ message: 'Comment added successfully', review });
    }

    const commenterName = userRole === 'professor'
      ? `${userType.professorAccount.firstName} ${userType.professorAccount.lastName}`
      : `${userType.studentAccount.firstName} ${userType.studentAccount.lastName}`;

    const notificationMessage = userRole === 'professor'
      ? `Professor ${commenterName} commented on your review.`
      : `Your review received a comment from ${commenterName}.`;

    const targetUser = await User.findOne({ 'studentAccount': review.studentId });

    const notification = new Notification({
      userId: targetUser._id, message: notificationMessage, reference: newComment._id, referenceModel: 'Comment'
    });
    await notification.save();

    return res.status(200).json({ message: 'Comment added successfully', review });
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
    const userRole = req.user.type.role;

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

    if (userRole === 'admin') {
      commentToUpdate.text = comment.text;
    } else {

      if (commentToUpdate.userId.toString() !== userId.toString()) {
        return res.status(403).json({ error: 'You can only update your own comments' });
      }

      if (!comment || typeof comment.text !== 'string' || comment.text.trim() === '') {
        return res.status(400).json({ error: 'Please provide a valid comment text.' });
      }

      commentToUpdate.text = comment.text;
    }

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
    const userRole = req.user.type.role;

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

    if (userRole === 'admin') {
      review.comments.splice(commentIndex, 1);
    } else {
      if (review.comments[commentIndex].userId.toString() !== userId) {
        return res.status(403).json({ error: 'You are not authorized to delete this comment' });
      }
      review.comments.splice(commentIndex, 1);
    }

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

module.exports = { indexProfessor, getProfessor, addProfessorCourse, removeProfessorCourse, getProfessorReviews, createProfessorReview, updateProfessorReview, deleteProfessorReview, addProfessorToBookmarks, removeProfessorFromBookmarks, addProfessorComment, updateProfessorComment, removeProfessorComment }