const mongoose = require('mongoose');

const Expense = require('../models/expenseModel');
const Capital = require('../models/capitalModel');
const CapitalTransaction = require('../models/capitalTransactionModel');
const factory = require('../utils/handleFactory');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

exports.createExpense = catchAsync(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Create expense
    const expense = await Expense.create(
      [
        {
          ...req.body,
          createdBy: req.user.id,
        },
      ],
      { session },
    );

    // Pay from capital if requested
    if (req.body.paidFromCapital) {
      const capital = await Capital.getCapital();

      if (capital.balance < expense[0].amount) {
        throw new AppError('Insufficient capital', 400);
      }

      const before = capital.balance;
      capital.balance -= expense[0].amount;
      await capital.save({ session });

      const transaction = await CapitalTransaction.create(
        [
          {
            type: 'expense_payment',
            amount: -expense[0].amount,
            balanceBefore: before,
            balanceAfter: capital.balance,
            reference: {
              type: 'expense',
              id: expense[0]._id,
              number: expense[0].expenseNumber,
            },
            description:
              expense[0].description || `Payment for ${expense[0].type}`,
            createdBy: req.user.id,
          },
        ],
        { session },
      );

      expense[0].capitalTransactionId = transaction[0]._id;
      await expense[0].save({ session });
    }

    await session.commitTransaction();

    res.status(201).json({
      status: 'success',
      data: {
        data: expense[0],
      },
    });
  } catch (error) {
    await session.abortTransaction();
    return next(new AppError(error.message, 400));
  } finally {
    session.endSession();
  }
});

exports.getAllExpenses = factory.getAll(Expense);
exports.getExpense = factory.getOne(Expense);
exports.updateExpense = factory.updateOne(Expense);
exports.deleteExpense = factory.deleteOne(Expense);

// Get expenses by location
exports.getExpensesByLocation = catchAsync(async (req, res, next) => {
  const expenses = await Expense.find({ location: req.params.locationId }).sort(
    '-expenseDate',
  );

  const total = expenses.reduce((sum, e) => sum + e.amount, 0);

  res.status(200).json({
    status: 'success',
    data: {
      total,
      count: expenses.length,
      expenses,
    },
  });
});
