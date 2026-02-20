const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Location name is required'],
    },

    code: {
      type: String,
      required: [true, 'Location code is required'],
      unique: true,
    },

    locationType: {
      type: String,
      enum: [
        'warehouse',
        'permanent_branch',
        'temporary_branch',
        'online_platform',
      ],
      required: [true, 'Location type is required'],
    },

    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },

    endDate: {
      type: Date,
    },

    city: {
      type: String,
      required: [true, 'City is required'],
    },

    address: {
      type: String,
    },

    platformUrl: {
      type: String,
    },

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

locationSchema.pre('validate', async function (next) {
  if (!this.code) {
    const prefix =
      this.locationType === 'warehouse'
        ? 'WH'
        : this.locationType === 'permanent_branch'
        ? 'PB'
        : this.locationType === 'temporary_branch'
        ? 'TB'
        : 'OL';

    // Use this.constructor instead of mongoose.model
    const count = await this.constructor.countDocuments();
    this.code = `${prefix}-${String(count + 1).padStart(3, '0')}`;
  }
  next();
});

const Location = mongoose.model('Location', locationSchema);
module.exports = Location;
