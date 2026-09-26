const express = require('express');
const multer = require('multer');
const verifyToken = require('../middleware/auth.middleware');
const authenticateSupportAdmin = require('../middleware/support-admin.middleware');
const supportController = require('../controllers/support.controller');

const router = express.Router();
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit for support docs & attachments
    fileFilter: (req, file, callback) => {
        const allowed = [
            'image/jpeg', 'image/png', 'image/webp', 'image/gif',
            'application/pdf', 'text/plain', 'text/csv',
            'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];
        callback(null, allowed.includes(file.mimetype));
    }
});

// Ticket lifecycle routes
router.post('/tickets', verifyToken, upload.single('attachment'), supportController.createTicket);
router.get('/tickets', verifyToken, supportController.getMyTickets);
router.patch('/tickets/:ticketNumber/status', verifyToken, supportController.updateTicketStatus);
router.get('/tickets/:ticketNumber/attachment', verifyToken, supportController.getTicketAttachment);

// Dedicated chat & document upload routes for tickets
router.get('/tickets/:ticketNumber/messages', verifyToken, supportController.getTicketMessages);
router.post('/tickets/:ticketNumber/messages', verifyToken, upload.single('attachment'), supportController.sendTicketMessage);


// Admin operations (Accessible to Admin console)
router.use('/admin', authenticateSupportAdmin);
router.get('/admin/tickets', supportController.getAllTicketsAdmin);
router.get('/admin/tickets/:ticketNumber', supportController.getTicketAdminDetails);
router.post('/admin/tickets/:ticketNumber/messages', upload.single('attachment'), supportController.sendAdminTicketMessage);
router.patch('/admin/tickets/:ticketNumber/status', supportController.updateAdminTicketStatus);

module.exports = router;