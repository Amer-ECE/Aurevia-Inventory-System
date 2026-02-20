const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
    },

    model: {
      type: String,
      required: true,
      unique: true,
    },

    sellingPrice: {
      type: Number,
      required: [true, 'Selling price is required'],
    },

    volume: {
      type: String,
    },

    category: {
      type: String,
      enum: ['perfumes', 'hair_mist', 'bakhour', 'package'],
    },

    description: String,

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

productSchema.index({ category: 1, model: 1 });

productSchema.pre('validate', async function (next) {
  if (!this.model) {
    // Define category prefixes
    const categoryPrefixMap = {
      perfumes: 'PER',
      hair_mist: 'HMI',
      bakhour: 'BKH',
      package: 'PAC',
    };

    // Get prefix from category or use default
    const categoryPrefix = categoryPrefixMap[this.category] || 'GEN';

    // Count ONLY documents with the same category
    const count = await this.constructor.countDocuments({
      category: this.category,
    });

    // Format: PRD-CATEGORY-0001
    this.model = `PRD-${categoryPrefix}-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

const Product = mongoose.model('Product', productSchema);
module.exports = Product;
