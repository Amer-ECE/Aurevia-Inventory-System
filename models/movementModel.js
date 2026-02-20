const mongoose = require('mongoose');

const movementSchema = new mongoose.Schema(
  {
    movementNumber: {
      type: String,
      required: true,
      unique: true,
    },

    itemType: {
      type: String,
      enum: ['raw_material', 'product'],
      required: true,
    },
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    itemName: String,
    itemCode: String,

    fromLocation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Location',
    },
    toLocation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Location',
    },

    quantity: {
      type: Number,
      required: true,
    },
    unitCost: Number,
    totalCost: Number,

    batchNumber: String,

    movementType: {
      type: String,
      enum: [
        'purchase_receipt',
        'production_consumption',
        'production_output',
        'transfer',
        'sale',
        'return',
        'damage_loss',
        'adjustment',
      ],
      required: true,
    },

    reference: {
      type: {
        type: String,
        enum: ['purchase_order', 'production_order', 'sale', 'return'],
      },
      id: mongoose.Schema.Types.ObjectId,
      number: String,
    },

    stockBefore: Number,
    stockAfter: Number,

    notes: String,

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

// Auto-generate movement number
movementSchema.pre('save', async function (next) {
  if (!this.movementNumber) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const count = await mongoose.model('Movement').countDocuments();
    this.movementNumber = `MOV-${year}${month}${day}-${String(
      count + 1
    ).padStart(5, '0')}`;
  }
  next();
});

// Indexes for fast lookup
movementSchema.index({ itemType: 1, itemId: 1, createdAt: -1 });
movementSchema.index({ fromLocation: 1, toLocation: 1 });
movementSchema.index({ movementType: 1 });

// Static method for population
movementSchema.statics.requiresPopulation = [
  { path: 'fromLocation toLocation', select: 'name' },
];

const Movement = mongoose.model('Movement', movementSchema);
module.exports = Movement;
