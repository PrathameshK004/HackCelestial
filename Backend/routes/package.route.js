const express = require('express');
const router = express.Router();
const packageController = require('../controllers/package.controller');

router.get('/explore', packageController.getExplorePackages);
router.get('/', packageController.getExplorePackages);

module.exports = router;
