const mongoose = require('mongoose');

const Stock = require('../models/stockModel');
const Movement = require('../models/movementModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

// @desc    Transfer stock between locations
// @route   POST /api/v1/transfers
// @access  Private
exports.transferStock = catchAsync(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      itemType, // 'product' or 'raw_material'
      itemId,
      fromLocation,
      toLocation,
      quantity,
      notes,
    } = req.body;

    // 1. Validate input
    if (!itemType || !itemId || !fromLocation || !toLocation || !quantity) {
      return next(new AppError('Please provide all required fields', 400));
    }

    if (quantity <= 0) {
      return next(new AppError('Quantity must be positive', 400));
    }

    if (fromLocation === toLocation) {
      return next(
        new AppError('Source and destination cannot be the same', 400),
      );
    }

    // 2. Check source stock
    const sourceStock = await Stock.findOne({
      itemType,
      itemId,
      locationId: fromLocation,
    }).session(session);

    if (!sourceStock) {
      return next(new AppError('No stock found at source location', 404));
    }

    if (sourceStock.quantity < quantity) {
      return next(
        new AppError(
          `Insufficient stock. Available: ${sourceStock.quantity}`,
          400,
        ),
      );
    }

    // 3. Get or create destination stock
    let destStock = await Stock.findOne({
      itemType,
      itemId,
      locationId: toLocation,
    }).session(session);

    if (!destStock) {
      // Create new stock record if doesn't exist
      destStock = new Stock({
        itemType,
        itemId,
        itemModel: itemType === 'product' ? 'Product' : 'RawMaterial',
        locationId: toLocation,
        quantity: 0,
        batches: [],
      });
    }

    // 4. Transfer batches (FIFO - take oldest batches first)
    const transferredBatches = [];
    let remainingToTransfer = quantity;

    // Sort source batches by date (oldest first)
    const sortedBatches = [...sourceStock.batches].sort(
      (a, b) => new Date(a.receivedDate) - new Date(b.receivedDate),
    );

    for (let i = 0; i < sortedBatches.length && remainingToTransfer > 0; i++) {
      const batch = sortedBatches[i];
      const transferFromBatch = Math.min(batch.quantity, remainingToTransfer);

      transferredBatches.push({
        batchNumber: batch.batchNumber,
        quantity: transferFromBatch,
        unitCost: batch.unitCost,
        receivedDate: batch.receivedDate,
      });

      batch.quantity -= transferFromBatch;
      remainingToTransfer -= transferFromBatch;
    }

    // Remove empty batches from source
    sourceStock.batches = sourceStock.batches.filter((b) => b.quantity > 0);
    sourceStock.quantity -= quantity;
    await sourceStock.save({ session });

    // Add batches to destination
    for (const tb of transferredBatches) {
      destStock.batches.push({
        batchNumber: tb.batchNumber,
        quantity: tb.quantity,
        unitCost: tb.unitCost,
        receivedDate: tb.receivedDate,
      });
    }

    destStock.quantity += quantity;
    await destStock.save({ session });

    // 5. Create movement record
    const movement = await Movement.create(
      [
        {
          movementNumber: `TRF-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          itemType,
          itemId,
          itemName: req.body.itemName || 'Item',
          fromLocation,
          toLocation,
          quantity,
          unitCost: transferredBatches[0]?.unitCost || 0,
          totalCost: transferredBatches.reduce(
            (sum, b) => sum + b.quantity * b.unitCost,
            0,
          ),
          batchNumber: transferredBatches.map((b) => b.batchNumber).join(','),
          movementType: 'transfer',
          stockBefore: sourceStock.quantity + quantity,
          stockAfter: sourceStock.quantity,
          notes: notes || 'Stock transfer',
          createdBy: req.user.id,
        },
      ],
      { session },
    );

    await session.commitTransaction();

    res.status(200).json({
      status: 'success',
      data: {
        transfer: {
          fromLocation,
          toLocation,
          quantity,
          itemType,
          itemId,
        },
        sourceStock: {
          location: fromLocation,
          newQuantity: sourceStock.quantity,
        },
        destinationStock: {
          location: toLocation,
          newQuantity: destStock.quantity,
        },
        movement: movement[0],
      },
    });
  } catch (error) {
    await session.abortTransaction();
    return next(new AppError(error.message, 400));
  } finally {
    session.endSession();
  }
});

// @desc    Get transfer history
// @route   GET /api/v1/transfers
// @access  Private
exports.getTransfers = catchAsync(async (req, res, next) => {
  const movements = await Movement.find({
    movementType: 'transfer',
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

// @desc    Get transfers for a specific item
// @route   GET /api/v1/transfers/item/:itemType/:itemId
// @access  Private
exports.getItemTransfers = catchAsync(async (req, res, next) => {
  const { itemType, itemId } = req.params;

  const movements = await Movement.find({
    itemType,
    itemId,
    movementType: 'transfer',
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

// @desc    Get transfers between locations
// @route   GET /api/v1/transfers/between/:from/:to
// @access  Private
exports.getTransfersBetween = catchAsync(async (req, res, next) => {
  const { from, to } = req.params;

  const movements = await Movement.find({
    fromLocation: from,
    toLocation: to,
    movementType: 'transfer',
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
