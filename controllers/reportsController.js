const Sale = require('../models/saleModel');
const Expense = require('../models/expenseModel');
const Stock = require('../models/stockModel');
const Movement = require('../models/movementModel');
const Product = require('../models/productModel');
const Location = require('../models/locationModel');
const Capital = require('../models/capitalModel');
const CapitalTransaction = require('../models/capitalTransactionModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

// @desc    Get location performance report
// @route   GET /api/v1/reports/location/:locationId
// @access  Private
exports.getLocationPerformance = catchAsync(async (req, res, next) => {
  const { locationId } = req.params;
  const { startDate, endDate } = req.query;

  // Default to current month if no dates provided
  const start = startDate
    ? new Date(startDate)
    : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const end = endDate ? new Date(endDate) : new Date();

  // Get location details
  const location = await Location.findById(locationId);
  if (!location) {
    return next(new AppError('Location not found', 404));
  }

  // 1. Get sales for this location
  const sales = await Sale.find({
    location: locationId,
    saleDate: { $gte: start, $lte: end },
  }).populate('items.product', 'name model');

  const salesTotal = sales.reduce((sum, s) => sum + s.total, 0);
  const salesProfit = sales.reduce((sum, s) => sum + (s.profit || 0), 0);
  const salesCount = sales.length;

  // Sales by product
  const productSales = {};
  sales.forEach((sale) => {
    sale.items.forEach((item) => {
      const productId = item.product._id.toString();
      if (!productSales[productId]) {
        productSales[productId] = {
          product: item.product,
          quantity: 0,
          revenue: 0,
          profit: 0,
        };
      }
      productSales[productId].quantity += item.quantity;
      productSales[productId].revenue += item.subtotal;
      productSales[productId].profit +=
        item.subtotal - item.cost * item.quantity;
    });
  });

  // 2. Get expenses for this location
  const expenses = await Expense.find({
    location: locationId,
    expenseDate: { $gte: start, $lte: end },
  });

  const expensesTotal = expenses.reduce((sum, e) => sum + e.amount, 0);
  const expensesByType = {};
  expenses.forEach((expense) => {
    if (!expensesByType[expense.type]) {
      expensesByType[expense.type] = 0;
    }
    expensesByType[expense.type] += expense.amount;
  });

  // 3. Get current stock value
  const stocks = await Stock.find({
    locationId: locationId,
    quantity: { $gt: 0 },
  }).populate('itemId');

  const stockValue = stocks.reduce((sum, s) => {
    return sum + s.quantity * s.averageCost;
  }, 0);

  const stockItems = stocks.map((s) => ({
    itemType: s.itemType,
    itemName: s.itemId?.name || 'Unknown',
    quantity: s.quantity,
    averageCost: s.averageCost,
    totalValue: s.quantity * s.averageCost,
  }));

  // 4. Get movements in/out
  const movementsIn = await Movement.countDocuments({
    toLocation: locationId,
    movementType: {
      $in: ['purchase_receipt', 'production_output', 'transfer', 'return'],
    },
    createdAt: { $gte: start, $lte: end },
  });

  const movementsOut = await Movement.countDocuments({
    fromLocation: locationId,
    movementType: { $in: ['sale', 'transfer', 'damage_loss'] },
    createdAt: { $gte: start, $lte: end },
  });

  res.status(200).json({
    status: 'success',
    data: {
      location: {
        id: location._id,
        name: location.name,
        type: location.locationType,
        city: location.city,
        isActive: location.isActive,
        ...(location.endDate && { endDate: location.endDate }),
      },
      period: {
        start,
        end,
      },
      sales: {
        total: salesTotal,
        profit: salesProfit,
        count: salesCount,
        averageTicket: salesCount > 0 ? salesTotal / salesCount : 0,
        byProduct: Object.values(productSales),
      },
      expenses: {
        total: expensesTotal,
        byType: expensesByType,
        count: expenses.length,
      },
      profitLoss: {
        grossProfit: salesProfit,
        netProfit: salesProfit - expensesTotal,
        margin:
          salesTotal > 0
            ? ((salesProfit - expensesTotal) / salesTotal) * 100
            : 0,
      },
      inventory: {
        stockValue,
        itemCount: stocks.length,
        items: stockItems,
      },
      activity: {
        movementsIn,
        movementsOut,
        totalMovements: movementsIn + movementsOut,
      },
    },
  });
});

// @desc    Get overall business summary
// @route   GET /api/v1/reports/summary
// @access  Private
exports.getBusinessSummary = catchAsync(async (req, res, next) => {
  const { startDate, endDate } = req.query;

  const start = startDate
    ? new Date(startDate)
    : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const end = endDate ? new Date(endDate) : new Date();

  // Get all active locations
  const locations = await Location.find({ isActive: true });

  // Get capital info
  const capital = await Capital.getCapital();

  // Get all sales
  const sales = await Sale.find({
    saleDate: { $gte: start, $lte: end },
  });

  const totalRevenue = sales.reduce((sum, s) => sum + s.total, 0);
  const totalProfit = sales.reduce((sum, s) => sum + (s.profit || 0), 0);
  const totalSalesCount = sales.length;

  // Get all expenses
  const expenses = await Expense.find({
    expenseDate: { $gte: start, $lte: end },
  });

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  // Get stock summary
  const stocks = await Stock.aggregate([
    {
      $group: {
        _id: '$itemType',
        totalQuantity: { $sum: '$quantity' },
        totalValue: { $sum: { $multiply: ['$quantity', '$averageCost'] } },
      },
    },
  ]);

  const stockSummary = {
    rawMaterials: stocks.find((s) => s._id === 'raw_material') || {
      totalQuantity: 0,
      totalValue: 0,
    },
    products: stocks.find((s) => s._id === 'product') || {
      totalQuantity: 0,
      totalValue: 0,
    },
  };

  // Get location performance summary
  const locationPerformance = await Promise.all(
    locations.map(async (loc) => {
      const locSales = await Sale.find({
        location: loc._id,
        saleDate: { $gte: start, $lte: end },
      });

      const locExpenses = await Expense.find({
        location: loc._id,
        expenseDate: { $gte: start, $lte: end },
      });

      const locRevenue = locSales.reduce((sum, s) => sum + s.total, 0);
      const locProfit = locSales.reduce((sum, s) => sum + (s.profit || 0), 0);
      const locExpenseTotal = locExpenses.reduce((sum, e) => sum + e.amount, 0);

      return {
        id: loc._id,
        name: loc.name,
        type: loc.locationType,
        revenue: locRevenue,
        profit: locProfit,
        expenses: locExpenseTotal,
        netProfit: locProfit - locExpenseTotal,
      };
    }),
  );

  // Get capital transactions summary
  const capitalTransactions = await CapitalTransaction.aggregate([
    {
      $match: {
        createdAt: { $gte: start, $lte: end },
      },
    },
    {
      $group: {
        _id: '$type',
        total: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      period: { start, end },
      financial: {
        revenue: totalRevenue,
        expenses: totalExpenses,
        profit: totalProfit,
        netProfit: totalProfit - totalExpenses,
        margin:
          totalRevenue > 0
            ? ((totalProfit - totalExpenses) / totalRevenue) * 100
            : 0,
      },
      sales: {
        count: totalSalesCount,
        averageValue: totalSalesCount > 0 ? totalRevenue / totalSalesCount : 0,
      },
      inventory: {
        rawMaterials: stockSummary.rawMaterials,
        products: stockSummary.products,
        totalValue:
          stockSummary.rawMaterials.totalValue +
          stockSummary.products.totalValue,
      },
      capital: {
        currentBalance: capital.balance,
        transactions: capitalTransactions,
      },
      locations: locationPerformance,
      topProducts: await getTopProducts(start, end),
    },
  });
});

// @desc    Get product performance report
// @route   GET /api/v1/reports/products
// @access  Private
exports.getProductPerformance = catchAsync(async (req, res, next) => {
  const { startDate, endDate } = req.query;

  const start = startDate
    ? new Date(startDate)
    : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const end = endDate ? new Date(endDate) : new Date();

  const products = await Product.find({ isActive: true });

  const productPerformance = await Promise.all(
    products.map(async (product) => {
      const sales = await Sale.find({
        'items.product': product._id,
        saleDate: { $gte: start, $lte: end },
      });

      let quantity = 0;
      let revenue = 0;
      let cost = 0;

      sales.forEach((sale) => {
        sale.items.forEach((item) => {
          if (item.product.toString() === product._id.toString()) {
            quantity += item.quantity;
            revenue += item.subtotal;
            cost += (item.cost || 0) * item.quantity;
          }
        });
      });

      const profit = revenue - cost;

      // Get current stock
      const stocks = await Stock.find({
        itemType: 'product',
        itemId: product._id,
        quantity: { $gt: 0 },
      }).populate('locationId', 'name');

      const stockLocations = stocks.map((s) => ({
        location: s.locationId.name,
        quantity: s.quantity,
        value: s.quantity * s.averageCost,
      }));

      return {
        id: product._id,
        name: product.name,
        model: product.model,
        sellingPrice: product.sellingPrice,
        sales: {
          quantity,
          revenue,
          cost,
          profit,
          margin: revenue > 0 ? (profit / revenue) * 100 : 0,
        },
        stock: {
          total: stocks.reduce((sum, s) => sum + s.quantity, 0),
          locations: stockLocations,
          value: stocks.reduce((sum, s) => sum + s.quantity * s.averageCost, 0),
        },
      };
    }),
  );

  res.status(200).json({
    status: 'success',
    data: {
      period: { start, end },
      products: productPerformance.sort(
        (a, b) => b.sales.revenue - a.sales.revenue,
      ),
    },
  });
});

// Helper function to get top products
const getTopProducts = async (start, end) => {
  const sales = await Sale.find({
    saleDate: { $gte: start, $lte: end },
  }).populate('items.product');

  const productMap = {};

  sales.forEach((sale) => {
    sale.items.forEach((item) => {
      const productId = item.product._id.toString();
      if (!productMap[productId]) {
        productMap[productId] = {
          name: item.product.name,
          model: item.product.model,
          quantity: 0,
          revenue: 0,
          profit: 0,
        };
      }
      productMap[productId].quantity += item.quantity;
      productMap[productId].revenue += item.subtotal;
      productMap[productId].profit += item.subtotal - item.cost * item.quantity;
    });
  });

  return Object.values(productMap)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);
};

// @desc    Get daily sales report
// @route   GET /api/v1/reports/daily-sales
// @access  Private
exports.getDailySales = catchAsync(async (req, res, next) => {
  const { days = 30 } = req.query;

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const sales = await Sale.aggregate([
    {
      $match: {
        saleDate: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: {
          year: { $year: '$saleDate' },
          month: { $month: '$saleDate' },
          day: { $dayOfMonth: '$saleDate' },
        },
        total: { $sum: '$total' },
        profit: { $sum: '$profit' },
        count: { $sum: 1 },
      },
    },
    {
      $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 },
    },
  ]);

  const dailyData = sales.map((s) => ({
    date: `${s._id.year}-${String(s._id.month).padStart(2, '0')}-${String(s._id.day).padStart(2, '0')}`,
    total: s.total,
    profit: s.profit,
    count: s.count,
  }));

  res.status(200).json({
    status: 'success',
    data: {
      period: { start: startDate, end: endDate },
      days: dailyData.length,
      data: dailyData,
    },
  });
});
