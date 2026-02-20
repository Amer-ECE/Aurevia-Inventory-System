const mongoose = require('mongoose');

const stockSchema = new mongoose.Schema(
  {
    itemType: {
      type: String,
      enum: ['raw_material', 'product'],
      required: true,
    },

    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'itemModel',
    },

    itemModel: {
      type: String,
      enum: ['RawMaterial', 'Product'],
      required: true,
    },

    locationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Location',
      required: true,
    },

    quantity: {
      type: Number,
      default: 0,
      min: 0,
    },

    batches: [
      {
        batchNumber: String,
        quantity: Number,
        unitCost: Number,
        receivedDate: Date,
        purchaseOrderId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'PurchaseOrder',
        },
      },
    ],

    averageCost: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Calculate average cost before save
stockSchema.pre('save', function (next) {
  if (this.batches && this.batches.length > 0) {
    let totalValue = 0;
    let totalQty = 0;
    for (const batch of this.batches) {
      totalValue += batch.quantity * batch.unitCost;
      totalQty += batch.quantity;
    }
    this.averageCost = totalQty > 0 ? totalValue / totalQty : 0;
  }
  next();
});

// Ensure one record per item per location
stockSchema.index({ itemType: 1, itemId: 1, locationId: 1 }, { unique: true });

// Static method for population
stockSchema.statics.requiresPopulation = [
  { path: 'locationId', select: 'name locationType' },
];

const Stock = mongoose.model('Stock', stockSchema);
module.exports = Stock;
