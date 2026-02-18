const Location = require('../models/locationModel');
const factory = require('../utils/handleFactory');

exports.createLocation = factory.createOne(Location);
exports.updateLocation = factory.updateOne(Location);
exports.getLocations = factory.getAll(Location);
exports.getLocation = factory.getOne(Location);
