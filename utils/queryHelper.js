class QueryHelper {
    constructor(query, queryParams) {
        this.query = query; // Mongoose query object
        this.queryParams = queryParams; // Request query parameters
    }

    filter() {
        const filterObject = { ...this.queryParams };
        ["page", "limit", "sort", "fields", "keyword"].forEach(param => delete filterObject[param]);

        let queryString = JSON.stringify(filterObject);
        queryString = queryString.replace(/\b(gte|gt|lte|lt)\b/g, match => `$${match}`);

        this.query = this.query.find(JSON.parse(queryString));
        return this;
    }

    paginate(countsDocument) {
        const resultsPerPage = parseInt(this.queryParams.limit) || 5;
        const currentPage = parseInt(this.queryParams.page) || 1;
        const skip = (currentPage - 1) * resultsPerPage;
        const totalPages = Math.ceil(countsDocument / resultsPerPage);
    
        const pagination = {};
        pagination.page = currentPage;
        pagination.limit = resultsPerPage;
        pagination.pages = totalPages;
        pagination.next = currentPage < totalPages ? currentPage + 1 : null;
        pagination.previous = currentPage > 1 ? currentPage - 1 : null;

        this.query = this.query.skip(skip).limit(resultsPerPage);
        this.paginationResult = pagination;
        return this;
    }
    
    sort() {
        const sortBy = this.queryParams.sort ? this.queryParams.sort.split(",").join(" ") : "-createdAt";
        this.query = this.query.sort(sortBy);
        return this;
    }

    selectFields() {
        const fields = this.queryParams.fields ? this.queryParams.fields.split(",").join(" ") : "-__v";
        this.query = this.query.select(fields);
        return this;
    }

    search() {
        if (this.queryParams.keyword) {
            this.query = this.query.find({
                $text: { $search: this.queryParams.keyword }
            });
        }
        return this;
    }
}

export default QueryHelper;