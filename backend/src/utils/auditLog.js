const { query } = require('../config/database');

const auditLog = async ({ actorId, actorType, actorName, action, entityType, entityId, details, ipAddress }) => {
  try {
    await query(
      `INSERT INTO audit_logs (actor_id, actor_type, actor_name, action, entity_type, entity_id, details, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [actorId, actorType, actorName, action, entityType, entityId, JSON.stringify(details || {}), ipAddress]
    );
  } catch (err) {
    console.error('Audit log error:', err.message);
  }
};

module.exports = { auditLog };
