const Stock = require('../models/stockModel');
const factory = require('../utils/handleFactory');
const catchAsync = require('../utils/catchAsync');

exports.getAllStocks = factory.getAll(Stock);
exports.getStock = factory.getOne(Stock);

// Get stock for a specific product across all locations
exports.getProductStock = catchAsync(async (req, res, next) => {
  const stocks = await Stock.find({
    itemType: 'product',
    itemId: req.params.productId,
    quantity: { $gt: 0 },
  }).populate('locationId', 'name locationType');

  const total = stocks.reduce((sum, s) => sum + s.quantity, 0);

  res.status(200).json({
    status: 'success',
    data: {
      productId: req.params.productId,
      totalStock: total,
      locations: stocks.map((s) => ({
        location: s.locationId.name,
        type: s.locationId.locationType,
        quantity: s.quantity,
        averageCost: s.averageCost,
      })),
    },
  });
});

// Get stock for a specific location
exports.getLocationStock = catchAsync(async (req, res, next) => {
  const stocks = await Stock.find({
    locationId: req.params.locationId,
    quantity: { $gt: 0 },
  }).populate('locationId');

  const products = stocks.filter((s) => s.itemType === 'product');
  const materials = stocks.filter((s) => s.itemType === 'raw_material');

  res.status(200).json({
    status: 'success',
    data: {
      locationId: req.params.locationId,
      products: products.length,
      rawMaterials: materials.length,
      items: stocks,
    },
  });
});

// Get low stock alerts
exports.getLowStockAlerts = catchAsync(async (req, res, next) => {
  const stocks = await Stock.find({
    $expr: { $lt: ['$quantity', 10] }, // Simple threshold
  }).populate('locationId');

  res.status(200).json({
    status: 'success',
    results: stocks.length,
    data: {
      data: stocks,
    },
  });
});
