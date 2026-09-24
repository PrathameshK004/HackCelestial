const express = require('express');
const multer = require('multer');
const verifyToken = require('../middleware/auth.middleware');
const supportController = require('../controllers/support.controller');

const router = express.Router();
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, callback) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'text/plain'];
        callback(null, allowed.includes(file.mimetype));
    }
});

router.post('/tickets', verifyToken, upload.single('attachment'), supportController.createTicket);

module.exports = router;