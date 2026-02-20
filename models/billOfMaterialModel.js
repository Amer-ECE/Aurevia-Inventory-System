const mongoose = require('mongoose');

const billOfMaterialSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'BOM name is required'],
    },

    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product is required'],
    },

    version: {
      type: Number,
      default: 1,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    materials: [
      {
        rawMaterial: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'RawMaterial',
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
      },
    ],

    laborCost: {
      type: Number,
      default: 0,
    },

    overheadCost: {
      type: Number,
      default: 0,
    },

    totalMaterialCost: {
      type: Number,
      default: 0,
    },

    totalCost: {
      type: Number,
      default: 0,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

// Calculate costs before save
billOfMaterialSchema.pre('save', async function (next) {
  let total = 0;
  for (const item of this.materials) {
    const material = await mongoose
      .model('RawMaterial')
      .findById(item.rawMaterial);
    total += material?.unitCost * item.quantity || 0;
  }
  this.totalMaterialCost = total;
  this.totalCost = total + this.laborCost + this.overheadCost;
  next();
});

// Static method for population
billOfMaterialSchema.statics.requiresPopulation = [
  { path: 'product', select: 'name model' },
  { path: 'materials.rawMaterial', select: 'name code unit' },
];

const BillOfMaterial = mongoose.model('BillOfMaterial', billOfMaterialSchema);
module.exports = BillOfMaterial;
