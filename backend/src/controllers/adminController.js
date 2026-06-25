const { query } = require('../config/database');
const { auditLog } = require('../utils/auditLog');
const bcrypt = require('bcryptjs');

// ============================================================
// DASHBOARD STATS
// ============================================================
exports.getDashboardStats = async (req, res, next) => {
  try {
    const stats = await query(`
      SELECT
        COUNT(*) AS total_applications,
        COUNT(*) FILTER (WHERE status = 'submitted') AS submitted,
        COUNT(*) FILTER (WHERE status = 'under_review') AS under_review,
        COUNT(*) FILTER (WHERE status IN ('eligible','ineligible')) AS assessed,
        COUNT(*) FILTER (WHERE status = 'approved') AS approved,
        COUNT(*) FILTER (WHERE status = 'rejected') AS rejected,
        COUNT(*) FILTER (WHERE status = 'disbursed') AS disbursed,
        SUM(loan_amount) FILTER (WHERE status = 'approved') AS total_approved_amount,
        SUM(loan_amount) FILTER (WHERE status = 'disbursed') AS total_disbursed_amount,
        AVG(loan_amount) AS avg_loan_amount
      FROM loan_applications
    `);

    const recentApps = await query(`
      SELECT la.id, la.application_number, la.loan_type, la.loan_amount, la.status,
             la.submitted_at, u.full_name, u.email
      FROM loan_applications la
      JOIN users u ON u.id = la.user_id
      ORDER BY la.submitted_at DESC LIMIT 10
    `);

    const loanTypeDistribution = await query(`
      SELECT loan_type, COUNT(*) AS count, SUM(loan_amount) AS total_amount
      FROM loan_applications
      GROUP BY loan_type
    `);

    const userCount = await query('SELECT COUNT(*) AS total FROM users WHERE is_active = true');

    res.json({
      success: true,
      data: {
        stats: stats.rows[0],
        recentApplications: recentApps.rows,
        loanTypeDistribution: loanTypeDistribution.rows,
        totalUsers: userCount.rows[0].total,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// LIST ALL APPLICATIONS
// ============================================================
exports.getAllApplications = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status, loan_type, search } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (status) {
      whereClause += ` AND la.status = $${paramIndex++}`;
      params.push(status);
    }
    if (loan_type) {
      whereClause += ` AND la.loan_type = $${paramIndex++}`;
      params.push(loan_type);
    }
    if (search) {
      whereClause += ` AND (la.application_number ILIKE $${paramIndex} OR u.full_name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    const result = await query(
      `SELECT la.id, la.application_number, la.loan_type, la.loan_amount, la.loan_tenure_months,
              la.status, la.submitted_at, la.interest_rate, la.emi_amount,
              u.full_name, u.email, u.phone,
              ec.is_eligible, ec.eligibility_score, ec.credit_score
       FROM loan_applications la
       JOIN users u ON u.id = la.user_id
       LEFT JOIN eligibility_checks ec ON ec.application_id = la.id
       ${whereClause}
       ORDER BY la.submitted_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    const countResult = await query(
      `SELECT COUNT(*) FROM loan_applications la JOIN users u ON u.id = la.user_id ${whereClause}`,
      params
    );

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].count),
        totalPages: Math.ceil(countResult.rows[0].count / limit),
      },
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// GET SINGLE APPLICATION (ADMIN VIEW)
// ============================================================
exports.getApplicationDetails = async (req, res, next) => {
  try {
    const { id } = req.params;

    const appResult = await query(
      `SELECT la.*, u.full_name, u.email, u.phone, u.pan_number, u.date_of_birth,
              u.address, u.city, u.state, u.pincode
       FROM loan_applications la
       JOIN users u ON u.id = la.user_id
       WHERE la.id = $1`,
      [id]
    );

    if (appResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    const eligResult = await query(
      'SELECT * FROM eligibility_checks WHERE application_id = $1 ORDER BY checked_at DESC LIMIT 1',
      [id]
    );

    const disbResult = await query(
      'SELECT * FROM loan_disbursements WHERE application_id = $1',
      [id]
    );

    const auditResult = await query(
      `SELECT * FROM audit_logs WHERE entity_id = $1 ORDER BY created_at DESC LIMIT 20`,
      [id]
    );

    res.json({
      success: true,
      data: {
        ...appResult.rows[0],
        eligibility: eligResult.rows[0] || null,
        disbursement: disbResult.rows[0] || null,
        activityLog: auditResult.rows,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// APPROVE APPLICATION
// ============================================================
exports.approveApplication = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { admin_remarks } = req.body;

    const appResult = await query(
      'SELECT * FROM loan_applications WHERE id = $1',
      [id]
    );

    if (appResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    const app = appResult.rows[0];
    if (!['eligible', 'under_review'].includes(app.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot approve application with status: ${app.status}`,
      });
    }

    await query(
      `UPDATE loan_applications SET
         status = 'approved', decision_at = NOW(), reviewed_by = $1,
         admin_remarks = $2, updated_at = NOW()
       WHERE id = $3`,
      [req.admin.id, admin_remarks, id]
    );

    await auditLog({
      actorId: req.admin.id, actorType: 'admin', actorName: req.admin.email,
      action: 'APPLICATION_APPROVED', entityType: 'application', entityId: id,
      details: { admin_remarks },
      ipAddress: req.ip,
    });

    res.json({ success: true, message: 'Application approved successfully' });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// REJECT APPLICATION
// ============================================================
exports.rejectApplication = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rejection_reason, admin_remarks } = req.body;

    if (!rejection_reason) {
      return res.status(400).json({ success: false, message: 'Rejection reason is required' });
    }

    const appResult = await query('SELECT * FROM loan_applications WHERE id = $1', [id]);
    if (appResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    const app = appResult.rows[0];
    if (['disbursed', 'rejected'].includes(app.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot reject application with status: ${app.status}`,
      });
    }

    await query(
      `UPDATE loan_applications SET
         status = 'rejected', decision_at = NOW(), reviewed_by = $1,
         rejection_reason = $2, admin_remarks = $3, updated_at = NOW()
       WHERE id = $4`,
      [req.admin.id, rejection_reason, admin_remarks, id]
    );

    await auditLog({
      actorId: req.admin.id, actorType: 'admin', actorName: req.admin.email,
      action: 'APPLICATION_REJECTED', entityType: 'application', entityId: id,
      details: { rejection_reason, admin_remarks },
      ipAddress: req.ip,
    });

    res.json({ success: true, message: 'Application rejected' });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// DISBURSE LOAN
// ============================================================
exports.disburseLoan = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { bank_account, ifsc_code, disbursement_mode = 'NEFT' } = req.body;

    const appResult = await query('SELECT * FROM loan_applications WHERE id = $1', [id]);
    if (appResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    const app = appResult.rows[0];
    if (app.status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Only approved applications can be disbursed',
      });
    }

    const txnRef = `TXN${Date.now()}`;
    const firstEmiDate = new Date();
    firstEmiDate.setMonth(firstEmiDate.getMonth() + 1);
    const lastEmiDate = new Date(firstEmiDate);
    lastEmiDate.setMonth(lastEmiDate.getMonth() + parseInt(app.loan_tenure_months) - 1);

    await query(
      `INSERT INTO loan_disbursements
         (application_id, user_id, disbursed_by, disbursed_amount, disbursement_mode,
          bank_account, ifsc_code, transaction_reference, first_emi_date, last_emi_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [
        id, app.user_id, req.admin.id, app.loan_amount, disbursement_mode,
        bank_account, ifsc_code, txnRef, firstEmiDate, lastEmiDate,
      ]
    );

    await query(
      `UPDATE loan_applications SET status = 'disbursed', disbursed_at = NOW(), updated_at = NOW() WHERE id = $1`,
      [id]
    );

    await auditLog({
      actorId: req.admin.id, actorType: 'admin', actorName: req.admin.email,
      action: 'LOAN_DISBURSED', entityType: 'application', entityId: id,
      details: { amount: app.loan_amount, txnRef, mode: disbursement_mode },
      ipAddress: req.ip,
    });

    res.json({ success: true, message: 'Loan disbursed successfully', data: { transaction_reference: txnRef } });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// AUDIT LOGS
// ============================================================
exports.getAuditLogs = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, action } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (action) {
      whereClause += ` AND action = $${paramIndex++}`;
      params.push(action);
    }

    const result = await query(
      `SELECT * FROM audit_logs ${whereClause} ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    const countResult = await query(
      `SELECT COUNT(*) FROM audit_logs ${whereClause}`,
      params
    );

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].count),
        totalPages: Math.ceil(countResult.rows[0].count / limit),
      },
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// LIST ALL USERS
// ============================================================
exports.getAllUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (search) {
      whereClause += ` AND (full_name ILIKE $${paramIndex} OR email ILIKE $${paramIndex} OR phone ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    const result = await query(
      `SELECT id, full_name, email, phone, employment_type, monthly_income,
              is_active, created_at,
              (SELECT COUNT(*) FROM loan_applications WHERE user_id = users.id) AS application_count
       FROM users ${whereClause}
       ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    const countResult = await query(
      `SELECT COUNT(*) FROM users ${whereClause}`,
      params
    );

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].count),
        totalPages: Math.ceil(countResult.rows[0].count / limit),
      },
    });
  } catch (err) {
    next(err);
  }
};
