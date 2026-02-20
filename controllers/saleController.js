const mongoose = require('mongoose');

const Sale = require('../models/saleModel');
const Stock = require('../models/stockModel');
const Capital = require('../models/capitalModel');
const CapitalTransaction = require('../models/capitalTransactionModel');
const Movement = require('../models/movementModel');
const Product = require('../models/productModel');
const BillOfMaterial = require('../models/billOfMaterialModel');
const factory = require('../utils/handleFactory');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

exports.createSale = catchAsync(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { location, items } = req.body;
    let totalCOGS = 0;

    // Check stock and calculate costs
    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) {
        throw new AppError(`Product not found: ${item.product}`, 400);
      }

      const stock = await Stock.findOne({
        itemType: 'product',
        itemId: item.product,
        locationId: location,
      }).session(session);

      if (!stock || stock.quantity < item.quantity) {
        throw new AppError(`Insufficient stock for ${product.name}`, 400);
      }

      // Use FIFO to get cost
      let remainingToSell = item.quantity;
      let itemCost = 0;

      const sortedBatches = [...stock.batches].sort(
        (a, b) => new Date(a.receivedDate) - new Date(b.receivedDate),
      );

      for (let i = 0; i < sortedBatches.length && remainingToSell > 0; i++) {
        const batch = sortedBatches[i];
        const takeFromBatch = Math.min(batch.quantity, remainingToSell);
        itemCost += takeFromBatch * batch.unitCost;
        batch.quantity -= takeFromBatch;
        remainingToSell -= takeFromBatch;
      }

      stock.batches = stock.batches.filter((b) => b.quantity > 0);
      stock.quantity -= item.quantity;
      await stock.save({ session });

      item.cost = itemCost / item.quantity;
      totalCOGS += itemCost;
    }

    // Create sale
    const subtotal = items.reduce((sum, i) => sum + i.quantity * i.price, 0);
    const profit = subtotal - totalCOGS;

    const sale = await Sale.create(
      [
        {
          ...req.body,
          subtotal,
          costOfGoodsSold: totalCOGS,
          profit,
          createdBy: req.user.id,
        },
      ],
      { session },
    );

    // Update capital
    const capital = await Capital.getCapital();
    const before = capital.balance;
    capital.balance += profit;
    await capital.save({ session });

    const transaction = await CapitalTransaction.create(
      [
        {
          type: 'sale_revenue',
          amount: profit,
          balanceBefore: before,
          balanceAfter: capital.balance,
          reference: {
            type: 'sale',
            id: sale[0]._id,
            number: sale[0].invoiceNumber,
          },
          description: `Sale profit: ${sale[0].invoiceNumber}`,
          createdBy: req.user.id,
        },
      ],
      { session },
    );

    sale[0].capitalTransactionId = transaction[0]._id;
    await sale[0].save({ session });

    await session.commitTransaction();

    res.status(201).json({
      status: 'success',
      data: {
        data: sale[0],
        profit,
      },
    });
  } catch (error) {
    await session.abortTransaction();
    return next(new AppError(error.message, 400));
  } finally {
    session.endSession();
  }
});

exports.getAllSales = factory.getAll(Sale);
exports.getSale = factory.getOne(Sale);
exports.updateSale = factory.updateOne(Sale);
exports.deleteSale = factory.deleteOne(Sale);

// Get sales by location
exports.getSalesByLocation = catchAsync(async (req, res, next) => {
  const sales = await Sale.find({ location: req.params.locationId })
    .populate('items.product', 'name model')
    .sort('-saleDate');

  const total = sales.reduce((sum, s) => sum + s.total, 0);
  const totalProfit = sales.reduce((sum, s) => sum + (s.profit || 0), 0);

  res.status(200).json({
    status: 'success',
    data: {
      total,
      totalProfit,
      count: sales.length,
      sales,
    },
  });
});
