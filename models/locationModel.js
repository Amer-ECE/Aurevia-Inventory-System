const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Location name is required'],
  },

  locationType: {
    type: String,
    enum: ['permanent_branch', 'temporary_branch', 'online_platform'],
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

  isActive: {
    type: Boolean,
    default: true,
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
});

const Location = mongoose.model('Location', locationSchema);
module.exports = Location;
