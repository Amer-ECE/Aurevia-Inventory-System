const express = require('express');

const authController = require('../controllers/authController');
const userController = require('../controllers/userController');

const router = express.Router();

router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.get('/logout', authController.logout);

router.get('/me', userController.getMe, userController.getUser);
router.patch('/updateMe', userController.updateMe);

router
  .route('/')
  .post(userController.createUser)
  .get(userController.getAllUsers);

router.route('/:id').get(userController.getUser).patch(userController.updateMe);

module.exports = router;
