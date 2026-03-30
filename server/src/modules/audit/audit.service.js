export const getAuditLogsService = async (client, queryParams) => {
  const {
    page = 1,
    limit = 50,
    search = "",
    action,
    table_name,
    user_id,
    start_date,
    end_date,
  } = queryParams;

  const offset = (page - 1) * limit;
  const values = [];
  let conditions = ["1=1"];

  if (action) {
    values.push(action);
    conditions.push(`a.action = $${values.length}`);
  }

  if (table_name) {
    values.push(table_name);
    conditions.push(`a.table_name = $${values.length}`);
  }

  if (user_id) {
    values.push(user_id);
    conditions.push(`a.changed_by = $${values.length}`);
  }

  if (start_date && end_date) {
    values.push(start_date, end_date);
    conditions.push(
      `a.changed_at::date BETWEEN $${values.length - 1} AND $${values.length}`,
    );
  }

  if (search) {
    values.push(`%${search}%`);
    conditions.push(
      `(a.table_name ILIKE $${values.length} OR a.record_pk ILIKE $${values.length} OR u.full_name ILIKE $${values.length})`,
    );
  }

  const whereString = conditions.join(" AND ");

  const sql = `
    SELECT 
      a.id, 
      a.table_name, 
      a.record_pk, 
      a.action, 
      a.old_data, 
      a.new_data, 
      a.changed_at,
      u.full_name as changed_by_name,
      u.username as changed_by_username
    FROM steel_erp.audit_logs a
    LEFT JOIN steel_erp.users u ON a.changed_by = u.id
    WHERE ${whereString}
    ORDER BY a.changed_at DESC, a.id DESC
    LIMIT $${values.length + 1} OFFSET $${values.length + 2}
  `;

  const countSql = `
    SELECT count(a.id)::int as total
    FROM steel_erp.audit_logs a
    LEFT JOIN steel_erp.users u ON a.changed_by = u.id
    WHERE ${whereString}
  `;

  const [dataRes, countRes] = await Promise.all([
    client.query(sql, [...values, limit, offset]),
    client.query(countSql, values),
  ]);

  return {
    data: dataRes.rows,
    meta: {
      total: countRes.rows[0].total,
      page: Number(page),
      limit: Number(limit),
      total_pages: Math.ceil(countRes.rows[0].total / limit),
    },
  };
};

export const getAuditTablesService = async (client) => {
  const res = await client.query(
    `SELECT DISTINCT table_name FROM steel_erp.audit_logs ORDER BY table_name ASC`,
  );
  return res.rows.map((r) => r.table_name);
};
