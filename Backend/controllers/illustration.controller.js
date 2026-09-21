/**
 * Illustration Controller
 * Serves curated Google-style profile picture illustrations catalog
 */

const { sendSuccess } = require('../utils/response.util');

const ILLUSTRATION_CATEGORIES = [
    { id: 'all', name: 'Start exploring', icon: 'Sparkles' },
    { id: 'travel', name: 'Travel & Adventure', icon: 'Compass' },
    { id: 'nature', name: 'Nature & Landscapes', icon: 'Mountain' },
    { id: 'animals', name: 'Animals & Wildlife', icon: 'Cat' },
    { id: 'food', name: 'Food & Drinks', icon: 'Pizza' }
];

const ILLUSTRATIONS = [
    {
        id: 'ill_hang_glider',
        name: 'Hang Glider',
        category: 'travel',
        tags: ['hang glider', 'mountains', 'sky', 'adventure', 'flight', 'flying', 'traveler'],
        imageUrl: '/illustrations/ill_hang_glider.jpg',
        bgGradient: ['#E0F2FE', '#38BDF8', '#0284C7'],
        primaryColor: '#F59E0B',
        icon: 'Wind'
    },
    {
        id: 'ill_cap_explorer',
        name: 'Cap Explorer',
        category: 'travel',
        tags: ['explorer', 'hiker', 'cap', 'traveler', 'portrait', 'backpacker', 'adventure'],
        imageUrl: '/illustrations/ill_cap_explorer.jpg',
        bgGradient: ['#FED7AA', '#F97316', '#C2410C'],
        primaryColor: '#10B981',
        icon: 'User'
    },
    {
        id: 'ill_mountain_cabin',
        name: 'Hillside Cabin',
        category: 'travel',
        tags: ['cabin', 'mountains', 'lake', 'scenic', 'cottage', 'valley', 'nordic', 'travel'],
        imageUrl: '/illustrations/ill_mountain_cabin.jpg',
        bgGradient: ['#BBF7D0', '#4ADE80', '#15803D'],
        primaryColor: '#DC2626',
        icon: 'Home'
    },
    {
        id: 'ill_hot_air_balloon',
        name: 'Hot Air Balloons',
        category: 'travel',
        tags: ['balloon', 'cappadocia', 'canyon', 'sunrise', 'flight', 'sky', 'traveler'],
        imageUrl: '/illustrations/ill_hot_air_balloon.jpg',
        bgGradient: ['#FFEDD5', '#FDBA74', '#FB923C'],
        primaryColor: '#E11D48',
        icon: 'Plane'
    },
    {
        id: 'ill_historic_bridge',
        name: 'Old Stone Bridge',
        category: 'travel',
        tags: ['bridge', 'historic', 'river', 'valley', 'architecture', 'monument', 'travel'],
        imageUrl: '/illustrations/ill_historic_bridge.jpg',
        bgGradient: ['#E0E7FF', '#818CF8', '#3730A3'],
        primaryColor: '#10B981',
        icon: 'Landmark'
    },
    {
        id: 'ill_glacier_cave',
        name: 'Glacier Cave',
        category: 'nature',
        tags: ['glacier', 'cave', 'ice', 'arctic', 'frozen', 'blue', 'winter', 'expedition'],
        imageUrl: '/illustrations/ill_glacier_cave.jpg',
        bgGradient: ['#CFFAFE', '#38BDF8', '#1D4ED8'],
        primaryColor: '#06B6D4',
        icon: 'Snowflake'
    },
    {
        id: 'ill_unicorn_magic',
        name: 'Vibrant Unicorn',
        category: 'animals',
        tags: ['unicorn', 'magic', 'rainbow', 'fantasy', 'mythical', 'dream', 'stars'],
        imageUrl: '/illustrations/ill_unicorn_magic.jpg',
        bgGradient: ['#FCE7F3', '#EC4899', '#BE185D'],
        primaryColor: '#8B5CF6',
        icon: 'Sparkles'
    },
    {
        id: 'ill_woodpecker_bird',
        name: 'Forest Woodpecker',
        category: 'animals',
        tags: ['bird', 'woodpecker', 'branch', 'wildlife', 'forest', 'nature', 'watcher'],
        imageUrl: '/illustrations/ill_woodpecker_bird.jpg',
        bgGradient: ['#E0F2FE', '#BAE6FD', '#0284C7'],
        primaryColor: '#EF4444',
        icon: 'Feather'
    },
    {
        id: 'ill_margarita_drink',
        name: 'Sunset Margarita',
        category: 'food',
        tags: ['margarita', 'cocktail', 'drink', 'lime', 'sunset', 'beach', 'tropical', 'vacation'],
        imageUrl: '/illustrations/ill_margarita_drink.jpg',
        bgGradient: ['#FED7AA', '#FB7185', '#9333EA'],
        primaryColor: '#10B981',
        icon: 'Wine'
    },
    {
        id: 'ill_woodfire_pizza',
        name: 'Woodfire Pizza',
        category: 'food',
        tags: ['pizza', 'fire', 'oven', 'italian', 'foodie', 'slice', 'crust', 'travel'],
        imageUrl: '/illustrations/ill_woodfire_pizza.jpg',
        bgGradient: ['#FEF08A', '#F97316', '#B91C1C'],
        primaryColor: '#EAB308',
        icon: 'Flame'
    }
];

/**
 * Get all illustrations or filter by category/query
 */
async function getIllustrations(req, res) {
    try {
        const { category, search } = req.query;
        let results = [...ILLUSTRATIONS];

        if (category && category !== 'all') {
            results = results.filter((item) => item.category === category.toLowerCase());
        }

        if (search) {
            const query = search.toLowerCase().trim();
            results = results.filter((item) =>
                item.name.toLowerCase().includes(query) ||
                item.tags.some((t) => t.toLowerCase().includes(query))
            );
        }

        return sendSuccess(res, 'Illustrations fetched successfully', {
            categories: ILLUSTRATION_CATEGORIES,
            illustrations: results,
            total: results.length
        });
    } catch (err) {
        console.error('Failed to get illustrations:', err.message);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
}

module.exports = {
    getIllustrations,
    ILLUSTRATION_CATEGORIES,
    ILLUSTRATIONS
};
