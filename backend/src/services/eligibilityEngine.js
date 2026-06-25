const { query } = require('../config/database');

/**
 * Loan Eligibility Assessment Engine
 * Evaluates loan applications against predefined banking rules.
 */
class EligibilityEngine {
  // Loan type configurations
  static LOAN_CONFIG = {
    personal: { minAmount: 10000, maxAmount: 2500000, minTenure: 12, maxTenure: 60, baseRate: 10.5 },
    home: { minAmount: 500000, maxAmount: 50000000, minTenure: 60, maxTenure: 360, baseRate: 8.5 },
    vehicle: { minAmount: 100000, maxAmount: 5000000, minTenure: 12, maxTenure: 84, baseRate: 9.0 },
    education: { minAmount: 50000, maxAmount: 10000000, minTenure: 12, maxTenure: 180, baseRate: 8.0 },
    business: { minAmount: 100000, maxAmount: 10000000, minTenure: 12, maxTenure: 120, baseRate: 12.0 },
  };

  /**
   * Run full eligibility assessment for a loan application.
   */
  async assess(application, user, creditReport) {
    const rules = [];
    let score = 0;
    const maxScore = 100;

    const age = this._calculateAge(user.date_of_birth);
    const monthlyIncome = parseFloat(application.monthly_income) || 0;
    const loanAmount = parseFloat(application.loan_amount) || 0;
    const tenureMonths = parseInt(application.loan_tenure_months) || 12;
    const existingEmis = parseFloat(application.existing_emis) || 0;
    const creditScore = creditReport ? parseInt(creditReport.credit_score) : 0;
    const empYears = parseInt(application.employment_years) || 0;
    const empType = application.employment_type || '';

    const config = EligibilityEngine.LOAN_CONFIG[application.loan_type] || EligibilityEngine.LOAN_CONFIG.personal;

    // Determine interest rate based on credit score
    let interestRate = config.baseRate;
    if (creditScore >= 800) interestRate -= 1.0;
    else if (creditScore >= 750) interestRate -= 0.5;
    else if (creditScore < 650) interestRate += 2.0;
    else if (creditScore < 700) interestRate += 1.0;

    // Calculate EMI
    const monthlyRate = interestRate / 12 / 100;
    const emiAmount = monthlyRate === 0
      ? loanAmount / tenureMonths
      : loanAmount * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths) /
        (Math.pow(1 + monthlyRate, tenureMonths) - 1);

    // Total monthly debt after this loan
    const totalMonthlyDebt = emiAmount + existingEmis;
    const debtToIncomeRatio = monthlyIncome > 0 ? (totalMonthlyDebt / monthlyIncome) * 100 : 100;

    // Max eligible amount (FOIR-based: max 45% of income for all debt)
    const maxEmiCapacity = monthlyIncome * 0.45 - existingEmis;
    const maxEligibleAmount = monthlyRate === 0
      ? maxEmiCapacity * tenureMonths
      : maxEmiCapacity * (Math.pow(1 + monthlyRate, tenureMonths) - 1) /
        (monthlyRate * Math.pow(1 + monthlyRate, tenureMonths));

    // ================================================================
    // RULE 1: Age Check (21–65 years)
    // ================================================================
    const ageRule = age >= 21 && age <= 65;
    rules.push({
      rule: 'Age Eligibility',
      description: `Applicant age must be between 21 and 65 years`,
      value: `${age} years`,
      threshold: '21–65 years',
      passed: ageRule,
      weight: 10,
    });
    if (ageRule) score += 10;

    // ================================================================
    // RULE 2: Minimum Income (₹25,000/month)
    // ================================================================
    const incomeRule = monthlyIncome >= 25000;
    rules.push({
      rule: 'Minimum Income',
      description: 'Monthly income must be at least ₹25,000',
      value: `₹${monthlyIncome.toLocaleString('en-IN')}`,
      threshold: '₹25,000/month',
      passed: incomeRule,
      weight: 15,
    });
    if (incomeRule) score += 15;
    else if (monthlyIncome >= 20000) score += 5;

    // ================================================================
    // RULE 3: Credit Score (min 650)
    // ================================================================
    const creditRule = creditScore >= 650;
    rules.push({
      rule: 'Credit Score',
      description: 'CIBIL score must be at least 650',
      value: creditScore.toString(),
      threshold: '≥ 650',
      passed: creditRule,
      weight: 25,
    });
    if (creditScore >= 750) score += 25;
    else if (creditScore >= 700) score += 20;
    else if (creditScore >= 650) score += 15;
    else if (creditScore >= 600) score += 5;

    // ================================================================
    // RULE 4: Debt-to-Income Ratio (max 45%)
    // ================================================================
    const dtiRule = debtToIncomeRatio <= 45;
    rules.push({
      rule: 'Debt-to-Income Ratio (FOIR)',
      description: 'Total EMI obligations must not exceed 45% of monthly income',
      value: `${debtToIncomeRatio.toFixed(1)}%`,
      threshold: '≤ 45%',
      passed: dtiRule,
      weight: 20,
    });
    if (dtiRule) {
      if (debtToIncomeRatio <= 30) score += 20;
      else if (debtToIncomeRatio <= 35) score += 15;
      else score += 10;
    }

    // ================================================================
    // RULE 5: Loan Amount vs Income (max 10× annual income)
    // ================================================================
    const annualIncome = monthlyIncome * 12;
    const loanToIncomeRatio = annualIncome > 0 ? loanAmount / annualIncome : 999;
    const ltiRule = loanToIncomeRatio <= 10;
    rules.push({
      rule: 'Loan-to-Income Ratio',
      description: 'Loan amount must not exceed 10× annual income',
      value: `${loanToIncomeRatio.toFixed(1)}×`,
      threshold: '≤ 10× annual income',
      passed: ltiRule,
      weight: 15,
    });
    if (ltiRule) {
      if (loanToIncomeRatio <= 4) score += 15;
      else if (loanToIncomeRatio <= 6) score += 10;
      else score += 5;
    }

    // ================================================================
    // RULE 6: Employment Type & Stability
    // ================================================================
    const validEmp = ['salaried', 'self_employed', 'business'].includes(empType);
    const empRule = validEmp && empYears >= 1;
    rules.push({
      rule: 'Employment Stability',
      description: 'Must be employed (salaried/self-employed/business) for at least 1 year',
      value: `${empType} — ${empYears} year(s)`,
      threshold: '≥ 1 year in valid employment',
      passed: empRule,
      weight: 10,
    });
    if (empRule) {
      if (empYears >= 5) score += 10;
      else if (empYears >= 3) score += 8;
      else score += 5;
    }

    // ================================================================
    // RULE 7: Loan Amount within product limits
    // ================================================================
    const amountRule = loanAmount >= config.minAmount && loanAmount <= config.maxAmount;
    rules.push({
      rule: 'Loan Amount Range',
      description: `${application.loan_type} loan must be between ₹${config.minAmount.toLocaleString('en-IN')} and ₹${config.maxAmount.toLocaleString('en-IN')}`,
      value: `₹${loanAmount.toLocaleString('en-IN')}`,
      threshold: `₹${config.minAmount.toLocaleString('en-IN')} – ₹${config.maxAmount.toLocaleString('en-IN')}`,
      passed: amountRule,
      weight: 5,
    });
    if (amountRule) score += 5;

    // ================================================================
    // Determine eligibility
    // ================================================================
    const criticalRulesFailed = [
      !ageRule,         // Must pass age check
      !incomeRule,      // Must pass income check  
      !creditRule,      // Must pass credit score
      !dtiRule,         // Must pass DTI
    ].filter(Boolean).length;

    const isEligible = criticalRulesFailed === 0 && ltiRule && amountRule;
    const eligibilityScore = Math.round((score / maxScore) * 100);

    // Generate remark
    let remarks;
    if (isEligible) {
      if (eligibilityScore >= 80) remarks = 'Excellent profile. Fast-track approval recommended.';
      else if (eligibilityScore >= 65) remarks = 'Good profile. Standard approval process.';
      else remarks = 'Marginally eligible. Additional verification may be required.';
    } else {
      const failedRules = rules.filter(r => !r.passed).map(r => r.rule).join(', ');
      remarks = `Application does not meet eligibility criteria. Failed rules: ${failedRules}.`;
    }

    // Persist eligibility check
    const result = await query(
      `INSERT INTO eligibility_checks
        (application_id, user_id, credit_score, monthly_income, loan_amount,
         loan_tenure_months, employment_type, employment_years, existing_emis, age,
         debt_to_income_ratio, emi_amount, max_eligible_amount, rules_evaluated,
         is_eligible, eligibility_score, remarks)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
       RETURNING *`,
      [
        application.id,
        application.user_id,
        creditScore,
        monthlyIncome,
        loanAmount,
        tenureMonths,
        empType,
        empYears,
        existingEmis,
        age,
        Math.round(debtToIncomeRatio * 100) / 100,
        Math.round(emiAmount * 100) / 100,
        Math.round(Math.max(0, maxEligibleAmount) * 100) / 100,
        JSON.stringify(rules),
        isEligible,
        eligibilityScore,
        remarks,
      ]
    );

    return {
      ...result.rows[0],
      interest_rate: interestRate,
      emi_amount: Math.round(emiAmount * 100) / 100,
      rules,
    };
  }

  _calculateAge(dob) {
    if (!dob) return 0;
    const today = new Date();
    const birthDate = new Date(dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  }
}

module.exports = new EligibilityEngine();
