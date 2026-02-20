const express = require('express');
const productionOrderController = require('../controllers/productionOrderController');
const authController = require('../controllers/authController');

const router = express.Router();

router.use(authController.protect);

router
  .route('/')
  .get(productionOrderController.getAllProductionOrders)
  .post(productionOrderController.createProductionOrder);

router
  .route('/check-availability')
  .post(productionOrderController.checkAvailability);

router
  .route('/:id/complete')
  .patch(productionOrderController.completeProduction);

router
  .route('/:id')
  .get(productionOrderController.getProductionOrder)
  .patch(productionOrderController.updateProductionOrder)
  .delete(productionOrderController.deleteProductionOrder);

module.exports = router;
