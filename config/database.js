const mongoose = require('mongoose');
const AuditTrail = require('../models/auditTrail')

mongoose.connect(process.env.DATABASE_URL);

mongoose.connection.on('connected', () => {
  console.log(`Connected to MongoDB ${mongoose.connection.name}.`);

  const client = mongoose.connection.client;

  const collectionsToWatch = [
    'adminaccounts',
    'courses',
    'departments',
    'institutions',
    'notifications',
    'professoraccounts',
    'reports',
    'studentaccounts',
    'users'
  ];

  collectionsToWatch.forEach((collectionName) => {
    const collection = client.db().collection(collectionName);

    const changeStream = collection.watch([], { fullDocument: 'updateLookup' });

    changeStream.on('change', (change) => {
      if (collectionName === 'audittrails') return;

      const auditRecord = {
        collectionName: collectionName,
        operationType: change.operationType,
        documentKey: change.documentKey,
        fullDocument: change.operationType === 'delete' ? null : change.fullDocument || null,
        updateDescription: change.operationType === 'delete' ? null : change.updateDescription || null,
        timestamp: new Date(),
        uniqueId: `${collectionName}-${change.documentKey._id}-${new Date().toISOString()}`, 
      };

      AuditTrail.create(auditRecord)
        .then(() => {
          console.log(`Audit trail for ${change.operationType} operation in ${collectionName} saved.`);
        })
        .catch((err) => {
          console.error("Error saving audit trail:", err);
        });
    });

    changeStream.on('error', (error) => {
      console.error('Change stream error:', error);
    });
  });
});

mongoose.connection.on('error', (err) => {
  console.error(`Error connecting to MongoDB: ${err}`);
});

