const mongoose = require('mongoose');
require('dotenv').config({ path: './backend/.env' });

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const Prediction = require('./backend/models/Prediction');
  
  const count = await Prediction.countDocuments();
  const withUser = await Prediction.countDocuments({ userId: { $ne: null } });
  const noUser = await Prediction.countDocuments({ userId: null });
  const recent = await Prediction.find().sort({ createdAt: -1 }).limit(5)
    .select('userId crop diseaseName createdAt imageHash');
  
  console.log('=== Prediction Debug ===');
  console.log('Total records:', count);
  console.log('With userId (linked to user):', withUser);
  console.log('Without userId (guest/broken):', noUser);
  console.log('\nRecent 5:');
  recent.forEach(r => {
    console.log(`  - ${r.crop} | ${r.diseaseName} | userId: ${r.userId || 'NULL'} | ${r.createdAt}`);
  });
  
  mongoose.disconnect();
  process.exit(0);
}).catch(err => {
  console.error('DB Error:', err.message);
  process.exit(1);
});
