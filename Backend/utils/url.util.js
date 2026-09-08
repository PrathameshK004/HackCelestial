/**
 * URL Utilities for GroupTrip Ledger
 * Guarantees that all links sent via Email, WhatsApp, Telegram, SMS, and share links
 * always use the real live production web app URL (https://hack-celestial-one.vercel.app),
 * never unroutable localhost or capacitor schemes.
 */

const LIVE_APP_URL = 'https://hack-celestial-one.vercel.app';

/**
 * Resolves the real live public application URL for public sharing and emails.
 * @param {import('express').Request} [req] - Optional express request object
 * @returns {string} Fully qualified base URL (e.g. "https://hack-celestial-one.vercel.app")
 */
function getLiveAppUrl(req) {
    // 1. Check explicit environment variable (e.g. Render / Production config)
    const envAppUrl = (process.env.APP_URL || process.env.FRONTEND_URL || '').trim().replace(/\/+$/, '');
    if (envAppUrl && !envAppUrl.includes('localhost') && !envAppUrl.includes('127.0.0.1')) {
        return envAppUrl;
    }

    // 2. Check request origin / referer, strictly ignoring localhost / capacitor schemes
    if (req) {
        const origin = (req.get('origin') || '').trim().replace(/\/+$/, '');
        if (origin && !origin.includes('localhost') && !origin.includes('127.0.0.1') && origin.startsWith('http')) {
            return origin;
        }

        const referer = (req.get('referer') || '').trim();
        if (referer && !referer.includes('localhost') && !referer.includes('127.0.0.1') && referer.startsWith('http')) {
            try {
                const parsed = new URL(referer);
                if (!parsed.hostname.includes('localhost') && !parsed.hostname.includes('127.0.0.1')) {
                    return parsed.origin;
                }
            } catch {}
        }
    }

    // 3. Guaranteed Live Fallback (Vercel Production Domain)
    return LIVE_APP_URL;
}

module.exports = {
    getLiveAppUrl,
    LIVE_APP_URL
};
