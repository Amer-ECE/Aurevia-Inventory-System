const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const hpp = require('hpp');
const cors = require('cors');

const userRouter = require('./routes/userRoutes');
const locationRouter = require('./routes/locationRoutes');
const rawMaterialRoutes = require('./routes/rawMaterialRoutes');
const productRoutes = require('./routes/productRoutes');
const billOfMaterialRoutes = require('./routes/billOfMaterialRoutes');
const stockRoutes = require('./routes/stockRoutes');

const app = express();

// 1. GLOBAL MIDDLEWARE

// Security HTTP headers
app.use(helmet());

// Development logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Rate limiting - Prevent brute force attacks
const limiter = rateLimit({
  max: 100, // 100 requests per windowMs
  windowMs: 60 * 60 * 1000, // 1 hour
  message: 'Too many requests from this IP, please try again in an hour!',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// CORS - Enable Cross-Origin Resource Sharing
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true,
  })
);

// Body parser - Read data from body into req.body
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// HTTP Parameter Pollution protection
app.use(hpp());

// Data sanitization against XSS - Basic version
app.use((req, res, next) => {
  // Sanitize request body
  if (req.body) {
    Object.keys(req.body).forEach((key) => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = req.body[key].replace(
          /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
          ''
        );
      }
    });
  }

  // Sanitize query parameters
  if (req.query) {
    Object.keys(req.query).forEach((key) => {
      if (typeof req.query[key] === 'string') {
        req.query[key] = req.query[key].replace(
          /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
          ''
        );
      }
    });
  }
  next();
});

// Prevent NoSQL injection - Basic version
app.use((req, res, next) => {
  const sanitize = (obj) => {
    if (obj && typeof obj === 'object') {
      Object.keys(obj).forEach((key) => {
        // Remove MongoDB operators from request body
        if (key.startsWith('$') && typeof obj[key] === 'object') {
          delete obj[key];
        } else if (typeof obj[key] === 'object') {
          sanitize(obj[key]);
        }
      });
    }
    return obj;
  };

  if (req.body) sanitize(req.body);
  if (req.query) sanitize(req.query);
  next();
});

// 2. ROUTES
app.use('/api/v1/users', userRouter);
app.use('/api/v1/locations', locationRouter);
app.use('/api/v1/raw-materials', rawMaterialRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/boms', billOfMaterialRoutes);
app.use('/api/v1/stocks', stockRoutes);

// 3. HEALTH CHECK ROUTE
// app.get('/api/health', (req, res) => {
//   res.status(200).json({
//     status: 'success',
//     message: 'Server is healthy and running!',
//     timestamp: new Date().toISOString(),
//   });
// });

// 4. HANDLE UNDEFINED ROUTES
app.use((req, res) => {
  res.status(404).json({
    status: 'fail',
    message: `Can't find ${req.originalUrl} on this server!`,
  });
});

module.exports = app;
