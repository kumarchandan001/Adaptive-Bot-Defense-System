import http from 'http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { Server as SocketIOServer } from 'socket.io';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { apiRouter } from './routes/index.js';
import { ipLimiter, routeLimiter, botDetection } from './middleware/botDetection.js';
import { createIoEmitter } from './services/realtime.js';
import { initConfig } from './config/index.js';

dotenv.config();
const config = initConfig();

const app = express();
app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    if (config.corsAllowAll) return callback(null, true);
    if (!origin) return callback(null, true);
    if (config.corsOrigins?.length > 0 && config.corsOrigins.includes(origin)) return callback(null, true);
    if (config.corsOrigin && origin === config.corsOrigin) return callback(null, true);
    return callback(new Error('CORS not allowed'));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-js-ok'],
  credentials: true,
  optionsSuccessStatus: 204
}));
app.options('*', cors({
  origin: (origin, callback) => {
    if (config.corsAllowAll) return callback(null, true);
    if (!origin) return callback(null, true);
    if (config.corsOrigins?.length > 0 && config.corsOrigins.includes(origin)) return callback(null, true);
    if (config.corsOrigin && origin === config.corsOrigin) return callback(null, true);
    return callback(new Error('CORS not allowed'));
  },
  allowedHeaders: ['Content-Type', 'Authorization', 'x-js-ok'],
  credentials: true,
  optionsSuccessStatus: 204
}));
app.use(express.json());
app.use(cookieParser());
app.use(ipLimiter);
app.use(routeLimiter);
app.use(botDetection());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.use('/api', apiRouter);

const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: (origin, callback) => {
      if (config.corsAllowAll) return callback(null, true);
      if (!origin) return callback(null, true);
      if (config.corsOrigins?.length > 0 && config.corsOrigins.includes(origin)) return callback(null, true);
      if (config.corsOrigin && origin === config.corsOrigin) return callback(null, true);
      return callback(new Error('CORS not allowed'));
    },
    methods: ['GET', 'POST'],
    allowedHeaders: ['Authorization', 'Content-Type'],
    credentials: true
  }
});
createIoEmitter(io);

async function start () {
  try {
    // MongoDB connection logging
    console.log('🔄 Connecting to MongoDB...');
    console.log(`📍 MongoDB URI: ${config.mongoUri}`);
    console.log(`🗄️  Database: ${config.mongoDbName}`);
    
    // Set up MongoDB connection event listeners
    mongoose.connection.on('connecting', () => {
      console.log('🔄 MongoDB: Connecting...');
    });
    
    mongoose.connection.on('connected', () => {
      console.log('✅ MongoDB: Connected successfully');
      console.log(`📍 Connected to: ${mongoose.connection.host}:${mongoose.connection.port}`);
      console.log(`🗄️  Database: ${mongoose.connection.name}`);
    });
    
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB: Connection error:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.log('⚠️  MongoDB: Disconnected');
    });
    
    mongoose.connection.on('reconnected', () => {
      console.log('🔄 MongoDB: Reconnected');
    });
    
    // Connect to MongoDB
    await mongoose.connect(config.mongoUri, { 
      dbName: config.mongoDbName,
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
    });
    
    // Start the server with better error handling
    server.listen(config.port, () => {
      console.log('🚀 BotDetector API Server Started');
      console.log(`📍 Server: http://localhost:${config.port}`);
      console.log(`🔗 Health Check: http://localhost:${config.port}/api/health`);
      console.log(`📊 Payment API: http://localhost:${config.port}/api/payment`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    });
    
    // Handle server errors
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`❌ Port ${config.port} is already in use`);
        console.error('💡 Try one of these solutions:');
        console.error('   1. Kill the process using the port: lsof -ti:4000 | xargs kill -9');
        console.error('   2. Use a different port by setting PORT environment variable');
        console.error('   3. Wait for the other process to finish');
      } else {
        console.error('❌ Server error:', err);
      }
      process.exit(1);
    });
    
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    console.error('💡 Make sure MongoDB is running and accessible');
    process.exit(1);
  }
}

start();

// Graceful shutdown handling
process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT. Graceful shutdown...');
  try {
    await mongoose.connection.close();
    console.log('✅ MongoDB connection closed');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error during shutdown:', err);
    process.exit(1);
  }
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM. Graceful shutdown...');
  try {
    await mongoose.connection.close();
    console.log('✅ MongoDB connection closed');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error during shutdown:', err);
    process.exit(1);
  }
});



