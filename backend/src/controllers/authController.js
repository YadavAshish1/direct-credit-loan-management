const bcrypt = require('bcryptjs');
const { query } = require('../config/database');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const { auditLog } = require('../utils/auditLog');

// ============================================================
// CUSTOMER AUTH
// ============================================================

exports.register = async (req, res, next) => {
  try {
    const { full_name, email, phone, password, date_of_birth } = req.body;

    if (!full_name || !email || !phone || !password) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    // Check if email already exists
    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }

    const password_hash = await bcrypt.hash(password, 12);

    const result = await query(
      `INSERT INTO users (full_name, email, phone, password_hash, date_of_birth)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, full_name, email, phone, created_at`,
      [full_name, email, phone, password_hash, date_of_birth || null]
    );

    const user = result.rows[0];

    const accessToken = generateAccessToken({ id: user.id, email: user.email, type: 'user' });
    const refreshToken = generateRefreshToken({ id: user.id, email: user.email, type: 'user' });

    // Store refresh token
    await query(
      `INSERT INTO refresh_tokens (token, user_id, actor_type, expires_at)
       VALUES ($1, $2, 'user', NOW() + INTERVAL '7 days')`,
      [refreshToken, user.id]
    );

    await auditLog({
      actorId: user.id, actorType: 'user', actorName: user.full_name,
      action: 'USER_REGISTERED', entityType: 'user', entityId: user.id,
      ipAddress: req.ip,
    });

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: { user, accessToken, refreshToken },
    });
  } catch (err) {
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password required' });
    }

    const result = await query('SELECT * FROM users WHERE email = $1 AND is_active = true', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const accessToken = generateAccessToken({ id: user.id, email: user.email, type: 'user' });
    const refreshToken = generateRefreshToken({ id: user.id, email: user.email, type: 'user' });

    await query(
      `INSERT INTO refresh_tokens (token, user_id, actor_type, expires_at)
       VALUES ($1, $2, 'user', NOW() + INTERVAL '7 days')`,
      [refreshToken, user.id]
    );

    const { password_hash, ...safeUser } = user;

    await auditLog({
      actorId: user.id, actorType: 'user', actorName: user.full_name,
      action: 'USER_LOGIN', entityType: 'user', entityId: user.id,
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      message: 'Login successful',
      data: { user: safeUser, accessToken, refreshToken },
    });
  } catch (err) {
    next(err);
  }
};

exports.refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ success: false, message: 'Refresh token required' });
    }

    const decoded = verifyRefreshToken(refreshToken);

    const tokenRecord = await query(
      `SELECT * FROM refresh_tokens WHERE token = $1 AND is_revoked = false AND expires_at > NOW()`,
      [refreshToken]
    );
    if (tokenRecord.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
    }

    // Rotate token
    await query('UPDATE refresh_tokens SET is_revoked = true WHERE token = $1', [refreshToken]);

    const newAccessToken = generateAccessToken({ id: decoded.id, email: decoded.email, type: 'user' });
    const newRefreshToken = generateRefreshToken({ id: decoded.id, email: decoded.email, type: 'user' });

    await query(
      `INSERT INTO refresh_tokens (token, user_id, actor_type, expires_at)
       VALUES ($1, $2, 'user', NOW() + INTERVAL '7 days')`,
      [newRefreshToken, decoded.id]
    );

    res.json({ success: true, data: { accessToken: newAccessToken, refreshToken: newRefreshToken } });
  } catch (err) {
    next(err);
  }
};

exports.logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await query('UPDATE refresh_tokens SET is_revoked = true WHERE token = $1', [refreshToken]);
    }
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// ADMIN AUTH
// ============================================================

exports.adminRegister = async (req, res, next) => {
  try {
    const { full_name, email, password, role } = req.body;

    if (!full_name || !email || !password) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    const existing = await query('SELECT id FROM admins WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'Admin email already registered' });
    }

    const password_hash = await bcrypt.hash(password, 12);
    const adminRole = role || 'admin'; // default to standard admin if not specified

    const result = await query(
      `INSERT INTO admins (full_name, email, password_hash, role)
       VALUES ($1, $2, $3, $4) RETURNING id, full_name, email, role, created_at`,
      [full_name, email, password_hash, adminRole]
    );

    const admin = result.rows[0];

    await auditLog({
      actorId: admin.id, actorType: 'admin', actorName: admin.full_name,
      action: 'ADMIN_REGISTERED', entityType: 'admin', entityId: admin.id,
      ipAddress: req.ip,
    });

    res.status(201).json({
      success: true,
      message: 'Admin registration successful',
      data: { admin },
    });
  } catch (err) {
    next(err);
  }
};

exports.adminLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const result = await query('SELECT * FROM admins WHERE email = $1 AND is_active = true', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const admin = result.rows[0];
    const isMatch = await bcrypt.compare(password, admin.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const accessToken = generateAccessToken({ id: admin.id, email: admin.email, role: admin.role, type: 'admin' });
    const refreshToken = generateRefreshToken({ id: admin.id, email: admin.email, role: admin.role, type: 'admin' });

    await query(
      `INSERT INTO refresh_tokens (token, admin_id, actor_type, expires_at)
       VALUES ($1, $2, 'admin', NOW() + INTERVAL '7 days')`,
      [refreshToken, admin.id]
    );

    const { password_hash, ...safeAdmin } = admin;

    await auditLog({
      actorId: admin.id, actorType: 'admin', actorName: admin.full_name,
      action: 'ADMIN_LOGIN', entityType: 'admin', entityId: admin.id,
      ipAddress: req.ip,
    });

    res.json({ success: true, message: 'Admin login successful', data: { admin: safeAdmin, accessToken, refreshToken } });
  } catch (err) {
    next(err);
  }
};

exports.adminRefresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ success: false, message: 'Refresh token required' });
    }

    const decoded = verifyRefreshToken(refreshToken);

    const tokenRecord = await query(
      `SELECT * FROM refresh_tokens WHERE token = $1 AND is_revoked = false AND expires_at > NOW()`,
      [refreshToken]
    );
    if (tokenRecord.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
    }

    await query('UPDATE refresh_tokens SET is_revoked = true WHERE token = $1', [refreshToken]);

    const newAccessToken = generateAccessToken({ id: decoded.id, email: decoded.email, role: decoded.role, type: 'admin' });
    const newRefreshToken = generateRefreshToken({ id: decoded.id, email: decoded.email, role: decoded.role, type: 'admin' });

    await query(
      `INSERT INTO refresh_tokens (token, admin_id, actor_type, expires_at)
       VALUES ($1, $2, 'admin', NOW() + INTERVAL '7 days')`,
      [newRefreshToken, decoded.id]
    );

    res.json({ success: true, data: { accessToken: newAccessToken, refreshToken: newRefreshToken } });
  } catch (err) {
    next(err);
  }
};
