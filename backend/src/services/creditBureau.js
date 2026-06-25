const { query } = require('../config/database');

/**
 * Simulated Credit Bureau Service
 * Generates deterministic credit scores and reports based on user profile.
 * In production this would call CIBIL, Equifax, or Experian APIs.
 */
class CreditBureauService {
  /**
   * Fetch or generate a credit report for a user.
   * Returns existing report if less than 30 days old.
   */
  async getCreditReport(userId) {
    // Check for an existing recent report
    const existing = await query(
      `SELECT * FROM credit_reports 
       WHERE user_id = $1 
       AND report_date > NOW() - INTERVAL '30 days'
       ORDER BY report_date DESC LIMIT 1`,
      [userId]
    );

    if (existing.rows.length > 0) {
      return existing.rows[0];
    }

    // Fetch user data to generate realistic score
    const userResult = await query('SELECT * FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) throw new Error('User not found');
    const user = userResult.rows[0];

    // Generate simulated credit data
    const report = this._generateCreditReport(user);

    // Persist the report
    const inserted = await query(
      `INSERT INTO credit_reports 
        (user_id, credit_score, total_accounts, active_accounts, closed_accounts, 
         overdue_accounts, total_outstanding, total_limit, payment_history,
         credit_utilization, oldest_account_years, enquiries_last_6months)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING *`,
      [
        userId,
        report.credit_score,
        report.total_accounts,
        report.active_accounts,
        report.closed_accounts,
        report.overdue_accounts,
        report.total_outstanding,
        report.total_limit,
        report.payment_history,
        report.credit_utilization,
        report.oldest_account_years,
        report.enquiries_last_6months,
      ]
    );

    return inserted.rows[0];
  }

  /**
   * Deterministically generate credit report from user profile.
   * Uses user ID hash for consistent scores across calls.
   */
  _generateCreditReport(user) {
    // Seed from user ID for consistency
    const seed = this._hashString(user.id);
    const rand = this._seededRandom(seed);

    const income = parseFloat(user.monthly_income) || 30000;
    const empYears = parseInt(user.employment_years) || 2;
    const empType = user.employment_type || 'salaried';

    // Base score influenced by profile quality
    let baseScore = 600;
    if (income > 100000) baseScore += 80;
    else if (income > 50000) baseScore += 50;
    else if (income > 25000) baseScore += 20;

    if (empYears > 5) baseScore += 40;
    else if (empYears > 2) baseScore += 20;
    else if (empYears < 1) baseScore -= 30;

    if (empType === 'salaried') baseScore += 20;
    else if (empType === 'self_employed') baseScore += 5;

    // Add randomness ±80 points
    const variation = Math.floor(rand() * 160) - 80;
    let creditScore = Math.min(900, Math.max(300, baseScore + variation));

    // Derive report attributes from score
    const totalAccounts = Math.floor(rand() * 8) + 2;
    const activeAccounts = Math.floor(rand() * (totalAccounts - 1)) + 1;
    const closedAccounts = totalAccounts - activeAccounts;
    const overdueAccounts = creditScore < 650 ? Math.floor(rand() * 2) : 0;
    const totalLimit = income * (8 + Math.floor(rand() * 12));
    const utilization = creditScore > 750 ? rand() * 0.3 : rand() * 0.6;
    const totalOutstanding = totalLimit * utilization;
    const oldestAccountYears = Math.floor(rand() * 8) + 1;
    const enquiries = Math.floor(rand() * 5);

    let paymentHistory;
    if (creditScore >= 800) paymentHistory = 'excellent';
    else if (creditScore >= 700) paymentHistory = 'good';
    else if (creditScore >= 600) paymentHistory = 'fair';
    else paymentHistory = 'poor';

    return {
      credit_score: creditScore,
      total_accounts: totalAccounts,
      active_accounts: activeAccounts,
      closed_accounts: closedAccounts,
      overdue_accounts: overdueAccounts,
      total_outstanding: Math.round(totalOutstanding),
      total_limit: Math.round(totalLimit),
      payment_history: paymentHistory,
      credit_utilization: Math.round(utilization * 100 * 100) / 100,
      oldest_account_years: oldestAccountYears,
      enquiries_last_6months: enquiries,
    };
  }

  _hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  _seededRandom(seed) {
    let s = seed;
    return function () {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
  }
}

module.exports = new CreditBureauService();
