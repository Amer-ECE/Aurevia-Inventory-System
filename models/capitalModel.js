// models/capitalModel.js
const mongoose = require('mongoose');

const capitalSchema = new mongoose.Schema(
  {
    balance: {
      type: Number,
      required: true,
      default: 0,
    },
    initialCapital: {
      type: Number,
      default: 0,
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Ensure only one capital document
capitalSchema.statics.getCapital = async function () {
  let capital = await this.findOne();
  if (!capital) {
    capital = await this.create({ balance: 0, initialCapital: 0 });
  }
  return capital;
};

const Capital = mongoose.model('Capital', capitalSchema);
module.exports = Capital;
