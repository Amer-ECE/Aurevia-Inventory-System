const express = require('express');
const movementController = require('../controllers/movementController');
const authController = require('../controllers/authController');

const router = express.Router();

router.use(authController.protect);

router.route('/').get(movementController.getAllMovements);

router
  .route('/item/:itemType/:itemId')
  .get(movementController.getItemMovements);

router.route('/date-range').get(movementController.getMovementsByDate);

router.route('/:id').get(movementController.getMovement);

module.exports = router;
