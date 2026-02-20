const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema(
  {
    expenseNumber: {
      type: String,
      required: true,
      unique: true,
    },

    location: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Location',
    },

    type: {
      type: String,
      enum: [
        'rent',
        'salary',
        'utilities',
        'transport',
        'marketing',
        'maintenance',
        'other',
      ],
      required: [true, 'Expense type is required'],
    },

    amount: {
      type: Number,
      required: [true, 'Amount is required'],
    },

    description: String,

    paidTo: String,

    // Payment
    paymentMethod: {
      type: String,
      enum: ['cash', 'bank_transfer', 'card'],
    },

    // Capital tracking
    paidFromCapital: {
      type: Boolean,
      default: false,
    },
    capitalTransactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CapitalTransaction',
    },

    expenseDate: {
      type: Date,
      default: Date.now,
    },

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

// Auto-generate expense number
expenseSchema.pre('validate', async function (next) {
  if (!this.expenseNumber) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = String(date.getMonth() + 1).padStart(2, '0');

    // Better: Count only from current month
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

    this.expenseNumber = `EXP-${year}${month}-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

// Static method for population
expenseSchema.statics.requiresPopulation = [
  { path: 'location', select: 'name' },
  { path: 'createdBy', select: 'userName' },
];

const Expense = mongoose.model('Expense', expenseSchema);
module.exports = Expense;
