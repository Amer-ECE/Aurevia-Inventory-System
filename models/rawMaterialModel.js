const mongoose = require('mongoose');

const rawMaterialSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Material name is required'],
    },

    code: {
      type: String,
      required: true,
      unique: true,
    },

    category: {
      type: String,
      enum: [
        'bottle',
        'box',
        'oil',
        'alcohol',
        'cap',
        'label',
        'packaging',
        'other',
      ],
      required: [true, 'Category is required'],
    },

    unit: {
      type: String,
      enum: ['piece', 'ml', 'liter', 'gram', 'kg'],
      required: [true, 'Unit is required'],
    },

    description: String,
    supplier: String,

    isActive: {
      type: Boolean,
      default: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

rawMaterialSchema.pre('validate', async function (next) {
  if (!this.code) {
    // Define custom prefixes for each category
    const prefixMap = {
      bottle: 'B',
      box: 'BX',
      oil: 'O',
      alcohol: 'ALC',
      cap: 'CAP',
      label: 'L',
      packaging: 'P',
      other: 'OT',
    };

    const prefix = prefixMap[this.category] || 'UK'; // UK as fallback for unknown categories

    const count = await this.constructor.countDocuments();
    this.code = `${prefix}-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

const RawMaterial = mongoose.model('RawMaterial', rawMaterialSchema);
module.exports = RawMaterial;
