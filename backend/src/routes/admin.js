const express = require('express');
const router = express.Router();
const { authenticateAdmin } = require('../middleware/auth');
const adminController = require('../controllers/adminController');

// Dashboard
router.get('/dashboard', authenticateAdmin, adminController.getDashboardStats);

// Applications management
router.get('/applications', authenticateAdmin, adminController.getAllApplications);
router.get('/applications/:id', authenticateAdmin, adminController.getApplicationDetails);
router.put('/applications/:id/approve', authenticateAdmin, adminController.approveApplication);
router.put('/applications/:id/reject', authenticateAdmin, adminController.rejectApplication);
router.put('/applications/:id/disburse', authenticateAdmin, adminController.disburseLoan);

// Users management
router.get('/users', authenticateAdmin, adminController.getAllUsers);

// Audit logs
router.get('/audit-logs', authenticateAdmin, adminController.getAuditLogs);

module.exports = router;
