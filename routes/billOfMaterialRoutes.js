const express = require('express');
const billOfMaterialController = require('../controllers/billOfMaterialController');
const authController = require('../controllers/authController');

const router = express.Router();

router.use(authController.protect);

router
  .route('/')
  .get(billOfMaterialController.getAllBOMs)
  .post(billOfMaterialController.createBOM);

router
  .route('/product/:productId/active')
  .get(billOfMaterialController.getActiveBOMByProduct);

router
  .route('/:id')
  .get(billOfMaterialController.getBOM)
  .patch(billOfMaterialController.updateBOM)
  .delete(billOfMaterialController.deleteBOM);

module.exports = router;
