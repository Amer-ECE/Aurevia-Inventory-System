const catchAsync = require('./catchAsync');
const APIFeatures = require('./apiFeatures');
const AppError = require('./appError');

exports.createOne = (Model) =>
  catchAsync(async (req, res, next) => {
    if (req.user && Model.schema.paths.createdBy) {
      req.body.createdBy = req.body.createdBy || req.user.id;
    }

    const doc = await Model.create(req.body);

    res.status(201).json({
      status: 'success',
      data: {
        data: doc,
      },
    });
  });

exports.getAll = (Model) =>
  catchAsync(async (req, res, next) => {
    let filter = { active: { $ne: false } };

    let query = Model.find(filter);

    if (Model.schema.statics.requiresPopulation) {
      query = query.populate(Model.schema.statics.requiresPopulation);
    }

    // Create a separate query for counting total documents (without pagination)
    const countQuery = Model.find(filter);

    // Apply the same filters to the count query
    const countFeatures = new APIFeatures(countQuery, req.query)
      .filter()
      .sort()
      .limitedFields();

    // Get total count
    const totalCount = await countFeatures.query.countDocuments();

    // Apply pagination to the main query
    const features = new APIFeatures(query, req.query)
      .filter()
      .sort()
      .limitedFields()
      .paginate();

    const doc = await features.query;

    res.status(200).json({
      status: 'success',
      results: totalCount, // This should be the total count, not just current page
      data: {
        data: doc,
      },
    });
  });

exports.getOne = (Model, popOptions) =>
  catchAsync(async (req, res, next) => {
    let query = Model.findById(req.params.id);

    // Use model's population config if no popOptions provided
    if (!popOptions && Model.schema.statics.requiresPopulation) {
      query = query.populate(Model.schema.statics.requiresPopulation);
    } else if (popOptions) {
      query = query.populate(popOptions);
    }

    const doc = await query;

    if (!doc) {
      return next(new AppError('No document found with this ID', 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        data: doc,
      },
    });
  });

exports.updateOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!doc) {
      return next(new AppError('No document found with this ID', 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        data: doc,
      },
    });
  });

exports.deleteOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndDelete(req.params.id);

    if (!doc) {
      return next(new AppError('No document found with this ID', 404));
    }

    res.status(204).json({
      status: 'success',
      data: null,
    });
  });
