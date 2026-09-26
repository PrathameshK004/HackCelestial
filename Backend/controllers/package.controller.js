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
const crypto = require('crypto');
const { verifyGroupAccess } = require('../utils/groupAuth.util');

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const validateReservationPayload = (body = {}) => {
    const { guestCount, startDate, endDate, notes = '', tripId = null } = body;
    const parsedGuestCount = Number(guestCount);
    const isValidDate = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;

    if (!Number.isInteger(parsedGuestCount) || parsedGuestCount < 1 || parsedGuestCount > 40) {
        return { error: 'Guest count must be between 1 and 40' };
    }
    if (!isValidDate(startDate) || !isValidDate(endDate) || endDate < startDate) {
        return { error: 'Choose a valid date range' };
    }
    if (typeof notes !== 'string' || notes.length > 500) {
        return { error: 'Notes must be 500 characters or fewer' };
    }
    if (tripId !== null && !UUID_PATTERN.test(String(tripId))) {
        return { error: 'Choose a valid trip' };
    }

    return { value: { guestCount: parsedGuestCount, startDate, endDate, notes: notes.trim(), tripId: tripId ? String(tripId) : null } };
};

const normalizePackageRow = (row = {}) => {
    const basePrice = Number(row.base_price ?? row.basePrice ?? row.price ?? 0) || 0;
    const totalNights = Number(row.total_nights ?? row.totalNights ?? 7) || 7;
    const pricePerNight = Number(row.price_per_night ?? row.pricePerNight ?? (basePrice / Math.max(totalNights, 1))) || 0;

    return {
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
        currency: row.currency || 'INR',
        pricePerNight: Math.round(pricePerNight) || 150,
        basePrice,
        totalNights,
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
    };
};

const unwrapPackagesPayload = (packages) => {
    if (Array.isArray(packages)) {
        return packages;
    }

    if (packages && typeof packages === 'object') {
        if (Array.isArray(packages.value)) {
            return packages.value;
        }

        if (typeof packages.value === 'string') {
            try {
                const parsed = JSON.parse(packages.value);
                return Array.isArray(parsed) ? parsed : [];
            } catch (error) {
                return [];
            }
        }
    }

    return [];
};

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

const normalizePackagesPayload = (value) => {
    if (Array.isArray(value)) return value;
    if (!value || typeof value !== 'object') return [];
    if (Array.isArray(value.value)) return value.value;
    if (typeof value.value === 'string') {
        try {
            const parsed = JSON.parse(value.value);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }
    return [];
};

const getExplorePackages = async (req, res) => {
    try {
        const { category, destination } = req.query;
        const cacheConfig = getPackageCacheConfig();
        const cacheKey = buildPackageCacheKey({ category, destination });

        await invalidatePackageCache();

        const rawPackages = await withCache({
            key: cacheKey,
            ttlSeconds: cacheConfig.ttlSeconds,
            namespace: 'packages',
            fetcher: async () => fetchExplorePackages(req),
            skipCache: !cacheConfig.enabled
        });

        const packages = normalizePackagesPayload(rawPackages);

        res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
        res.set('X-Cache', 'Redis');
        return sendSuccess(res, 'Published tour packages retrieved successfully', { packages: normalizedPackages, total: normalizedPackages.length });
    } catch (error) {
        console.error('Error fetching explore tour packages:', error);
        return sendError(res, 'Failed to retrieve tour packages', error.message, 500);
    }
};

const createReservation = async (req, res) => {
    const client = await pool.connect();
    try {
        const packageId = String(req.params.packageId || '');
        const validation = validateReservationPayload(req.body);
        if (!UUID_PATTERN.test(packageId)) {
            return sendError(res, 'Invalid package ID', null, 400);
        }
        if (validation.error) {
            return sendError(res, validation.error, null, 400);
        }

        await client.query('BEGIN');
        const packageResult = await client.query(
            "SELECT id, title, destination, base_price, currency FROM tour_packages WHERE id = $1 AND status = 'Published' LIMIT 1",
            [packageId]
        );
        if (!packageResult.rows.length) {
            await client.query('ROLLBACK');
            return sendError(res, 'Published package not found', null, 404);
        }

        const packageRow = packageResult.rows[0];
        let tripId = validation.value.tripId;
        let tripCreated = false;

        if (tripId) {
            const access = await verifyGroupAccess(tripId, req.userKey, client);
            if (!access.isAuthorized) {
                await client.query('ROLLBACK');
                return sendError(res, 'You do not have access to the selected trip', null, access.notFound ? 404 : 403);
            }
        } else {
            const userResult = await client.query('SELECT id, username, email_id FROM users WHERE id = $1 LIMIT 1', [req.userKey]);
            if (!userResult.rows.length) {
                await client.query('ROLLBACK');
                return sendError(res, 'Authenticated user not found', null, 404);
            }

            const user = userResult.rows[0];
            const newTripId = crypto.randomUUID();
            const groupResult = await client.query(`
                INSERT INTO groups (
                    id, name, destination, start_date, end_date, trip_type, currency,
                    expense_split, description, created_by, member_tier, payment_status,
                    payment_amount, created_at, updated_at
                ) VALUES ($1, $2, $3, $4, $5, 'Friends', 'INR', 'equal', $6, $7, 'FREE', 'FREE', 0, NOW(), NOW())
                RETURNING id
            `, [
                newTripId,
                `${packageRow.title} Trip`.slice(0, 255),
                packageRow.destination,
                validation.value.startDate,
                validation.value.endDate,
                `Trip created for package reservation: ${packageRow.title}`,
                req.userKey
            ]);

            await client.query(`
                INSERT INTO group_members (
                    id, group_id, user_id, name, email, role, avatar_bg,
                    is_registered, status, joined_at
                ) VALUES ($1, $2, $3, $4, $5, 'Organizer', '#059669', TRUE, 'ACCEPTED', NOW())
            `, [crypto.randomUUID(), groupResult.rows[0].id, user.id, user.username || 'Organizer', user.email_id]);

            tripId = groupResult.rows[0].id;
            tripCreated = true;
        }

        const reservationResult = await client.query(`
            INSERT INTO tour_package_reservations (
                package_id, user_id, group_id, guest_count, start_date, end_date,
                total_amount, currency, status, notes
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'INR', 'PENDING_CONFIRMATION', $8)
            RETURNING id, package_id, group_id, guest_count, start_date, end_date,
                total_amount, currency, status, notes, created_at
        `, [
            packageId,
            req.userKey,
            tripId,
            validation.value.guestCount,
            validation.value.startDate,
            validation.value.endDate,
            packageRow.base_price,
            validation.value.notes || null
        ]);

        await client.query('COMMIT');
        return sendSuccess(res, 'Reservation request received', {
            reservation: reservationResult.rows[0],
            tripId,
            tripCreated
        }, 201);
    } catch (error) {
        await client.query('ROLLBACK').catch(() => {});
        console.error('Error creating tour package reservation:', error);
        return sendError(res, 'Failed to create reservation request', error.message, 500);
    } finally {
        client.release();
    }
};

module.exports = {
    getExplorePackages,
    createReservation,
    fetchExplorePackages,
    invalidatePackageCache,
    normalizePackageRow,
    normalizePackagesPayload,
    validateReservationPayload
};
