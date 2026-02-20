const express = require('express');
const purchaseOrderController = require('../controllers/purchaseOrderController');
const authController = require('../controllers/authController');

const router = express.Router();

router.use(authController.protect);

router
  .route('/')
  .get(purchaseOrderController.getAllPurchaseOrders)
  .post(purchaseOrderController.createPurchaseOrder);

router.route('/:id/pay').patch(purchaseOrderController.payPurchaseOrder);

router
  .route('/:id/receive')
  .patch(purchaseOrderController.receivePurchaseOrder);

router
  .route('/:id')
  .get(purchaseOrderController.getPurchaseOrder)
  .patch(purchaseOrderController.updatePurchaseOrder)
  .delete(purchaseOrderController.deletePurchaseOrder);

module.exports = router;
