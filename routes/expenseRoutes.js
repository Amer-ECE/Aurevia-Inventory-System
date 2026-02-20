const express = require('express');
const expenseController = require('../controllers/expenseController');
const authController = require('../controllers/authController');

const router = express.Router();

router.use(authController.protect);

router
  .route('/')
  .get(expenseController.getAllExpenses)
  .post(expenseController.createExpense);

router
  .route('/location/:locationId')
  .get(expenseController.getExpensesByLocation);

router
  .route('/:id')
  .get(expenseController.getExpense)
  .patch(expenseController.updateExpense)
  .delete(expenseController.deleteExpense);

module.exports = router;
