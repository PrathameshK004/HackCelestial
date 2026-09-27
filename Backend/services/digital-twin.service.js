const crypto = require('crypto');
const { pool } = require('../utils/db.util');
const { verifyGroupAccess } = require('../utils/groupAuth.util');
const { dispatchImmediateUserNotification } = require('../utils/notification.util');
const { calculateImpact, compareImpacts, IMPACT_LEVELS, generateEntities, haversineKm } = require('./digital-twin.engine');

const WEATHER_CACHE_TTL_MS = 10 * 60 * 1000;
const weatherCache = new Map();
const geocodeCache = new Map();

function numberOrNull(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
}

function parseCoordinates(value) {
    const match = String(value || '').match(/(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)/);
    if (!match) return null;
    const latitude = Number(match[1]);
    const longitude = Number(match[2]);
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
    return { latitude, longitude, name: `${latitude},${longitude}` };
}

async function fetchJson(url, timeoutMs = 8000) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } });
        if (!response.ok) throw new Error(`Weather provider returned HTTP ${response.status}`);
        return response.json();
    } finally {
        clearTimeout(timeout);
    }
}

async function resolveLocation(destination, coordinates) {
    if (coordinates && Number.isFinite(coordinates.latitude) && Number.isFinite(coordinates.longitude)) {
        const lat = Number(coordinates.latitude);
        const lon = Number(coordinates.longitude);
        const geoKey = `rev:${lat.toFixed(3)},${lon.toFixed(3)}`;
        if (geocodeCache.has(geoKey)) return geocodeCache.get(geoKey);
        try {
            if (process.env.API_WEATHER_KEY) {
                const revUrl = new URL('https://api.openweathermap.org/geo/1.0/reverse');
                revUrl.searchParams.set('lat', String(lat));
                revUrl.searchParams.set('lon', String(lon));
                revUrl.searchParams.set('limit', '1');
                revUrl.searchParams.set('appid', process.env.API_WEATHER_KEY);
                const rows = await fetchJson(revUrl);
                if (Array.isArray(rows) && rows[0]) {
                    const parts = [rows[0].name, rows[0].state, rows[0].country].filter(Boolean);
                    const loc = { latitude: lat, longitude: lon, name: parts.join(', ') };
                    geocodeCache.set(geoKey, loc);
                    return loc;
                }
            }
        } catch (e) {
            console.warn('[Digital Twin] Reverse geocoding failed:', e.message);
        }
        return { latitude: lat, longitude: lon, name: destination || `${lat.toFixed(2)}, ${lon.toFixed(2)}` };
    }

    const direct = parseCoordinates(destination);
    if (direct) return resolveLocation(null, direct);

    const name = String(destination || '').trim();
    if (!name) throw new Error('A destination or latitude/longitude is required');
    if (geocodeCache.has(name.toLowerCase())) return geocodeCache.get(name.toLowerCase());
    if (!process.env.API_WEATHER_KEY) throw new Error('API_WEATHER_KEY is not configured');

    const url = new URL('https://api.openweathermap.org/geo/1.0/direct');
    url.searchParams.set('q', name);
    url.searchParams.set('limit', '1');
    url.searchParams.set('appid', process.env.API_WEATHER_KEY);
    const rows = await fetchJson(url);
    if (!Array.isArray(rows) || !rows[0]) throw new Error(`Could not resolve destination: ${name}`);
    const location = { latitude: Number(rows[0].lat), longitude: Number(rows[0].lon), name: [rows[0].name, rows[0].country].filter(Boolean).join(', ') };
    geocodeCache.set(name.toLowerCase(), location);
    return location;
}

async function getWeather({ destination, latitude, longitude, forceRefresh = false }) {
    const coordinates = latitude !== undefined && longitude !== undefined
        ? { latitude: numberOrNull(latitude), longitude: numberOrNull(longitude) }
        : null;
    if (coordinates && (coordinates.latitude === null || coordinates.longitude === null)) throw new Error('Latitude and longitude must be numbers');
    const location = await resolveLocation(destination, coordinates);
    const cacheKey = `${location.latitude.toFixed(4)},${location.longitude.toFixed(4)}`;
    const cached = weatherCache.get(cacheKey);
    if (!forceRefresh && cached && cached.expiresAt > Date.now()) return cached.value;

    let value = null;

    // 1. Primary: OpenWeatherMap 2.5 API (Weather + 5-day Forecast)
    try {
        if (!process.env.API_WEATHER_KEY) throw new Error('API_WEATHER_KEY is not configured');
        const currentUrl = new URL('https://api.openweathermap.org/data/2.5/weather');
        currentUrl.searchParams.set('lat', String(location.latitude));
        currentUrl.searchParams.set('lon', String(location.longitude));
        currentUrl.searchParams.set('appid', process.env.API_WEATHER_KEY);
        currentUrl.searchParams.set('units', 'metric');

        const forecastUrl = new URL('https://api.openweathermap.org/data/2.5/forecast');
        forecastUrl.searchParams.set('lat', String(location.latitude));
        forecastUrl.searchParams.set('lon', String(location.longitude));
        forecastUrl.searchParams.set('appid', process.env.API_WEATHER_KEY);
        forecastUrl.searchParams.set('units', 'metric');

        const [currentData, forecastData] = await Promise.all([
            fetchJson(currentUrl),
            fetchJson(forecastUrl).catch((err) => {
                console.warn('[Digital Twin] Forecast fetch failed, proceeding with current only:', err.message);
                return { list: [] };
            })
        ]);

        const rain1h = Number(currentData.rain?.['1h'] || currentData.rain?.['3h'] || 0);
        const hourly = (forecastData.list || []).map((item) => ({
            dt: item.dt,
            temp: item.main?.temp,
            feels_like: item.main?.feels_like,
            humidity: item.main?.humidity,
            wind_speed: item.wind?.speed,
            weather: item.weather || [],
            rain: { '1h': Number((item.rain?.['3h'] || 0) / 3) }
        }));

        const dailyMap = new Map();
        for (const item of (forecastData.list || [])) {
            const date = item.dt_txt ? item.dt_txt.split(' ')[0] : new Date(item.dt * 1000).toISOString().split('T')[0];
            if (!dailyMap.has(date)) {
                dailyMap.set(date, {
                    dt: item.dt,
                    temp: { day: item.main?.temp, min: item.main?.temp_min, max: item.main?.temp_max },
                    humidity: item.main?.humidity,
                    wind_speed: item.wind?.speed,
                    weather: item.weather || [],
                    rain: Number(item.rain?.['3h'] || 0)
                });
            } else {
                const dayEntry = dailyMap.get(date);
                dayEntry.temp.min = Math.min(dayEntry.temp.min, item.main?.temp_min || dayEntry.temp.min);
                dayEntry.temp.max = Math.max(dayEntry.temp.max, item.main?.temp_max || dayEntry.temp.max);
                dayEntry.rain += Number(item.rain?.['3h'] || 0);
            }
        }

        value = {
            provider: 'OpenWeatherMap Live (v2.5)',
            location,
            fetchedAt: new Date().toISOString(),
            current: {
                temp: Number(currentData.main?.temp ?? currentData.current?.temp ?? 25),
                feels_like: Number(currentData.main?.feels_like ?? currentData.current?.feels_like ?? currentData.main?.temp ?? 25),
                humidity: Number(currentData.main?.humidity ?? currentData.current?.humidity ?? 60),
                wind_speed: Number(currentData.wind?.speed ?? currentData.current?.wind_speed ?? 0),
                rain: { '1h': rain1h },
                weather: currentData.weather || currentData.current?.weather || [{ main: 'Clear', description: 'clear sky' }]
            },
            hourly,
            daily: Array.from(dailyMap.values()).slice(0, 5),
            alerts: []
        };
    } catch (err) {
        console.warn('[Digital Twin] OpenWeather fetch failed, falling back to Open-Meteo:', err.message);
        // 2. High-availability Fallback: Open-Meteo API (Free, high reliability)
        try {
            const omUrl = new URL('https://api.open-meteo.com/v1/forecast');
            omUrl.searchParams.set('latitude', String(location.latitude));
            omUrl.searchParams.set('longitude', String(location.longitude));
            omUrl.searchParams.set('current', 'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,weather_code,wind_speed_10m');
            omUrl.searchParams.set('hourly', 'temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m');
            omUrl.searchParams.set('daily', 'temperature_2m_max,temperature_2m_min,precipitation_sum');
            omUrl.searchParams.set('timezone', 'auto');

            const omData = await fetchJson(omUrl);
            const curr = omData.current || {};
            value = {
                provider: 'Open-Meteo Live Fallback',
                location,
                fetchedAt: new Date().toISOString(),
                current: {
                    temp: Number(curr.temperature_2m ?? 25),
                    feels_like: Number(curr.apparent_temperature ?? curr.temperature_2m ?? 25),
                    humidity: Number(curr.relative_humidity_2m ?? 60),
                    wind_speed: Number(curr.wind_speed_10m ?? 0),
                    rain: { '1h': Number(curr.rain || curr.precipitation || 0) },
                    weather: [{ main: curr.rain > 0 ? 'Rain' : 'Clouds', description: curr.rain > 0 ? 'precipitation' : 'cloudy' }]
                },
                hourly: (omData.hourly?.time || []).slice(0, 24).map((time, idx) => ({
                    dt: Math.floor(new Date(time).getTime() / 1000),
                    temp: omData.hourly.temperature_2m?.[idx],
                    humidity: omData.hourly.relative_humidity_2m?.[idx],
                    wind_speed: omData.hourly.wind_speed_10m?.[idx],
                    rain: { '1h': omData.hourly.precipitation?.[idx] || 0 }
                })),
                daily: (omData.daily?.time || []).slice(0, 5).map((date, idx) => ({
                    dt: Math.floor(new Date(date).getTime() / 1000),
                    temp: { min: omData.daily.temperature_2m_min?.[idx], max: omData.daily.temperature_2m_max?.[idx] },
                    rain: omData.daily.precipitation_sum?.[idx] || 0
                })),
                alerts: []
            };
        } catch (omErr) {
            console.error('[Digital Twin] Open-Meteo fallback also failed:', omErr.message);
            throw omErr;
        }
    }

    weatherCache.set(cacheKey, { expiresAt: Date.now() + WEATHER_CACHE_TTL_MS, value });

    await pool.query(`
        INSERT INTO weather_observations (id, cache_key, latitude, longitude, provider, payload, fetched_at, expires_at)
        VALUES ($1, $2, $3, $4, $5, $6::jsonb, NOW(), NOW() + INTERVAL '10 minutes')
    `, [crypto.randomUUID(), cacheKey, location.latitude, location.longitude, value.provider, JSON.stringify(value)]).catch((error) => {
        console.warn('[Digital Twin] Could not persist weather observation:', error.message);
    });
    return value;
}

async function getTrip(groupId, userId) {
    const access = await verifyGroupAccess(groupId, userId);
    if (access.notFound) throw Object.assign(new Error('Trip not found'), { statusCode: 404 });
    if (!access.isAuthorized) throw Object.assign(new Error('Access denied. You are not a member of this trip.'), { statusCode: 403 });
    return access.group;
}

async function fetchRealNewsSignals(destination, locality = null) {
    const city = destination ? destination.split(',')[0].trim() : 'Mumbai';
    const subLoc = locality && locality !== city ? locality.split(',')[0].trim() : null;
    
    // Narrow query to exact locality/suburb and tourist/travel spots
    const locQuery = subLoc ? `("${subLoc}" OR "${city}")` : `"${city}"`;
    const query = encodeURIComponent(`${locQuery} (travel OR tourism OR tourist OR "places to visit" OR "tourist spot" OR "road trip" OR "travel advisory" OR "traffic alert" OR "waterlogging" OR "monsoon travel" OR flight OR airport OR railway OR "metro delay")`);
    const url = `https://news.google.com/rss/search?q=${query}&hl=en-IN&gl=IN&ceid=IN:en`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    try {
        const res = await fetch(url, { signal: controller.signal, headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
        if (!res.ok) throw new Error(`Google News returned HTTP ${res.status}`);
        const xml = await res.text();
        const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];

        const travelKeywords = /travel|tour|tourist|spot|visit|attraction|monument|beach|fort|flight|airport|hotel|resort|trip|train|railway|road|traffic|waterlog|flood|transit|metro|cab|taxi|uber|ola|sightsee|hiking|cruise|ferry|weather.*travel|rain.*travel|delay|cancel|divert|stranded|advisory|curb|visarjan|festival/i;

        return items.slice(0, 25)
            .map((item) => {
                const rawTitle = item.match(/<title>([\s\S]*?)<\/title>/)?.[1] || '';
                const cleanTitle = rawTitle.replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').replace(/&amp;/g, '&').replace(/&quot;/g, '"');
                const pubDate = item.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] || new Date().toISOString();
                const source = (item.match(/<source[^>]*>([\s\S]*?)<\/source>/)?.[1] || 'Real Travel Wire').replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1');
                const link = item.match(/<link>([\s\S]*?)<\/link>/)?.[1] || '';

                const lower = cleanTitle.toLowerCase();
                // Filter: only keep travel/trip-relevant news
                if (!travelKeywords.test(lower)) return null;

                const isSevere = /curbs?|closed|shut|flood|heavy rain|alert|waterlog|divert|damage|delay|chaos|warning|cyclone|cancel|strand|traffic jam/i.test(lower);
                const isPositive = /clear|sunny|normal|relief|open|reopen|smooth|pleasant|breeze|best.*visit|must.*visit|top.*place|special train|new flight|expressway/i.test(lower);
                const severity = isSevere ? 'HIGH' : /rain|traffic|jam|cloud|moderate|crowd|delays/i.test(lower) ? 'MEDIUM' : 'LOW';
                const sentiment = isSevere ? 'negative' : isPositive ? 'positive' : 'neutral';

                const locationTag = subLoc ? `${subLoc}, ${city}` : city;

                return {
                    location: locationTag,
                    event: cleanTitle,
                    sentiment,
                    severity,
                    timestamp: new Date(pubDate).toISOString(),
                    confidence: 0.95,
                    source_url: link,
                    payload: {
                        channel: source,
                        author: source,
                        text: cleanTitle,
                        locationTag
                    }
                };
            })
            .filter(Boolean)
            .slice(0, 15);
    } catch (err) {
        console.warn('[Digital Twin] Real news RSS fetch error:', err.message);
        return [];
    } finally {
        clearTimeout(timeout);
    }
}

async function getSignals(destination, weather = null) {
    const locFilter = destination ? destination.split(',')[0].trim() : 'Mumbai';
    const locality = weather?.location?.name ? weather.location.name.split(',')[0].trim() : null;
    
    // Check if we already have fresh real signals from the past 24 hours
    let result = await pool.query(`
        SELECT id, location, event, sentiment, severity, timestamp, confidence, source_url AS "sourceUrl", payload
        FROM social_signals
        WHERE ($1::text IS NULL OR LOWER(location) LIKE LOWER('%' || $1 || '%'))
          AND timestamp >= NOW() - INTERVAL '24 hours'
        ORDER BY timestamp DESC LIMIT 50
    `, [locFilter || null]);

    if (!result.rows || result.rows.length < 3) {
        // Fetch real-time live travel news signals
        const realSignals = await fetchRealNewsSignals(locFilter, locality);
        for (const sig of realSignals) {
            const id = crypto.randomUUID();
            await pool.query(`
                INSERT INTO social_signals (id, location, event, sentiment, severity, timestamp, confidence, source_url, payload)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
                ON CONFLICT (id) DO NOTHING
            `, [id, sig.location || locFilter, sig.event, sig.sentiment, sig.severity, sig.timestamp, sig.confidence, sig.source_url, JSON.stringify(sig.payload)]).catch(() => {});
        }

        result = await pool.query(`
            SELECT id, location, event, sentiment, severity, timestamp, confidence, source_url AS "sourceUrl", payload
            FROM social_signals
            WHERE ($1::text IS NULL OR LOWER(location) LIKE LOWER('%' || $1 || '%'))
            ORDER BY timestamp DESC LIMIT 50
        `, [locFilter || null]);
    }

    return result.rows;
}

async function addSignal({ location, event, sentiment, severity, confidence, sourceUrl, payload }) {
    const id = crypto.randomUUID();
    const result = await pool.query(`
        INSERT INTO social_signals (id, location, event, sentiment, severity, timestamp, confidence, source_url, payload)
        VALUES ($1, $2, $3, $4, $5, NOW(), $6, $7, $8::jsonb)
        RETURNING id, location, event, sentiment, severity, timestamp, confidence, source_url AS "sourceUrl", payload
    `, [id, location, event, sentiment || 'neutral', severity || 'LOW', confidence || 0.85, sourceUrl || null, JSON.stringify(payload || {})]);
    return result.rows[0];
}

async function getUnavailableWeather(destination, coordinates = null) {
    let location = null;
    try {
        location = await resolveLocation(destination, coordinates);
    } catch (error) {
        location = coordinates && Number.isFinite(coordinates.latitude) && Number.isFinite(coordinates.longitude)
            ? { latitude: Number(coordinates.latitude), longitude: Number(coordinates.longitude), name: destination || 'Live user location' }
            : { latitude: null, longitude: null, name: destination || 'Current location' };
    }
    return {
        provider: 'OpenWeatherMap (Unavailable fallback)',
        providerStatus: 'UNAVAILABLE',
        weatherUnavailable: true,
        location,
        fetchedAt: new Date().toISOString(),
        current: {},
        hourly: [],
        daily: [],
        alerts: [],
        fallback: 'baseline-v1 requires no fabricated weather values; predictions use neutral defaults and reduced confidence.'
    };
}

const placesSearchCache = new Map();

async function searchNearbyPlaces({ latitude, longitude, query, category, destination }) {
    let lat = Number(latitude);
    let lon = Number(longitude);

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        if (destination) {
            try {
                const resolved = await resolveLocation(destination);
                lat = resolved.latitude;
                lon = resolved.longitude;
            } catch {
                lat = 19.0760;
                lon = 72.8777;
            }
        } else {
            lat = 19.0760;
            lon = 72.8777;
        }
    }

    const cleanQuery = (query || '').trim();
    const cacheKey = `${lat.toFixed(3)},${lon.toFixed(3)}:${cleanQuery.toLowerCase()}:${category || 'all'}`;
    if (placesSearchCache.has(cacheKey)) {
        const cached = placesSearchCache.get(cacheKey);
        if (cached.expiresAt > Date.now()) return cached.data;
    }

    const delta = 0.08; // ~8-9 km radius
    const viewbox = `${lon - delta},${lat + delta},${lon + delta},${lat - delta}`;
    const dynamicResults = [];

    // 1. Search OpenStreetMap Nominatim for real live travel spots
    try {
        const searchTerms = cleanQuery 
            ? [cleanQuery]
            : category === 'transport'
            ? ['station', 'metro']
            : category === 'attraction'
            ? ['attraction', 'beach', 'fort', 'park']
            : category === 'restaurant'
            ? ['restaurant', 'cafe']
            : ['attraction', 'station', 'beach', 'fort', 'restaurant'];

        for (const term of searchTerms) {
            const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(term)}&format=json&viewbox=${viewbox}&bounded=1&limit=4`;
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 3500);
            try {
                const res = await fetch(url, { signal: controller.signal, headers: { 'User-Agent': 'TriptualWeatherTwin/1.0 (contact@triptual.app)' } });
                const rows = await res.json();
                if (Array.isArray(rows)) {
                    for (const row of rows) {
                        const rLat = Number(row.lat);
                        const rLon = Number(row.lon);
                        if (!Number.isFinite(rLat) || !Number.isFinite(rLon)) continue;
                        
                        const rawType = (row.type || row.class || '').toLowerCase();
                        const isTransport = /station|subway|railway|airport|aerodrome|bus|halt|platform/.test(rawType) || term.includes('station');
                        const isFood = /restaurant|cafe|bar|pub|fast_food|food/.test(rawType) || term.includes('restaurant');
                        const type = isTransport ? 'transport' : isFood ? 'restaurant' : 'attraction';
                        
                        const name = row.display_name.split(',')[0].trim();
                        if (dynamicResults.some(r => r.name.toLowerCase() === name.toLowerCase())) continue;

                        const distKm = haversineKm(lat, lon, rLat, rLon);
                        dynamicResults.push({
                            id: `osm-${row.osm_id || Math.random().toString(36).substring(7)}`,
                            name,
                            type,
                            latitude: rLat,
                            longitude: rLon,
                            distanceKm: distKm,
                            icon: type === 'transport' ? 'train' : type === 'restaurant' ? 'utensils' : 'landmark'
                        });
                    }
                }
            } catch (err) {
                // Ignore per-term timeouts
            } finally {
                clearTimeout(timer);
            }
        }
    } catch (e) {
        console.warn('[Digital Twin] Dynamic POI Nominatim error:', e.message);
    }

    // 2. Query nearby real restaurants from database
    try {
        const dbRes = await pool.query(`
            SELECT id, name, latitude, longitude, address, city
            FROM dine_restaurants
            WHERE latitude BETWEEN $1 AND $2 AND longitude BETWEEN $3 AND $4
            LIMIT 4
        `, [lat - delta, lat + delta, lon - delta, lon + delta]);
        for (const row of dbRes.rows) {
            const rLat = Number(row.latitude);
            const rLon = Number(row.longitude);
            if (!Number.isFinite(rLat) || !Number.isFinite(rLon)) continue;
            if (dynamicResults.some(r => r.name.toLowerCase() === row.name.toLowerCase())) continue;
            const distKm = haversineKm(lat, lon, rLat, rLon);
            dynamicResults.push({
                id: `db-rest-${row.id}`,
                name: row.name,
                type: 'restaurant',
                latitude: rLat,
                longitude: rLon,
                distanceKm: distKm,
                icon: 'utensils'
            });
        }
    } catch (dbErr) {
        console.warn('[Digital Twin] DB POI query warning:', dbErr.message);
    }

    // 3. Fallback to curated candidates if dynamic search returned empty (e.g. offline/blocked)
    if (dynamicResults.length === 0) {
        const fallbackList = generateEntities({
            location: { latitude: lat, longitude: lon, name: destination || 'Live Location' },
            transportDisruption: { prediction: 30 },
            attractionDemand: { prediction: 75 },
            restaurantDemand: { prediction: 60 },
            rainfall: 10,
            windSpeed: 15
        });
        dynamicResults.push(...fallbackList);
    }

    // 4. Attach dynamic weather disruptions & propagation levels
    const finalEntities = dynamicResults.map((item, idx) => {
        const baseDisruption = item.type === 'transport' ? 38 : item.type === 'attraction' ? 25 : 18;
        const status = item.type === 'transport'
            ? 'Transit flow normal • Routine schedules'
            : item.type === 'restaurant'
            ? 'Open for Dining & Takeaway'
            : 'Scenic travel spot open for visitors';

        return {
            id: item.id || `poi-${idx}`,
            name: item.name,
            type: item.type,
            latitude: item.latitude,
            longitude: item.longitude,
            distanceKm: item.distanceKm !== undefined ? Number(item.distanceKm.toFixed(1)) : haversineKm(lat, lon, item.latitude, item.longitude),
            disruptionScore: item.disruptionScore !== undefined ? item.disruptionScore : baseDisruption,
            status: item.status || status,
            propagationLevel: item.propagationLevel || (item.type === 'transport' ? 'DIRECT' : item.type === 'attraction' ? 'SECONDARY' : 'HIGHER_ORDER'),
            icon: item.icon || 'map-pin',
            description: item.description || `${item.name} located ${item.distanceKm || 'nearby'} km from your live GPS location.`
        };
    });

    // Sort by proximity
    finalEntities.sort((a, b) => a.distanceKm - b.distanceKm);

    // Filter by category if requested
    const filtered = (category && category !== 'all')
        ? finalEntities.filter(e => e.type === category)
        : finalEntities;

    // Cache for 15 minutes
    placesSearchCache.set(cacheKey, {
        data: filtered,
        expiresAt: Date.now() + 15 * 60 * 1000
    });

    return filtered;
}

async function buildTripState(group, { forceRefresh = false, latitude, longitude } = {}) {
    let weather;
    try {
        weather = await getWeather({
            destination: group.destination,
            latitude,
            longitude,
            forceRefresh
        });
    } catch (error) {
        console.warn(`[Digital Twin] Weather unavailable for ${group.destination}:`, error.message);
        weather = await getUnavailableWeather(group.destination, latitude !== undefined && longitude !== undefined ? { latitude, longitude } : null);
    }
    const locName = weather?.location?.name || group.destination;
    const signals = await getSignals(locName, weather).catch(() => []);
    const impact = calculateImpact({ weather, socialSignalCount: signals.length });

    // Dynamically search real nearby travel spots around coordinates
    try {
        const dynamicEntities = await searchNearbyPlaces({
            latitude: weather?.location?.latitude,
            longitude: weather?.location?.longitude,
            destination: locName
        });
        if (dynamicEntities && dynamicEntities.length > 0) {
            impact.entities = dynamicEntities.slice(0, 8);
        }
    } catch (err) {
        console.warn('[Digital Twin] Dynamic entity search error:', err.message);
    }
    const state = {
        id: crypto.randomUUID(),
        trip: { id: group.id, name: group.name, destination: group.destination, startDate: group.start_date, endDate: group.end_date },
        weather,
        impact,
        socialSignals: signals,
        virtual: true,
        productionDataMutated: false,
        updatedAt: new Date().toISOString()
    };

    await pool.query(`
        INSERT INTO digital_twin_states (id, group_id, impact_level, impact_score, lower_bound, upper_bound, confidence, weather_hash, state, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, NOW())
        ON CONFLICT (group_id) DO UPDATE SET
            impact_level = EXCLUDED.impact_level,
            impact_score = EXCLUDED.impact_score,
            lower_bound = EXCLUDED.lower_bound,
            upper_bound = EXCLUDED.upper_bound,
            confidence = EXCLUDED.confidence,
            weather_hash = EXCLUDED.weather_hash,
            state = EXCLUDED.state,
            created_at = NOW()
    `, [
        state.id,
        group.id,
        impact.impactLevel,
        impact.tripImpact.prediction,
        impact.tripImpact.lowerBound,
        impact.tripImpact.upperBound,
        impact.tripImpact.confidence,
        crypto.createHash('sha256').update(JSON.stringify(weather)).digest('hex'),
        JSON.stringify(state)
    ]);
    return state;
}

async function maybeNotifyTripImpact(group, state, previousState) {
    if (!group.created_by || !previousState) return false;
    const previousScore = Number(previousState.impact_score || 0);
    const previousLevel = previousState.impact_level || 'LOW';
    const currentScore = state.impact.tripImpact.prediction;
    const currentLevel = state.impact.impactLevel;
    const meaningful = previousLevel !== currentLevel && Math.abs(currentScore - previousScore) >= 8;
    if (!meaningful) return false;

    const event = await pool.query(`
        INSERT INTO weather_notification_events (group_id, last_impact_level, last_impact_score, notified_at)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (group_id) DO UPDATE SET last_impact_level = EXCLUDED.last_impact_level, last_impact_score = EXCLUDED.last_impact_score, notified_at = NOW()
        WHERE weather_notification_events.last_impact_level IS DISTINCT FROM EXCLUDED.last_impact_level
           OR ABS(weather_notification_events.last_impact_score - EXCLUDED.last_impact_score) >= 8
        RETURNING group_id
    `, [group.id, currentLevel, currentScore]);
    if (!event.rows.length) return false;

    const members = await pool.query(`
        SELECT DISTINCT user_id FROM group_members
        WHERE group_id = $1 AND user_id IS NOT NULL AND COALESCE(status, 'ACCEPTED') = 'ACCEPTED'
    `, [group.id]);
    const userIds = new Set(members.rows.map((row) => row.user_id));
    if (group.created_by) userIds.add(group.created_by);
    await Promise.all([...userIds].map((userId) => dispatchImmediateUserNotification({
        userId,
        type: 'WEATHER_TRIP_IMPACT',
        title: 'High Weather Impact on Your Trip',
        body: `${state.weather.current?.weather?.[0]?.description || 'Weather conditions'} may affect ${group.name}.`,
        data: { type: 'WEATHER_TRIP_IMPACT', tripId: String(group.id), groupId: String(group.id), severity: currentLevel, impactScore: String(currentScore), screen: 'TripWeatherImpact' }
    })));
    return true;
}

async function monitorTrips() {
    const groups = await pool.query(`
        SELECT g.* FROM groups g
        WHERE COALESCE(g.end_date, CURRENT_DATE) >= CURRENT_DATE
          AND (g.start_date IS NULL OR g.start_date <= CURRENT_DATE + INTERVAL '30 days')
    `);
    for (const group of groups.rows) {
        try {
            const previous = await pool.query('SELECT impact_level, impact_score FROM digital_twin_states WHERE group_id = $1', [group.id]);
            const state = await buildTripState(group);
            await maybeNotifyTripImpact(group, state, previous.rows[0]);
        } catch (error) {
            console.warn(`[Digital Twin] Monitor skipped trip ${group.id}:`, error.message);
        }
    }
}

function startDigitalTwinMonitor() {
    const intervalMs = Math.max(10 * 60 * 1000, Number(process.env.DIGITAL_TWIN_POLL_MS || 10 * 60 * 1000));
    const timer = setInterval(() => monitorTrips().catch((error) => console.warn('[Digital Twin] Monitor error:', error.message)), intervalMs);
    timer.unref?.();
    return timer;
}

async function simulate({ group, userId, destination, latitude, longitude, rainfall, temperature, windSpeed, stormDuration, weatherSeverity }) {
    let baseState = null;
    if (group) {
        baseState = await buildTripState(group, { latitude, longitude });
    } else {
        const weather = await getWeather({ destination, latitude, longitude });
        const signals = await getSignals(destination, weather).catch(() => []);
        const impact = calculateImpact({ weather, socialSignalCount: signals.length });
        baseState = { weather, impact, socialSignals: signals };
    }
    const simulatedImpact = calculateImpact({
        weather: baseState.weather,
        overrides: { rainfall, temperature, windSpeed, stormDuration, weatherSeverity },
        socialSignalCount: baseState.socialSignals?.length || 0
    });
    const result = {
        model: simulatedImpact.model,
        virtual: true,
        productionDataMutated: false,
        notificationsSent: false,
        before: baseState.impact,
        after: simulatedImpact,
        changes: compareImpacts(baseState.impact, simulatedImpact),
        createdAt: new Date().toISOString()
    };
    const id = crypto.randomUUID();
    await pool.query(`
        INSERT INTO digital_twin_simulations (id, user_id, group_id, inputs, result, created_at)
        VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, NOW())
    `, [id, userId, group?.id || null, JSON.stringify({ rainfall, temperature, windSpeed, stormDuration, weatherSeverity, destination, latitude, longitude }), JSON.stringify(result)]);
    return { id, ...result };
}

module.exports = { getWeather, getTrip, getSignals, addSignal, buildTripState, simulate, startDigitalTwinMonitor, searchNearbyPlaces, IMPACT_LEVELS };
