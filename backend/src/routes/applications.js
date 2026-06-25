const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const applicationController = require('../controllers/applicationController');

router.post('/', authenticate, applicationController.submitApplication);
router.get('/', authenticate, applicationController.getMyApplications);
router.get('/:id', authenticate, applicationController.getApplicationById);
router.get('/:id/status', authenticate, applicationController.getApplicationStatus);

module.exports = router;
