const mongoose = require('mongoose');

const Capital = require('../models/capitalModel');
const CapitalTransaction = require('../models/capitalTransactionModel');
const factory = require('../utils/handleFactory');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

// Get current capital
exports.getCapital = catchAsync(async (req, res, next) => {
  const capital = await Capital.getCapital();

  res.status(200).json({
    status: 'success',
    data: {
      data: capital,
    },
  });
});

// Add money to capital (owner injection)
exports.addToCapital = catchAsync(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { amount, description } = req.body;

    if (amount <= 0) {
      return next(new AppError('Amount must be positive', 400));
    }

    const capital = await Capital.getCapital();
    const before = capital.balance;

    capital.balance += amount;
    capital.lastUpdated = new Date();
    await capital.save({ session });

    const transaction = await CapitalTransaction.create(
      [
        {
          type: 'owner_injection',
          amount,
          balanceBefore: before,
          balanceAfter: capital.balance,
          description: description || 'Owner capital injection',
          createdBy: req.user.id,
        },
      ],
      { session },
    );

    await session.commitTransaction();

    res.status(200).json({
      status: 'success',
      data: {
        capital: capital.balance,
        transaction: transaction[0],
      },
    });
  } catch (error) {
    await session.abortTransaction();
    return next(new AppError(error.message, 400));
  } finally {
    session.endSession();
  }
});

// Get capital transactions
exports.getCapitalTransactions = factory.getAll(CapitalTransaction);

// Get capital summary
exports.getCapitalSummary = catchAsync(async (req, res, next) => {
  const capital = await Capital.getCapital();

  const transactions = await CapitalTransaction.aggregate([
    {
      $group: {
        _id: '$type',
        total: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
  ]);

  const summary = {
    currentBalance: capital.balance,
    initialCapital: capital.initialCapital,
    transactions: transactions.reduce((acc, t) => {
      acc[t._id] = { total: t.total, count: t.count };
      return acc;
    }, {}),
  };

  res.status(200).json({
    status: 'success',
    data: summary,
  });
});
