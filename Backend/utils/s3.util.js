const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const path = require('path');

// Extract environment configuration
const region = process.env.AWS_REGION || 'ap-south-1';
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
const bucketName = process.env.AWS_S3_BUCKET_NAME;

/**
 * Check if required AWS S3 configuration parameters are present in environment
 */
function isS3Configured() {
    return Boolean(accessKeyId && secretAccessKey && bucketName);
}

/**
 * Create S3 Client lazily or when configured
 */
function getS3Client() {
    if (!isS3Configured()) {
        throw new Error(
            'AWS S3 is not configured. Please define AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_S3_BUCKET_NAME in your .env file.'
        );
    }

    return new S3Client({
        region,
        credentials: {
            accessKeyId,
            secretAccessKey,
        },
    });
}

/**
 * Allowed MIME types for user avatars / profile pictures
 */
const ALLOWED_MIME_TYPES = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/heic': 'heic',
    'image/heif': 'heif',
};

/**
 * Upload profile picture buffer to AWS S3
 * @param {Object} params
 * @param {Buffer} params.buffer - In-memory file buffer
 * @param {string} params.mimeType - File mimetype
 * @param {string} params.originalName - Original uploaded file name
 * @param {string} params.userId - Authenticated user ID
 * @returns {Promise<{ url: string, key: string, bucket: string }>}
 */
async function uploadProfilePictureToS3({ buffer, mimeType, originalName, userId }) {
    if (!buffer || buffer.length === 0) {
        throw new Error('No image data provided for upload');
    }

    const normalizedMime = (mimeType || '').toLowerCase().trim();
    const extension = ALLOWED_MIME_TYPES[normalizedMime] || path.extname(originalName || '').replace('.', '').toLowerCase() || 'jpg';

    if (!ALLOWED_MIME_TYPES[normalizedMime] && !['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(extension)) {
        throw new Error(`Unsupported image format: ${mimeType || 'unknown'}. Allowed formats: JPG, PNG, WEBP, GIF.`);
    }

    const s3Client = getS3Client();
    const timestamp = Date.now();
    const safeUserId = String(userId || 'anonymous').replace(/[^a-zA-Z0-9_-]/g, '');
    const key = `profile-pictures/${safeUserId}-${timestamp}.${extension}`;

    const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: buffer,
        ContentType: normalizedMime || `image/${extension}`,
        CacheControl: 'public, max-age=31536000, immutable',
    });

    await s3Client.send(command);

    // Standard AWS S3 URL format
    const url = `https://${bucketName}.s3.${region}.amazonaws.com/${key}`;

    return {
        url,
        key,
        bucket: bucketName,
    };
}

/**
 * Delete an object from S3 if it belongs to this S3 bucket
 * @param {string} s3UrlOrKey - Public S3 URL or object key
 * @returns {Promise<boolean>}
 */
async function deleteS3Object(s3UrlOrKey) {
    if (!s3UrlOrKey || !isS3Configured()) {
        return false;
    }

    try {
        let key = s3UrlOrKey;

        // If a full S3 URL was passed, parse the key
        if (s3UrlOrKey.startsWith('http://') || s3UrlOrKey.startsWith('https://')) {
            const urlObj = new URL(s3UrlOrKey);
            // S3 URL path: /profile-pictures/123-timestamp.jpg
            key = urlObj.pathname.startsWith('/') ? urlObj.pathname.slice(1) : urlObj.pathname;
        }

        if (!key || !key.startsWith('profile-pictures/')) {
            return false;
        }

        const s3Client = getS3Client();
        const command = new DeleteObjectCommand({
            Bucket: bucketName,
            Key: key,
        });

        await s3Client.send(command);
        return true;
    } catch (err) {
        console.warn('Warning: Could not delete S3 object:', err.message);
        return false;
    }
}

module.exports = {
    isS3Configured,
    uploadProfilePictureToS3,
    deleteS3Object,
    ALLOWED_MIME_TYPES,
};
