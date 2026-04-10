export const buildWhere = (query, forcedFilter = {}) => {
    const where = { ...forcedFilter };
    const reserved = ["page", "limit", "sort", "fields", "keyword"];

    Object.entries(query).forEach(([key, value]) => {
        if (reserved.includes(key)) return;
        if (value === undefined || value === null || value === "") return;

        const num = Number(value);
        where[key] = Number.isNaN(num) ? value : num;
    });

    if (query.keyword && ("name" in where || !Object.keys(where).length)) {
        where.OR = [
            { name: { contains: query.keyword, mode: "insensitive" } },
            { slug: { contains: query.keyword, mode: "insensitive" } },
        ];
    }

    return where;
};

export const buildSelect = (fields) => {
    if (!fields) return undefined;
    const selected = fields.split(",").map((f) => f.trim()).filter(Boolean);
    if (!selected.length) return undefined;

    return selected.reduce((acc, field) => {
        if (!field.startsWith("-")) acc[field] = true;
        return acc;
    }, {});
};

export const buildOrderBy = (sort) => {
    if (!sort) return { createdAt: "desc" };
    const first = sort.split(",")[0].trim();
    if (!first) return { createdAt: "desc" };
    if (first.startsWith("-")) return { [first.slice(1)]: "desc" };
    return { [first]: "asc" };
};

export const buildPagination = (query) => {
    const page = parseInt(query.page, 10) || 1;
    const limit = parseInt(query.limit, 10) || 5;
    const skip = (page - 1) * limit;
    return { page, limit, skip };
};

export const sortQueryObject = (query) =>
    Object.keys(query).sort().reduce((acc, key) => {
        acc[key] = query[key];
        return acc;
    }, {});
