const express = require("express");
const router = express.Router();


const { getAllInstitutesSearchHistory, deleteInstituteSearchHistory, addInstituteSearchHistory, getAllProfessorsSearchHistory, deleteProfessorSearchHistory, addProfessorSearchHistory } = require('../controllers/searchController');

router.get('/institutes', getAllInstitutesSearchHistory);

router.delete('/institutes', deleteInstituteSearchHistory);

router.post('/institutes', addInstituteSearchHistory);

router.get('/professors', getAllProfessorsSearchHistory);

router.delete('/professors', deleteProfessorSearchHistory);

router.post('/professors', addProfessorSearchHistory);


module.exports = router;
