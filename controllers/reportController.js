const User = require('../models/user')
const Report = require('../models/report');
const ProfessorAccount = require('../models/professorAccount');

const indexReviewReport = async (req, res) => {

  try {
    const { page = 1, limit } = req.query;
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
    };

    const reports = await Report.find()
      .populate('reporterId')
      .populate('professorId')
      .skip((options.page - 1) * options.limit)
      .limit(options.limit);

    if (reports.length === 0) {
      return res.status(404).json({ message: 'No reports found' });
    }

    const totalReports = await Report.countDocuments();

    res.status(200).json({
      reports,
      totalReports,
      currentPage: options.page,
      totalPages: Math.ceil(totalReports / options.limit),
    });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching review reports', error: err.message });
  }
};


const createReviewReport = async (req, res) => {
  try {
    const { professorId, reviewId } = req.params;
    const { reportReason, category } = req.body;
    const userId = req.user.type.Id

    const professor = await ProfessorAccount.findById(professorId)
    const user = await User.findById(userId)

    if (!professor) {
      return res.status(404).json({ error: 'Professor not found' });
    }
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    const reviewInDatabase = professor.reviews.map((review => review._id === reviewId))

    if (!reviewInDatabase) {
      return res.status(404).json({ error: 'Review not found' });
    }

    const newReport = new Report({
      reporterId: userId,
      professorId: professorId,
      reviewId: reviewId,
      reportReason,
      category: category,
      status: 'pending'
    });
    await newReport.save();
    res.status(201).json(newReport);
  } catch (err) {
    res.status(500).json({ message: 'Error creating review report', error: err.message });
  }
};

const updateReviewReport = async (req, res) => {
  try {
    const { reportId } = req.params;
    const { status, reportReason, category } = req.body;

    const report = await Report.findById(reportId)
      .populate('reporterId')
      .populate('professorId');

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    if (status) {
      report.status = status;
    }
    if (reportReason) {
      report.reportReason = reportReason;
    }
    if (category) {
      report.category = category;
    }

    await report.save();

    res.status(200).json({ message: 'Report updated successfully', report });
  } catch (err) {
    console.log(err)
    res.status(500).json({ message: 'Error updating review report', error: err.message });
  }
};

const deleteReviewReport = async (req, res) => {
  try {
    const { reportId } = req.params;
    const report = await Report.findByIdAndDelete(reportId);

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    res.status(200).json({ message: 'Report deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting review report', error: err.message });
  }
};



module.exports = { indexReviewReport, createReviewReport, updateReviewReport, deleteReviewReport };
