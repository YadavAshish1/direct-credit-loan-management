const { query } = require('../config/database');
const creditBureau = require('../services/creditBureau');

exports.getProfile = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, full_name, email, phone, date_of_birth, pan_number, aadhaar_number,
              address, city, state, pincode, employment_type, employer_name,
              monthly_income, employment_years, created_at, updated_at
       FROM users WHERE id = $1`,
      [req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const {
      full_name, phone, date_of_birth, pan_number, aadhaar_number,
      address, city, state, pincode, employment_type, employer_name,
      monthly_income, employment_years,
    } = req.body;

    const result = await query(
      `UPDATE users SET
        full_name = COALESCE($1, full_name),
        phone = COALESCE($2, phone),
        date_of_birth = COALESCE($3, date_of_birth),
        pan_number = COALESCE($4, pan_number),
        aadhaar_number = COALESCE($5, aadhaar_number),
        address = COALESCE($6, address),
        city = COALESCE($7, city),
        state = COALESCE($8, state),
        pincode = COALESCE($9, pincode),
        employment_type = COALESCE($10, employment_type),
        employer_name = COALESCE($11, employer_name),
        monthly_income = COALESCE($12, monthly_income),
        employment_years = COALESCE($13, employment_years),
        updated_at = NOW()
       WHERE id = $14
       RETURNING id, full_name, email, phone, date_of_birth, pan_number,
                 address, city, state, pincode, employment_type, employer_name,
                 monthly_income, employment_years, updated_at`,
      [
        full_name, phone, date_of_birth, pan_number, aadhaar_number,
        address, city, state, pincode, employment_type, employer_name,
        monthly_income, employment_years, req.user.id,
      ]
    );

    res.json({ success: true, message: 'Profile updated', data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

exports.getCreditScore = async (req, res, next) => {
  try {
    const report = await creditBureau.getCreditReport(req.user.id);

    // Compute score band
    let band;
    if (report.credit_score >= 800) band = { label: 'Excellent', color: '#22c55e' };
    else if (report.credit_score >= 750) band = { label: 'Very Good', color: '#84cc16' };
    else if (report.credit_score >= 700) band = { label: 'Good', color: '#eab308' };
    else if (report.credit_score >= 650) band = { label: 'Fair', color: '#f97316' };
    else band = { label: 'Poor', color: '#ef4444' };

    res.json({ success: true, data: { ...report, band } });
  } catch (err) {
    next(err);
  }
};

exports.getDashboard = async (req, res, next) => {
  try {
    const applications = await query(
      `SELECT id, application_number, loan_type, loan_amount, status, submitted_at
       FROM loan_applications WHERE user_id = $1 ORDER BY submitted_at DESC LIMIT 5`,
      [req.user.id]
    );

    const stats = await query(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'approved') AS approved,
         COUNT(*) FILTER (WHERE status = 'rejected') AS rejected,
         COUNT(*) FILTER (WHERE status IN ('submitted','under_review','eligible')) AS pending,
         COUNT(*) FILTER (WHERE status = 'disbursed') AS disbursed,
         COUNT(*) AS total
       FROM loan_applications WHERE user_id = $1`,
      [req.user.id]
    );

    res.json({
      success: true,
      data: {
        recentApplications: applications.rows,
        stats: stats.rows[0],
      },
    });
  } catch (err) {
    next(err);
  }
};
