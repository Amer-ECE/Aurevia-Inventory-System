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
  },
);

// Auto-generate order number
productionOrderSchema.pre('validate', async function (next) {
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

    this.orderNumber = `PROD-${year}${month}-${String(count + 1).padStart(4, '0')}`;
  }

  // Optional: Auto-fetch BOM if not provided but product is provided
  if (!this.bom && this.product) {
    const BillOfMaterial = mongoose.model('BillOfMaterial');
    const bom = await BillOfMaterial.findOne({
      product: this.product,
      isActive: true,
    });
    if (bom) {
      this.bom = bom._id;
    }
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
  productionOrderSchema,
);
module.exports = ProductionOrder;
