const express = require('express');
const reportsController = require('../controllers/reportsController');
const authController = require('../controllers/authController');

const router = express.Router();

// Protect all routes
router.use(authController.protect);

// Business summary report
router.get('/summary', reportsController.getBusinessSummary);

// Location performance report
router.get('/location/:locationId', reportsController.getLocationPerformance);

// Product performance report
router.get('/products', reportsController.getProductPerformance);

// Daily sales report
router.get('/daily-sales', reportsController.getDailySales);

module.exports = router;
