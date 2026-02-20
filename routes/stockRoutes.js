const express = require('express');
const stockController = require('../controllers/stockController');
const authController = require('../controllers/authController');

const router = express.Router();

router.use(authController.protect);

router.route('/').get(stockController.getAllStocks);

router.route('/product/:productId').get(stockController.getProductStock);

router.route('/location/:locationId').get(stockController.getLocationStock);

router.route('/alerts/low').get(stockController.getLowStockAlerts);

router.route('/:id').get(stockController.getStock);

module.exports = router;
