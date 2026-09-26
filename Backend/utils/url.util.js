/**
 * URL Utilities for GroupTrip Ledger
 * Resolves links sent via Email, WhatsApp, Telegram, SMS, and share links
 * against the local web app during development.
 */

const LOCAL_APP_URL = 'http://localhost:5173';

/**
 * Resolves the real live public application URL for public sharing and emails.
 * @param {import('express').Request} [req] - Optional express request object
 * @returns {string} Fully qualified local base URL
 */
function getLiveAppUrl(req) {
    // 1. Check explicit environment variable
    const envAppUrl = (process.env.APP_URL || process.env.FRONTEND_URL || '').trim().replace(/\/+$/, '');
    if (envAppUrl) {
        return envAppUrl;
    }

    // 2. Check request origin / referer
    if (req) {
        const origin = (req.get('origin') || '').trim().replace(/\/+$/, '');
        if (origin && origin.startsWith('http')) {
            return origin;
        }

        const referer = (req.get('referer') || '').trim();
        if (referer && referer.startsWith('http')) {
            try {
                const parsed = new URL(referer);
                return parsed.origin;
            } catch { }
        }
    }

    // 3. Local fallback
    return LOCAL_APP_URL;
}

module.exports = {
    getLiveAppUrl,
    LOCAL_APP_URL
};
