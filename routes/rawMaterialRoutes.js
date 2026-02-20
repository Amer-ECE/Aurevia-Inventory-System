const express = require('express');
const rawMaterialController = require('../controllers/rawMaterialController');
const authController = require('../controllers/authController');

const router = express.Router();

router.use(authController.protect);

router
  .route('/')
  .get(rawMaterialController.getAllRawMaterials)
  .post(rawMaterialController.createRawMaterial);

router
  .route('/:id')
  .get(rawMaterialController.getRawMaterial)
  .patch(rawMaterialController.updateRawMaterial)
  .delete(rawMaterialController.deleteRawMaterial);

module.exports = router;
