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
  }
);

// Auto-generate order number
purchaseOrderSchema.pre('save', async function (next) {
  if (!this.orderNumber) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const count = await mongoose.model('PurchaseOrder').countDocuments();
    this.orderNumber = `PO-${year}${month}-${String(count + 1).padStart(
      4,
      '0'
    )}`;
  }

  // Calculate item totals
  for (const item of this.items) {
    item.totalCost = item.quantity * item.unitCost;
  }

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
