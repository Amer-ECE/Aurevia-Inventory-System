const express = require('express');
const authController = require('../controllers/authController');
const locationController = require('../controllers/locationController');

const router = express.Router();

router.use(authController.protect);

router
  .route('/')
  .post(locationController.createLocation)
  .get(locationController.getLocations);

router
  .route('/:id')
  .patch(locationController.updateLocation)
  .get(locationController.getLocation);

module.exports = router;
