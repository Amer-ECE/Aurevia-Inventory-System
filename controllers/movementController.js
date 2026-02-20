const Movement = require('../models/movementModel');
const factory = require('../utils/handleFactory');
const catchAsync = require('../utils/catchAsync');

exports.getAllMovements = factory.getAll(Movement);
exports.getMovement = factory.getOne(Movement);

// Get movements for a specific item
exports.getItemMovements = catchAsync(async (req, res, next) => {
  const { itemType, itemId } = req.params;

  const movements = await Movement.find({
    itemType,
    itemId,
  })
    .populate('fromLocation toLocation', 'name')
    .sort('-createdAt');

  res.status(200).json({
    status: 'success',
    results: movements.length,
    data: {
      data: movements,
    },
  });
});

// Get movements between dates
exports.getMovementsByDate = catchAsync(async (req, res, next) => {
  const { startDate, endDate } = req.query;

  const movements = await Movement.find({
    createdAt: {
      $gte: new Date(startDate),
      $lte: new Date(endDate),
    },
  })
    .populate('fromLocation toLocation', 'name')
    .sort('-createdAt');

  res.status(200).json({
    status: 'success',
    results: movements.length,
    data: {
      data: movements,
    },
  });
});
