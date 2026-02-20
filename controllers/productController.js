const mongoose = require('mongoose');

const Product = require('../models/productModel');
const Stock = require('../models/stockModel');
const Location = require('../models/locationModel');
const factory = require('../utils/handleFactory');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

exports.createProduct = catchAsync(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Create product
    const product = await Product.create(
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
      itemType: 'product',
      itemId: product[0]._id,
      itemModel: 'Product',
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
        data: product[0],
      },
    });
  } catch (error) {
    await session.abortTransaction();
    return next(new AppError(error.message, 400));
  } finally {
    session.endSession();
  }
});

exports.getAllProducts = factory.getAll(Product);
exports.getProduct = factory.getOne(Product);
exports.updateProduct = factory.updateOne(Product);
exports.deleteProduct = factory.deleteOne(Product);
