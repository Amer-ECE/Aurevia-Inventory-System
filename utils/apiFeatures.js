class APIFeatures {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
  }

  filter() {
    const queryObj = { ...this.queryString };
    const excludedFields = ['page', 'sort', 'limit', 'fields', 'search'];
    excludedFields.forEach((el) => delete queryObj[el]);

    // Handle createdAt[gte] and createdAt[lte]
    if (queryObj['createdAt[gte]'] || queryObj['createdAt[lte]']) {
      queryObj.createdAt = {};
      if (queryObj['createdAt[gte]']) {
        queryObj.createdAt.$gte = new Date(queryObj['createdAt[gte]']);
        delete queryObj['createdAt[gte]'];
      }
      if (queryObj['createdAt[lte]']) {
        queryObj.createdAt.$lte = new Date(queryObj['createdAt[lte]']);
        delete queryObj['createdAt[lte]'];
      }
    }

    // Handle partial text search for issue field
    // if (this.queryString.search) {
    //   const searchTerm = this.queryString.search;
    //   this.query = this.query.find({
    //     $or: [
    //       { issue: new RegExp(searchTerm, 'i') }, // Case-insensitive regex search
    //       { clientName: new RegExp(searchTerm, 'i') }, // Optional: search other fields too
    //       { firstName: new RegExp(searchTerm, 'i') },
    //       { lastName: new RegExp(searchTerm, 'i') },
    //       { userName: new RegExp(searchTerm, 'i') },
    //       { email: new RegExp(searchTerm, 'i') },
    //       { name: new RegExp(searchTerm, 'i') },
    //     ],
    //   });
    //   return this;
    // }

    // Advanced Filtering
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);

    this.query.find(JSON.parse(queryStr));

    return this;
  }

  sort() {
    if (this.queryString.sort) {
      const sortBy = this.queryString.sort.split(',').join(' ');
      this.query = this.query.sort(sortBy);
    } else {
      this.query = this.query.sort('-createdAt _id');
    }

    return this;
  }

  limitedFields() {
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(',').join(' ');
      this, (this.query = this.query.select(fields));
    } else {
      this.query = this.query.select('-__v');
    }

    return this;
  }

  paginate() {
    const page = this.queryString.page * 1 || 1;
    const limit = this.queryString.limit * 1 || 100;
    const skip = (page - 1) * limit;
    this.query = this.query.skip(skip).limit(limit);

    return this;
  }
}

module.exports = APIFeatures;
