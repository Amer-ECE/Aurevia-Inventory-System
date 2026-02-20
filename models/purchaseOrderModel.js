// models/purchaseOrderModel.js
const mongoose = require('mongoose');

const purchaseOrderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
    },

    supplier: {
      name: String,
      invoiceNumber: String,
    },

    items: [
      {
        rawMaterial: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'RawMaterial',
          required: true,
        },
        rawMaterialName: String,
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
        unitCost: {
          type: Number,
          required: true,
        },
        totalCost: Number,
        finalUnitCost: Number,
      },
    ],

    destinationLocation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Location',
      required: true,
    },

    // Costs breakdown
    subtotal: {
      type: Number,
      required: true,
    },

    shipping: {
      type: Number,
      default: 0,
    },

    clearance: {
      type: Number,
      default: 0,
    },

    otherFees: {
      type: Number,
      default: 0,
    },

    grandTotal: {
      type: Number,
      required: true,
    },

    // Status
    status: {
      type: String,
      enum: ['draft', 'ordered', 'received', 'cancelled'],
      default: 'draft',
    },

    // Payment tracking
    paidFromCapital: {
      type: Boolean,
      default: false,
    },

    capitalTransactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CapitalTransaction',
    },

    // Dates
    orderDate: {
      type: Date,
      default: Date.now,
    },

    receivedDate: Date,

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

// Auto-generate order number
purchaseOrderSchema.pre('validate', async function (next) {
  // Generate order number if not exists
  if (!this.orderNumber) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = String(date.getMonth() + 1).padStart(2, '0');

    // Count only documents from this month for better organization
    const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    const endOfMonth = new Date(
      date.getFullYear(),
      date.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );

    const count = await this.constructor.countDocuments({
      createdAt: { $gte: startOfMonth, $lte: endOfMonth },
    });

    this.orderNumber = `PO-${year}${month}-${String(count + 1).padStart(4, '0')}`;
  }

  // Calculate item totals and subtotal
  let subtotal = 0;
  for (const item of this.items) {
    item.totalCost = item.quantity * item.unitCost;
    subtotal += item.totalCost;
  }

  // Set subtotal and grand total
  this.subtotal = subtotal;
  this.grandTotal =
    subtotal +
    (this.shipping || 0) +
    (this.clearance || 0) +
    (this.otherFees || 0);

  next();
});

// Static method for population
purchaseOrderSchema.statics.requiresPopulation = [
  { path: 'items.rawMaterial', select: 'name code' },
  { path: 'destinationLocation', select: 'name locationType' },
  { path: 'createdBy', select: 'userName' },
];

const PurchaseOrder = mongoose.model('PurchaseOrder', purchaseOrderSchema);
module.exports = PurchaseOrder;
