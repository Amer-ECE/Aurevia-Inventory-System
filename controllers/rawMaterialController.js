const mongoose = require('mongoose');

const RawMaterial = require('../models/rawMaterialModel');
const Stock = require('../models/stockModel');
const Location = require('../models/locationModel');
const factory = require('../utils/handleFactory');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

exports.createRawMaterial = catchAsync(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Create raw material
    const rawMaterial = await RawMaterial.create(
      [
        {
          ...req.body,
          createdBy: req.user.id,
        },
      ],
      { session }
    );

    // Create stock records for all active locations
    const locations = await Location.find({ isActive: true });
    const stockRecords = locations.map((loc) => ({
      itemType: 'raw_material',
      itemId: rawMaterial[0]._id,
      itemModel: 'RawMaterial',
      locationId: loc._id,
      quantity: 0,
      batches: [],
    }));

    if (stockRecords.length > 0) {
      await Stock.insertMany(stockRecords, { session });
    }

    await session.commitTransaction();

    res.status(201).json({
      status: 'success',
      data: {
        data: rawMaterial[0],
      },
    });
  } catch (error) {
    await session.abortTransaction();
    return next(new AppError(error.message, 400));
  } finally {
    session.endSession();
  }
});

exports.getAllRawMaterials = factory.getAll(RawMaterial);
exports.getRawMaterial = factory.getOne(RawMaterial);
exports.updateRawMaterial = factory.updateOne(RawMaterial);
exports.deleteRawMaterial = factory.deleteOne(RawMaterial);
