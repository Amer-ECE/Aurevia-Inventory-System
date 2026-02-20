const BillOfMaterial = require('../models/billOfMaterialModel');
const factory = require('../utils/handleFactory');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

exports.createBOM = factory.createOne(BillOfMaterial);
exports.getAllBOMs = factory.getAll(BillOfMaterial);
exports.getBOM = factory.getOne(BillOfMaterial);
exports.updateBOM = factory.updateOne(BillOfMaterial);
exports.deleteBOM = factory.deleteOne(BillOfMaterial);

// Get active BOM for a product
exports.getActiveBOMByProduct = catchAsync(async (req, res, next) => {
  const bom = await BillOfMaterial.findOne({
    product: req.params.productId,
    isActive: true,
  }).populate('product materials.rawMaterial');

  if (!bom) {
    return next(new AppError('No active BOM found for this product', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      data: bom,
    },
  });
});
