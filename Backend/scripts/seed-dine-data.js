require('dotenv').config();

const { initializeDatabase, pool } = require('../utils/db.util');
const { upsertRestaurantFromProvider } = require('../services/dine/dine.service');
const { mockRestaurants } = require('../services/dine/providers/mock.provider');

async function seedDineData() {
  await initializeDatabase();

  const restaurants = mockRestaurants || [];
  if (!restaurants.length) {
    throw new Error('No Dine restaurant seed data available.');
  }

  console.log(`Loaded ${restaurants.length} Dine restaurant fixtures.`);

  let insertedCount = 0;
  for (const restaurant of restaurants) {
    await upsertRestaurantFromProvider(restaurant);
    insertedCount += 1;
  }

  const { rows } = await pool.query('SELECT COUNT(*)::int AS count FROM dine_restaurants');
  const total = rows[0].count;

  console.log(`Seeded ${insertedCount} Dine restaurants. Total dine_restaurants rows: ${total}`);
}

seedDineData()
  .catch((error) => {
    console.error('Dine seeding failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
