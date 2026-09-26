class BaseRestaurantProvider {
  constructor(name) {
    this.name = name;
  }

  async searchRestaurants() {
    throw new Error(`${this.name} provider must implement searchRestaurants()`);
  }

  async getRestaurantDetails() {
    throw new Error(`${this.name} provider must implement getRestaurantDetails()`);
  }

  async getRestaurantMenu() {
    throw new Error(`${this.name} provider must implement getRestaurantMenu()`);
  }

  async getRestaurantPhotos() {
    throw new Error(`${this.name} provider must implement getRestaurantPhotos()`);
  }

  async getRestaurantHours() {
    throw new Error(`${this.name} provider must implement getRestaurantHours()`);
  }

  async getRestaurantOffers() {
    throw new Error(`${this.name} provider must implement getRestaurantOffers()`);
  }
}

function getConfiguredProvider() {
  const providerName = String(process.env.RESTAURANT_PROVIDER || 'mock').toLowerCase();

  if (providerName === 'mock' || providerName === 'fallback' || providerName === 'local') {
    const { createFallbackProvider } = require('./providers/mock.provider');
    return createFallbackProvider();
  }

  const { createFallbackProvider } = require('./providers/mock.provider');
  return createFallbackProvider();
}

module.exports = {
  BaseRestaurantProvider,
  getConfiguredProvider
};
