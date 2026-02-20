const mongoose = require('mongoose');

const capitalTransactionSchema = new mongoose.Schema(
  {
    transactionNumber: {
      type: String,
      required: true,
      unique: true,
    },

    type: {
      type: String,
      enum: [
        'initial',
        'owner_injection',
        'purchase_payment',
        'sale_revenue',
        'expense_payment',
        'profit_withdrawal',
      ],
      required: true,
    },

    amount: {
      type: Number,
      required: true,
    },

    balanceBefore: Number,
    balanceAfter: Number,

    reference: {
      type: {
        type: String,
        enum: ['purchase_order', 'sale', 'expense'],
      },
      id: mongoose.Schema.Types.ObjectId,
      number: String,
    },

    description: String,

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

// Auto-generate transaction number
capitalTransactionSchema.pre('save', async function (next) {
  if (!this.transactionNumber) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const count = await mongoose.model('CapitalTransaction').countDocuments();
    this.transactionNumber = `CAP-${year}${month}-${String(count + 1).padStart(
      5,
      '0'
    )}`;
  }
  next();
});

// Indexes
capitalTransactionSchema.index({ type: 1 });
capitalTransactionSchema.index({ createdAt: -1 });

const CapitalTransaction = mongoose.model(
  'CapitalTransaction',
  capitalTransactionSchema
);
module.exports = CapitalTransaction;
