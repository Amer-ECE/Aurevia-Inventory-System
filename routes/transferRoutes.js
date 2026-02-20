const express = require('express');
const transferController = require('../controllers/transferController');
const authController = require('../controllers/authController');

const router = express.Router();

router.use(authController.protect);

// Transfer stock between locations
router
  .route('/')
  .post(transferController.transferStock)
  .get(transferController.getTransfers);

// Get transfers for a specific item
router
  .route('/item/:itemType/:itemId')
  .get(transferController.getItemTransfers);

// Get transfers between two specific locations
router.route('/between/:from/:to').get(transferController.getTransfersBetween);

module.exports = router;
