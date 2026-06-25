const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Customer auth
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.post('/refresh', authController.refresh);

// Admin auth
router.post('/admin/register', authController.adminRegister);
router.post('/admin/login', authController.adminLogin);
router.post('/admin/refresh', authController.adminRefresh);

module.exports = router;
