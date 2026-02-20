const express = require('express');
const capitalController = require('../controllers/capitalController');
const authController = require('../controllers/authController');

const router = express.Router();

router.use(authController.protect);

router.route('/').get(capitalController.getCapital);

router.route('/add').post(capitalController.addToCapital);

router.route('/transactions').get(capitalController.getCapitalTransactions);

router.route('/summary').get(capitalController.getCapitalSummary);

module.exports = router;
