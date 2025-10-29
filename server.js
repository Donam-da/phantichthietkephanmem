const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config({ path: './config.env' });
const classroomScheduler = require('./services/classroomScheduler');
const path = require('path');

const app = express();

// Trust the first proxy - Important for rate limiting behind a proxy (e.g., Heroku, Vercel)
app.set('trust proxy', 1);

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 1000, // Tăng giới hạn lên 1000 yêu cầu cho môi trường phát triển
  message: 'Quá nhiều yêu cầu từ IP này, vui lòng thử lại sau 15 phút.'
});
app.use(limiter);

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/credit_registration')
  .then(() => console.log('MongoDB connected successfully'))
  .catch(err => console.error('MongoDB connection error:', err));

// Start the classroom scheduler
classroomScheduler();

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/courses', require('./routes/courses'));
app.use('/api/registrations', require('./routes/registrations'));
app.use('/api/semesters', require('./routes/semesters'));
app.use('/api/schools', require('./routes/schools'));
app.use('/api/classrooms', require('./routes/classrooms'));
app.use('/api/subjects', require('./routes/subjects'));
app.use('/api/change-requests', require('./routes/changeRequests'));
app.use('/api/health', require('./routes/health'));
app.use('/api/logs', require('./routes/logs'));

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static('client/build'));
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'client', 'build', 'index.html'));
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
