const User = require("../models/user")
const Institution = require("../models/institution");
const ProfessorAccount = require("../models/professorAccount");


const getAllInstitutesSearchHistory = async (req, res, next) => {

  try {

    const userId = req.user.type.Id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const institutionHistory = user.searchHistory.filter(history => history.searchTerm === 'institution')
      .sort((a, b) => b.timestamp - a.timestamp);

    res.status(200).json({ institutionHistory });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

const deleteInstituteSearchHistory = async (req, res, next) => {
  try {
    const { searchText } = req.body;
    const userId = req.user.type.Id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!searchText) {
      return res.status(400).json({ error: 'searchText is required' });
    }

    const searchTermIndex = user.searchHistory.findIndex(history =>
      history.searchText === searchText && history.searchTerm === 'institution'
    );

    if (searchTermIndex === -1) {
      return res.status(404).json({ error: 'Institution not found in search history' });
    }

    user.searchHistory.splice(searchTermIndex, 1);
    await user.save();

    res.status(200).json({ message: 'Institution removed from search history' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


const addInstituteSearchHistory = async (req, res, next) => {

  try {

    const { text, institutionId } = req.body;
    const userId = req.user.type.Id;

    const user = await User.findById(userId);
    const institution = institutionId ? await Institution.findById(institutionId) : null;

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (institutionId && !institution) {
      return res.status(404).json({ error: 'Institution not found' });

    }

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    user.searchHistory.push({
      searchText: text,
      searchTerm: 'institution',
      searchTermId: institutionId || null,
      timestamp: new Date()
    });
    await user.save();

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

const getAllProfessorsSearchHistory = async (req, res, next) => {

  try {

    const userId = req.user.type.Id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const professorHistory = user.searchHistory.filter(history => history.searchTerm === 'professor')
      .sort((a, b) => b.timestamp - a.timestamp);
    res.status(200).json({ professorHistory });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

const deleteProfessorSearchHistory = async (req, res, next) => {
  try {
    const { searchText } = req.body;
    const userId = req.user.type.Id;
    
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!searchText) {
      return res.status(400).json({ error: 'searchText is required' });
    }

    const searchTermIndex = user.searchHistory.findIndex(history =>
      history.searchText === searchText && history.searchTerm === 'professor'
    );

    if (searchTermIndex === -1) {
      return res.status(404).json({ error: 'Professor not found in search history' });
    }

    user.searchHistory.splice(searchTermIndex, 1);
    await user.save();

    res.status(200).json({ message: 'Professor removed from search history' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};



const addProfessorSearchHistory = async (req, res, next) => {

  try {

    const { text, professorId } = req.body;
    const userId = req.user.type.Id;

    const user = await User.findById(userId);
    const professor = professorId ? await ProfessorAccount.findById(professorId) : null;

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (professorId && !professor) {
      return res.status(404).json({ error: 'Professor not found' });
    }

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    user.searchHistory.push({
      searchText: text,
      searchTerm: 'professor',
      searchTermId: professorId || null,
      timestamp: new Date()
    });
    await user.save();

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = { getAllInstitutesSearchHistory, deleteInstituteSearchHistory, addInstituteSearchHistory, getAllProfessorsSearchHistory, deleteProfessorSearchHistory, addProfessorSearchHistory }
