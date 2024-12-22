const express = require("express");
const router = express.Router();


const { indexReviewReport, createReviewReport, deleteReviewReport, updateReviewReport } = require('../controllers/reportController');


router.get('/review', indexReviewReport);

router.post('/:professorId/review/:reviewId', createReviewReport);

router.delete('/:reportId', deleteReviewReport);

router.put('/:reportId', updateReviewReport);


module.exports = router;
