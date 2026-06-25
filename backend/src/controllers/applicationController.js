const { query } = require('../config/database');
const creditBureau = require('../services/creditBureau');
const eligibilityEngine = require('../services/eligibilityEngine');
const { auditLog } = require('../utils/auditLog');

// Generate a unique application number
const generateAppNumber = () => {
  const prefix = 'DC';
  const year = new Date().getFullYear().toString().slice(-2);
  const random = Math.floor(Math.random() * 9000000 + 1000000);
  return `${prefix}${year}${random}`;
};

// ============================================================
// SUBMIT NEW APPLICATION
// ============================================================
exports.submitApplication = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const {
      loan_type, loan_amount, loan_tenure_months, purpose,
      monthly_income, employment_type, employer_name, employment_years, existing_emis,
    } = req.body;

    // Validate required fields
    if (!loan_type || !loan_amount || !loan_tenure_months) {
      return res.status(400).json({ success: false, message: 'loan_type, loan_amount, and loan_tenure_months are required' });
    }

    const validLoanTypes = ['personal', 'home', 'vehicle', 'education', 'business'];
    if (!validLoanTypes.includes(loan_type)) {
      return res.status(400).json({ success: false, message: 'Invalid loan type' });
    }

    // Get full user profile
    const userResult = await query('SELECT * FROM users WHERE id = $1', [userId]);
    const user = userResult.rows[0];

    const applicationNumber = generateAppNumber();

    // Create the application record
    const appResult = await query(
      `INSERT INTO loan_applications
        (application_number, user_id, loan_type, loan_amount, loan_tenure_months, purpose,
         monthly_income, employment_type, employer_name, employment_years, existing_emis, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'submitted')
       RETURNING *`,
      [
        applicationNumber, userId, loan_type, loan_amount, loan_tenure_months, purpose,
        monthly_income || user.monthly_income,
        employment_type || user.employment_type,
        employer_name || user.employer_name,
        employment_years || user.employment_years,
        existing_emis || 0,
      ]
    );

    const application = appResult.rows[0];

    // Automatically trigger eligibility check
    try {
      const creditReport = await creditBureau.getCreditReport(userId);
      const eligibility = await eligibilityEngine.assess(application, user, creditReport);

      // Update application status and computed fields
      const newStatus = eligibility.is_eligible ? 'eligible' : 'ineligible';
      await query(
        `UPDATE loan_applications SET
           status = $1, interest_rate = $2, emi_amount = $3, reviewed_at = NOW(), updated_at = NOW()
         WHERE id = $4`,
        [newStatus, eligibility.interest_rate, eligibility.emi_amount, application.id]
      );

      application.status = newStatus;
      application.interest_rate = eligibility.interest_rate;
      application.emi_amount = eligibility.emi_amount;

      await auditLog({
        actorId: userId, actorType: 'system', actorName: 'Eligibility Engine',
        action: 'ELIGIBILITY_ASSESSED', entityType: 'application', entityId: application.id,
        details: { result: newStatus, score: eligibility.eligibility_score },
        ipAddress: req.ip,
      });
    } catch (eligErr) {
      console.error('Eligibility check failed:', eligErr.message);
    }

    await auditLog({
      actorId: userId, actorType: 'user', actorName: user.full_name,
      action: 'APPLICATION_SUBMITTED', entityType: 'application', entityId: application.id,
      details: { loan_type, loan_amount, application_number: applicationNumber },
      ipAddress: req.ip,
    });

    res.status(201).json({
      success: true,
      message: 'Loan application submitted successfully',
      data: application,
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// GET ALL APPLICATIONS FOR A USER
// ============================================================
exports.getMyApplications = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const result = await query(
      `SELECT la.*, 
              ec.is_eligible, ec.eligibility_score, ec.credit_score, ec.debt_to_income_ratio
       FROM loan_applications la
       LEFT JOIN eligibility_checks ec ON ec.application_id = la.id
       WHERE la.user_id = $1
       ORDER BY la.submitted_at DESC
       LIMIT $2 OFFSET $3`,
      [req.user.id, limit, offset]
    );

    const countResult = await query(
      'SELECT COUNT(*) FROM loan_applications WHERE user_id = $1',
      [req.user.id]
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
// GET SINGLE APPLICATION DETAILS
// ============================================================
exports.getApplicationById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT la.* FROM loan_applications la WHERE la.id = $1 AND la.user_id = $2`,
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    const application = result.rows[0];

    // Get eligibility check
    const eligResult = await query(
      'SELECT * FROM eligibility_checks WHERE application_id = $1 ORDER BY checked_at DESC LIMIT 1',
      [id]
    );

    // Get disbursement if any
    const disbResult = await query(
      'SELECT * FROM loan_disbursements WHERE application_id = $1',
      [id]
    );

    res.json({
      success: true,
      data: {
        ...application,
        eligibility: eligResult.rows[0] || null,
        disbursement: disbResult.rows[0] || null,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// GET STATUS TIMELINE
// ============================================================
exports.getApplicationStatus = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT application_number, loan_type, loan_amount, status, 
              submitted_at, reviewed_at, decision_at, disbursed_at, admin_remarks
       FROM loan_applications WHERE id = $1 AND user_id = $2`,
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    const app = result.rows[0];

    const statusOrder = ['submitted', 'under_review', 'eligible', 'ineligible', 'approved', 'rejected', 'disbursed'];
    const currentIndex = statusOrder.indexOf(app.status);

    const timeline = [
      { step: 'Application Submitted', status: 'submitted', timestamp: app.submitted_at, done: currentIndex >= 0 },
      { step: 'Under Review', status: 'under_review', timestamp: app.reviewed_at, done: currentIndex >= 1 },
      { step: 'Eligibility Assessed', status: 'eligible', timestamp: app.reviewed_at, done: currentIndex >= 2 },
      { step: 'Decision Made', status: 'approved', timestamp: app.decision_at, done: app.status === 'approved' || app.status === 'rejected' || app.status === 'disbursed' },
      { step: 'Loan Disbursed', status: 'disbursed', timestamp: app.disbursed_at, done: app.status === 'disbursed' },
    ];

    res.json({ success: true, data: { ...app, timeline } });
  } catch (err) {
    next(err);
  }
};
