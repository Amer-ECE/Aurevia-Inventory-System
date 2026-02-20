const mongoose = require('mongoose');

const saleSchema = new mongoose.Schema(
  {
    //   invoiceNumber: {
    //     type: String,
    //     required: true,
    //     unique: true,
    //   },
    location: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Location',
      required: true,
    },

    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product',
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
        price: {
          type: Number,
          required: true,
        },
        cost: Number,
        subtotal: Number,
      },
    ],

    subtotal: Number,
    total: {
      type: Number,
      required: true,
    },

    // Profit tracking
    costOfGoodsSold: Number,
    profit: Number,

    // Capital tracking
    capitalTransactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CapitalTransaction',
    },

    saleDate: {
      type: Date,
      default: Date.now,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

// Auto-generate invoice number
saleSchema.pre('validate', async function (next) {
  // Auto-generate invoice number
  if (!this.invoiceNumber) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    const startOfDay = new Date(date.setHours(0, 0, 0, 0));
    const endOfDay = new Date(date.setHours(23, 59, 59, 999));

    const count = await this.constructor.countDocuments({
      saleDate: { $gte: startOfDay, $lte: endOfDay },
    });

    this.invoiceNumber = `INV-${year}${month}${day}-${String(count + 1).padStart(3, '0')}`;
  }

  // Calculate item subtotals and total
  let subtotal = 0;
  for (const item of this.items) {
    item.subtotal = item.quantity * item.price;
    subtotal += item.subtotal;
  }

  // Set subtotal and total
  this.subtotal = subtotal;
  this.total = subtotal; // Add tax/discount logic here if needed

  next();
});

// Static method for population
saleSchema.statics.requiresPopulation = [
  { path: 'location', select: 'name locationType' },
  { path: 'items.product', select: 'name model' },
  { path: 'createdBy', select: 'userName' },
];

const Sale = mongoose.model('Sale', saleSchema);
module.exports = Sale;
