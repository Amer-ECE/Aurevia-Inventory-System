const mongoose = require('mongoose');

const productionOrderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
    },

    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },

    bom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BillOfMaterial',
      required: true,
    },

    quantity: {
      type: Number,
      required: true,
      min: 1,
    },

    sourceLocation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Location',
      required: true,
    },

    destinationLocation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Location',
      required: true,
    },

    status: {
      type: String,
      enum: ['planned', 'in_progress', 'completed', 'cancelled'],
      default: 'planned',
    },

    materialsConsumed: [
      {
        rawMaterial: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'RawMaterial',
        },

        quantity: Number,

        cost: Number,

        batchNumber: String,
      },
    ],

    totalCost: Number,

    costPerUnit: Number,

    completedQuantity: {
      type: Number,
      default: 0,
    },

    completionDate: Date,

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
productionOrderSchema.pre('save', async function (next) {
  if (!this.orderNumber) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const count = await mongoose.model('ProductionOrder').countDocuments();
    this.orderNumber = `PROD-${year}${month}-${String(count + 1).padStart(
      4,
      '0'
    )}`;
  }
  next();
});

// Static method for population
productionOrderSchema.statics.requiresPopulation = [
  { path: 'product', select: 'name model' },
  { path: 'bom', select: 'name' },
  { path: 'sourceLocation destinationLocation', select: 'name' },
];

const ProductionOrder = mongoose.model(
  'ProductionOrder',
  productionOrderSchema
);
module.exports = ProductionOrder;
