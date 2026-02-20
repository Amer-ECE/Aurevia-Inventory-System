const mongoose = require('mongoose');

const ProductionOrder = require('../models/productionOrderModel');
const Stock = require('../models/stockModel');
const BillOfMaterial = require('../models/billOfMaterialModel');
const Movement = require('../models/movementModel');
const factory = require('../utils/handleFactory');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

exports.createProductionOrder = factory.createOne(ProductionOrder);
exports.getAllProductionOrders = factory.getAll(ProductionOrder);
exports.getProductionOrder = factory.getOne(ProductionOrder);
exports.updateProductionOrder = factory.updateOne(ProductionOrder);
exports.deleteProductionOrder = factory.deleteOne(ProductionOrder);

// Check material availability
exports.checkAvailability = catchAsync(async (req, res, next) => {
  const { productId, quantity, sourceLocation } = req.body;

  const bom = await BillOfMaterial.findOne({
    product: productId,
    isActive: true,
  }).populate('materials.rawMaterial');

  if (!bom) {
    return next(new AppError('No active BOM found for this product', 404));
  }

  const availability = [];
  let canProduce = true;
  let maxPossible = Infinity;

  for (const material of bom.materials) {
    const stock = await Stock.findOne({
      itemType: 'raw_material',
      itemId: material.rawMaterial._id,
      locationId: sourceLocation,
    });

    const needed = material.quantity * quantity;
    const available = stock?.quantity || 0;

    const possibleFromThis = Math.floor(available / material.quantity);
    maxPossible = Math.min(maxPossible, possibleFromThis);

    availability.push({
      material: material.rawMaterial.name,
      needed,
      available,
      sufficient: available >= needed,
      possibleUnits: possibleFromThis,
    });

    if (available < needed) canProduce = false;
  }

  res.status(200).json({
    status: 'success',
    data: {
      canProduce,
      maxPossible: canProduce ? quantity : maxPossible,
      availability,
    },
  });
});

// Complete production
exports.completeProduction = catchAsync(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const productionOrder = await ProductionOrder.findById(req.params.id)
      .populate('product')
      .populate({
        path: 'bom',
        populate: { path: 'materials.rawMaterial' },
      });

    if (!productionOrder) {
      return next(new AppError('No production order found', 404));
    }

    if (productionOrder.status === 'completed') {
      return next(new AppError('Production already completed', 400));
    }

    const bom = productionOrder.bom;
    let totalMaterialCost = 0;
    const materialsConsumed = [];

    // Consume raw materials
    for (const material of bom.materials) {
      const stock = await Stock.findOne({
        itemType: 'raw_material',
        itemId: material.rawMaterial._id,
        locationId: productionOrder.sourceLocation,
      }).session(session);

      if (
        !stock ||
        stock.quantity < material.quantity * productionOrder.quantity
      ) {
        throw new AppError(`Insufficient ${material.rawMaterial.name}`, 400);
      }

      // Use FIFO to consume
      let remainingToConsume = material.quantity * productionOrder.quantity;
      let batchConsumed = [];

      // Sort batches by date
      const sortedBatches = [...stock.batches].sort(
        (a, b) => new Date(a.receivedDate) - new Date(b.receivedDate),
      );

      for (let i = 0; i < sortedBatches.length && remainingToConsume > 0; i++) {
        const batch = sortedBatches[i];
        const takeFromBatch = Math.min(batch.quantity, remainingToConsume);

        batchConsumed.push({
          batchNumber: batch.batchNumber,
          quantity: takeFromBatch,
          unitCost: batch.unitCost,
        });

        totalMaterialCost += takeFromBatch * batch.unitCost;
        batch.quantity -= takeFromBatch;
        remainingToConsume -= takeFromBatch;
      }

      // Remove empty batches
      stock.batches = stock.batches.filter((b) => b.quantity > 0);
      stock.quantity -= material.quantity * productionOrder.quantity;
      await stock.save({ session });

      // Record movement
      await Movement.create(
        [
          {
            movementNumber: `MOV-${Date.now()}-${material.rawMaterial._id}`,
            itemType: 'raw_material',
            itemId: material.rawMaterial._id,
            itemName: material.rawMaterial.name,
            fromLocation: productionOrder.sourceLocation,
            quantity: material.quantity * productionOrder.quantity,
            unitCost:
              totalMaterialCost /
              (material.quantity * productionOrder.quantity),
            totalCost: totalMaterialCost,
            movementType: 'production_consumption',
            reference: {
              type: 'production_order',
              id: productionOrder._id,
              number: productionOrder.orderNumber,
            },
            batchNumber: batchConsumed.map((b) => b.batchNumber).join(','),
            stockBefore:
              stock.quantity + material.quantity * productionOrder.quantity,
            stockAfter: stock.quantity,
            createdBy: req.user.id,
          },
        ],
        { session },
      );

      materialsConsumed.push({
        rawMaterial: material.rawMaterial._id,
        quantity: material.quantity * productionOrder.quantity,
        cost: totalMaterialCost / productionOrder.quantity,
        batchNumber: batchConsumed.map((b) => b.batchNumber).join(','),
      });
    }

    // Calculate product cost
    const laborCost = bom.laborCost * productionOrder.quantity;
    const overheadCost = bom.overheadCost * productionOrder.quantity;
    const totalCost = totalMaterialCost + laborCost + overheadCost;
    const costPerUnit = totalCost / productionOrder.quantity;

    // Add finished products
    let productStock = await Stock.findOne({
      itemType: 'product',
      itemId: productionOrder.product._id,
      locationId: productionOrder.destinationLocation,
    }).session(session);

    if (!productStock) {
      productStock = new Stock({
        itemType: 'product',
        itemId: productionOrder.product._id,
        itemModel: 'Product',
        locationId: productionOrder.destinationLocation,
        quantity: 0,
        batches: [],
      });
    }

    // Add as new batch
    productStock.batches.push({
      batchNumber: `PROD-${productionOrder.orderNumber}`,
      quantity: productionOrder.quantity,
      unitCost: costPerUnit,
      receivedDate: new Date(),
    });

    productStock.quantity += productionOrder.quantity;
    await productStock.save({ session });

    // Record movement
    await Movement.create(
      [
        {
          movementNumber: `MOV-${Date.now()}-OUT`,
          itemType: 'product',
          itemId: productionOrder.product._id,
          itemName: productionOrder.product.name,
          toLocation: productionOrder.destinationLocation,
          quantity: productionOrder.quantity,
          unitCost: costPerUnit,
          totalCost: totalCost,
          movementType: 'production_output',
          reference: {
            type: 'production_order',
            id: productionOrder._id,
            number: productionOrder.orderNumber,
          },
          batchNumber: `PROD-${productionOrder.orderNumber}`,
          stockBefore: productStock.quantity - productionOrder.quantity,
          stockAfter: productStock.quantity,
          createdBy: req.user.id,
        },
      ],
      { session },
    );

    // Update production order
    productionOrder.status = 'completed';
    productionOrder.completedQuantity = productionOrder.quantity;
    productionOrder.completionDate = new Date();
    productionOrder.materialsConsumed = materialsConsumed;
    productionOrder.totalCost = totalCost;
    productionOrder.costPerUnit = costPerUnit;
    await productionOrder.save({ session });

    await session.commitTransaction();

    res.status(200).json({
      status: 'success',
      data: {
        productionOrder,
        costPerUnit,
        totalCost,
      },
    });
  } catch (error) {
    await session.abortTransaction();
    return next(new AppError(error.message, 400));
  } finally {
    session.endSession();
  }
});
