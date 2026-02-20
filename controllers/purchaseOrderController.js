const mongoose = require('mongoose');

const PurchaseOrder = require('../models/purchaseOrderModel');
const Stock = require('../models/stockModel');
const Capital = require('../models/capitalModel');
const CapitalTransaction = require('../models/capitalTransactionModel');
const Movement = require('../models/movementModel');
const factory = require('../utils/handleFactory');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

exports.createPurchaseOrder = factory.createOne(PurchaseOrder);
exports.getAllPurchaseOrders = factory.getAll(PurchaseOrder);
exports.getPurchaseOrder = factory.getOne(PurchaseOrder);
exports.updatePurchaseOrder = factory.updateOne(PurchaseOrder);
exports.deletePurchaseOrder = factory.deleteOne(PurchaseOrder);

// Pay for purchase order (deduct from capital)
exports.payPurchaseOrder = catchAsync(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const purchaseOrder = await PurchaseOrder.findById(req.params.id);

    if (!purchaseOrder) {
      return next(new AppError('No purchase order found', 404));
    }

    if (purchaseOrder.paidFromCapital) {
      return next(new AppError('Purchase order already paid', 400));
    }

    const capital = await Capital.getCapital();

    if (capital.balance < purchaseOrder.grandTotal) {
      return next(new AppError('Insufficient capital', 400));
    }

    const before = capital.balance;
    capital.balance -= purchaseOrder.grandTotal;
    await capital.save({ session });

    const transaction = await CapitalTransaction.create(
      [
        {
          type: 'purchase_payment',
          amount: -purchaseOrder.grandTotal,
          balanceBefore: before,
          balanceAfter: capital.balance,
          reference: {
            type: 'purchase_order',
            id: purchaseOrder._id,
            number: purchaseOrder.orderNumber,
          },
          description: `Payment for ${purchaseOrder.orderNumber}`,
          createdBy: req.user.id,
        },
      ],
      { session },
    );

    purchaseOrder.paidFromCapital = true;
    purchaseOrder.capitalTransactionId = transaction[0]._id;
    await purchaseOrder.save({ session });

    await session.commitTransaction();

    res.status(200).json({
      status: 'success',
      data: {
        purchaseOrder,
        capitalBalance: capital.balance,
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

// Receive purchase order (update stock)
exports.receivePurchaseOrder = catchAsync(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const purchaseOrder = await PurchaseOrder.findById(req.params.id);

    if (!purchaseOrder) {
      return next(new AppError('No purchase order found', 404));
    }

    if (purchaseOrder.status === 'received') {
      return next(new AppError('Purchase order already received', 400));
    }

    // Allocate additional costs to items
    const additionalTotal =
      purchaseOrder.shipping +
      purchaseOrder.clearance +
      purchaseOrder.otherFees;
    const subtotal = purchaseOrder.subtotal;

    for (const item of purchaseOrder.items) {
      const itemProportion = item.totalCost / subtotal;
      const itemAdditional = additionalTotal * itemProportion;
      item.finalUnitCost = (item.totalCost + itemAdditional) / item.quantity;
    }

    // Update stock for each item
    for (const item of purchaseOrder.items) {
      let stock = await Stock.findOne({
        itemType: 'raw_material',
        itemId: item.rawMaterial,
        locationId: purchaseOrder.destinationLocation,
      }).session(session);

      if (!stock) {
        stock = new Stock({
          itemType: 'raw_material',
          itemId: item.rawMaterial,
          itemModel: 'RawMaterial',
          locationId: purchaseOrder.destinationLocation,
          quantity: 0,
          batches: [],
        });
      }

      // Add batch
      stock.batches.push({
        batchNumber: `PO-${purchaseOrder.orderNumber}`,
        quantity: item.quantity,
        unitCost: item.finalUnitCost,
        receivedDate: new Date(),
        purchaseOrderId: purchaseOrder._id,
      });

      stock.quantity += item.quantity;
      await stock.save({ session });

      // Create movement
      await Movement.create(
        [
          {
            movementNumber: `MOV-${Date.now()}-${item.rawMaterial}`,
            itemType: 'raw_material',
            itemId: item.rawMaterial,
            itemName: item.rawMaterialName,
            toLocation: purchaseOrder.destinationLocation,
            quantity: item.quantity,
            unitCost: item.finalUnitCost,
            totalCost: item.finalUnitCost * item.quantity,
            batchNumber: `BTCH-${purchaseOrder.orderNumber}`,
            movementType: 'purchase_receipt',
            reference: {
              type: 'purchase_order',
              id: purchaseOrder._id,
              number: purchaseOrder.orderNumber,
            },
            stockBefore: stock.quantity - item.quantity,
            stockAfter: stock.quantity,
            createdBy: req.user.id,
          },
        ],
        { session },
      );
    }

    purchaseOrder.status = 'received';
    purchaseOrder.receivedDate = new Date();
    await purchaseOrder.save({ session });

    await session.commitTransaction();

    res.status(200).json({
      status: 'success',
      data: {
        purchaseOrder,
      },
    });
  } catch (error) {
    await session.abortTransaction();
    return next(new AppError(error.message, 400));
  } finally {
    session.endSession();
  }
});
