const { pool } = require('../utils/db.util');
const {
    getCache,
    setCache,
    withCache,
    buildPackageCacheKey,
    getPackageCacheConfig,
    invalidatePackageCache
} = require('../utils/cache.util');
const { sendSuccess, sendError } = require('../utils/response.util');

const normalizePackageRow = (row) => ({
    id: row.id,
    name: row.title,
    title: row.title,
    type: row.type || 'Hotel',
    category: (row.category || 'hotel').toLowerCase(),
    destination: row.destination,
    country: row.country || 'India',
    duration: row.duration || '5D/4N',
    dateRange: row.date_range || 'Jun 15-22',
    guests: row.guests || 2,
    matchScore: row.match_score || 90,
    rating: parseFloat(row.rating) || 4.8,
    pricePerNight: Math.round(parseFloat(row.base_price) / (row.total_nights || 7)) || 150,
    basePrice: parseFloat(row.base_price) || 15000,
    totalNights: row.total_nights || 7,
    style: row.style || 'Boutique',
    distance: row.distance || '0.5 km',
    featured: Boolean(row.featured),
    status: row.status,
    image: row.image,
    altImages: typeof row.alt_images === 'string' ? JSON.parse(row.alt_images) : (row.alt_images || []),
    metrics: typeof row.metrics === 'string' ? JSON.parse(row.metrics) : (row.metrics || { walk: 90, food: 90, activity: 90 }),
    whyMatched: typeof row.why_matched === 'string' ? JSON.parse(row.why_matched) : (row.why_matched || []),
    itineraryHighlights: typeof row.itinerary_highlights === 'string' ? JSON.parse(row.itinerary_highlights) : (row.itinerary_highlights || []),
    inclusions: typeof row.inclusions === 'string' ? JSON.parse(row.inclusions) : (row.inclusions || []),
    description: row.description || ''
});

const fetchExplorePackages = async (req) => {
    const { category, destination } = req.query;
    let query = "SELECT * FROM tour_packages WHERE status = 'Published'";
    const params = [];

    if (category && category !== 'all') {
        params.push(String(category).toLowerCase());
        query += ` AND LOWER(category) = $${params.length}`;
    }

    if (destination) {
        params.push(`%${String(destination).toLowerCase()}%`);
        query += ` AND LOWER(destination) LIKE $${params.length}`;
    }

    query += ' ORDER BY featured DESC, created_at DESC';

    const result = await pool.query(query, params);
    return result.rows.map(normalizePackageRow);
};

const getExplorePackages = async (req, res) => {
    try {
        const { category, destination } = req.query;
        const cacheConfig = getPackageCacheConfig();
        const cacheKey = buildPackageCacheKey({ category, destination });

        const packages = await withCache({
            key: cacheKey,
            ttlSeconds: cacheConfig.ttlSeconds,
            namespace: 'packages',
            fetcher: async () => fetchExplorePackages(req),
            skipCache: !cacheConfig.enabled
        });

        res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
        res.set('X-Cache', 'Redis');
        return sendSuccess(res, 'Published tour packages retrieved successfully', { packages, total: packages.length });
    } catch (error) {
        console.error('Error fetching explore tour packages:', error);
        return sendError(res, 'Failed to retrieve tour packages', error.message, 500);
    }
};

module.exports = { getExplorePackages, fetchExplorePackages, invalidatePackageCache };
