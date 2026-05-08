const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const connectDB = async () => {
  try {
    const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/agroai';
    const isProduction = process.env.NODE_ENV === 'production';
    
    console.log(`Attempting to connect to MongoDB at: ${uri}`);
    
    try {
      // Connection attempt with appropriate timeout
      const timeout = isProduction ? 10000 : 5000;
      const conn = await mongoose.connect(uri, { 
        serverSelectionTimeoutMS: timeout,
        socketTimeoutMS: 45000,
      });
      console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
      console.log(`   Database: ${conn.connection.name}`);
      return conn;
    } catch (err) {
      console.error(`❌ Failed to connect to MongoDB: ${err.message}`);
      
      // Only allow in-memory fallback in development
      if (!isProduction) {
        console.log(`\n📦 Falling back to In-Memory MongoDB for development...`);
        const mongoServer = await MongoMemoryServer.create();
        const memoryUri = mongoServer.getUri();
        const conn = await mongoose.connect(memoryUri);
        console.log(`✅ In-Memory MongoDB Connected!`);
        console.log(`⚠️  WARNING: Data will be lost when the server stops!`);
        console.log(`   For production, set MONGO_URI environment variable.`);
        return conn;
      } else {
        throw err; // Production: fail if no MongoDB
      }
    }
  } catch (error) {
    console.error(`\n🚨 FATAL: Could not connect to MongoDB`);
    console.error(`   Error: ${error.message}`);
    console.error(`   Please ensure MongoDB is running or MONGO_URI is set.`);
    process.exit(1);
  }
};

module.exports = connectDB;
