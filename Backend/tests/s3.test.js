const test = require('node:test');
const assert = require('node:assert');
const { isS3Configured, uploadProfilePictureToS3, deleteS3Object, ALLOWED_MIME_TYPES } = require('../utils/s3.util');

test('S3 Utility: Configuration & Validation', async () => {
    // 1. Verify allowed MIME types map standard formats
    assert.strictEqual(ALLOWED_MIME_TYPES['image/jpeg'], 'jpg');
    assert.strictEqual(ALLOWED_MIME_TYPES['image/png'], 'png');
    assert.strictEqual(ALLOWED_MIME_TYPES['image/webp'], 'webp');

    // 2. Reject empty buffers
    await assert.rejects(
        async () => {
            await uploadProfilePictureToS3({
                buffer: null,
                mimeType: 'image/jpeg',
                userId: 'test-user',
            });
        },
        /No image data provided for upload/
    );

    // 3. Reject unsupported mime types
    await assert.rejects(
        async () => {
            await uploadProfilePictureToS3({
                buffer: Buffer.from('fake pdf content'),
                mimeType: 'application/pdf',
                originalName: 'document.pdf',
                userId: 'test-user',
            });
        },
        /Unsupported image format/
    );

    // 4. deleteS3Object handles invalid/empty URLs gracefully without throwing
    const result = await deleteS3Object(null);
    assert.strictEqual(result, false);

    const nonS3Result = await deleteS3Object('https://example.com/other-file.jpg');
    assert.strictEqual(nonS3Result, false);
});
