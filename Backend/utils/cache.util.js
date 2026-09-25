const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL || process.env.REDIS_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.REDIS_TOKEN;
const CACHE_NAMESPACE_PREFIX = 'cache:index:';

const isRedisEnabled = Boolean(REDIS_URL && REDIS_TOKEN);

async function redisRequest(path, method = 'GET', body = null) {
  if (!isRedisEnabled) {
    return null;
  }

  try {
    const url = `${String(REDIS_URL).replace(/\/$/, '')}${path}`;
    const headers = {
      Authorization: `Bearer ${REDIS_TOKEN}`,
      'Content-Type': 'application/json'
    };

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });

    if (!response.ok) {
      const text = await response.text();
      console.warn('[Redis] Request failed:', response.status, text);
      return null;
    }

    return response.json();
  } catch (error) {
    console.warn('[Redis] Request error:', error.message);
    return null;
  }
}

function safeParseJson(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (typeof value === 'object') {
    return value;
  }

  if (typeof value !== 'string') {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch (error) {
    return value;
  }
}

async function getCache(key) {
  if (!isRedisEnabled || !key) {
    return null;
  }

  const result = await redisRequest(`/get/${encodeURIComponent(String(key))}`);
  if (!result || result.result === null || result.result === undefined) {
    return null;
  }

  const parsed = safeParseJson(result.result);
  return parsed;
}

async function setCache(key, value, ttlSeconds = 300, namespace = null) {
  if (!isRedisEnabled || !key) {
    return false;
  }

  const normalizedValue = typeof value === 'string' ? value : JSON.stringify(value);
  const redisResponse = await redisRequest('/set', 'POST', {
    key: String(key),
    value: normalizedValue,
    ex: Math.max(30, Number(ttlSeconds) || 300)
  });

  if (namespace) {
    await registerNamespaceKey(namespace, key, Math.max(600, Number(ttlSeconds) || 300));
  }

  return Boolean(redisResponse && redisResponse.result === 'OK');
}

async function registerNamespaceKey(namespace, key, ttlSeconds = 3600) {
  if (!namespace || !key || !isRedisEnabled) {
    return false;
  }

  const indexKey = `${CACHE_NAMESPACE_PREFIX}${namespace}`;
  const existing = (await getCache(indexKey)) || [];
  const keys = Array.isArray(existing) ? existing : [existing];

  if (!keys.includes(key)) {
    keys.push(key);
    await setCache(indexKey, keys, ttlSeconds, null);
  }

  return true;
}

async function deleteCache(key) {
  if (!isRedisEnabled || !key) {
    return false;
  }

  const response = await redisRequest('/del', 'POST', {
    key: String(key)
  });

  return Boolean(response && response.result !== null && response.result !== undefined);
}

async function invalidateNamespace(namespace) {
  if (!namespace || !isRedisEnabled) {
    return 0;
  }

  const indexKey = `${CACHE_NAMESPACE_PREFIX}${namespace}`;
  const keys = (await getCache(indexKey)) || [];

  const cacheKeys = Array.isArray(keys) ? keys : [keys];
  await Promise.all(cacheKeys.map((cacheKey) => deleteCache(cacheKey)));
  await deleteCache(indexKey);

  return cacheKeys.length;
}

async function withCache({ key, ttlSeconds = 300, namespace = null, fetcher, skipCache = false }) {
  if (skipCache || !key || typeof fetcher !== 'function') {
    return fetcher ? fetcher() : null;
  }

  const cachedValue = await getCache(key);
  if (cachedValue !== null) {
    return cachedValue;
  }

  const freshValue = await fetcher();
  if (freshValue !== undefined && freshValue !== null) {
    await setCache(key, freshValue, ttlSeconds, namespace);
  }

  return freshValue;
}

function buildPackageCacheKey({ category, destination }) {
  const normalizedCategory = String(category || 'all').trim().toLowerCase();
  const normalizedDestination = String(destination || '').trim().toLowerCase().replace(/\s+/g, '');
  return `packages:${normalizedCategory}:${normalizedDestination}`;
}

function getPackageCacheConfig() {
  return {
    enabled: true,
    ttlSeconds: 300,
    staleSeconds: 600
  };
}

async function invalidatePackageCache() {
  return invalidateNamespace('packages');
}

module.exports = {
  isRedisEnabled,
  getCache,
  setCache,
  deleteCache,
  invalidateNamespace,
  withCache,
  buildPackageCacheKey,
  getPackageCacheConfig,
  invalidatePackageCache
};
