const dotenv = require('dotenv');
dotenv.config({ path: './config.env' });

const mongoose = require('mongoose');
const http = require('http');
const app = require('./app');

const server = http.createServer(app);

process.on('uncaughtException', (err) => {
  console.log('UNCAUGHT EXCEPTION! Shutting down...');
  console.log(err.name, err.message);
  process.exit(1);
});

const DB = process.env.DATABASE.replace(
  '<db_password>',
  process.env.DATABASE_PASSWORD
);

mongoose.connect(DB, {}).then(() => {
  console.log('DB connected successfully');
});

const port = process.env.PORT || 5000;

server.listen(port, () => {
  console.log(`App running on port ${port}...`);
});

process.on('unhandledRejection', (err) => {
  console.log('UNHANDLER REJECTION! Shutting down...');
  console.log(err.name, err.message);

  ServiceWorkerRegistration.close(() => {
    process.exit(1);
  });
});

// const dotenv = require('dotenv');
// dotenv.config({ path: './config.env' });

// const mongoose = require('mongoose');
// const http = require('http');
// const app = require('./app');

// const server = http.createServer(app);

// process.on('uncaughtException', (err) => {
//   console.log('UNCAUGHT EXCEPTION! Shutting down...');
//   console.log(err.name, err.message);
//   process.exit(1);
// });

// // Add connection error handling
// const DB = process.env.DATABASE.replace(
//   '<db_password>',
//   process.env.DATABASE_PASSWORD
// );

// mongoose
//   .connect(DB, {})
//   .then(() => {
//     console.log('DB connected successfully');
//   })
//   .catch((err) => {
//     console.log('DB connection failed:', err.message);
//   });

// const port = process.env.PORT || 5000;

// server.listen(port, () => {
//   console.log(`App running on port ${port}...`);
// });

// process.on('unhandledRejection', (err) => {
//   console.log('UNHANDLER REJECTION! Shutting down...');
//   console.log(err.name, err.message);

//   // Fixed the typo here
//   server.close(() => {
//     process.exit(1);
//   });
// });
