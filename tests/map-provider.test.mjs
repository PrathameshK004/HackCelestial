import assert from 'node:assert/strict';
import { getMapStyleConfig, getMapTileStyleUrl, getMapProviderDefaults } from '../WebApp/src/config/map.js';

const providerConfig = getMapProviderDefaults();
const styleConfig = getMapStyleConfig();

assert.equal(Boolean(providerConfig), true);
assert.equal(typeof providerConfig.name, 'string');
assert.equal(typeof getMapTileStyleUrl('streets'), 'string');
assert.ok(styleConfig.styleUrl.includes('maptiler') || styleConfig.styleUrl.includes('openstreetmap') || styleConfig.styleUrl.includes('tiles'));

console.log('Map provider config checks passed');
