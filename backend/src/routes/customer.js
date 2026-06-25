const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const customerController = require('../controllers/customerController');

router.get('/profile', authenticate, customerController.getProfile);
router.put('/profile', authenticate, customerController.updateProfile);
router.get('/credit-score', authenticate, customerController.getCreditScore);
router.get('/dashboard', authenticate, customerController.getDashboard);

module.exports = router;
