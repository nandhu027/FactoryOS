import { ApiError } from "../../utils/ApiError.js";

const buildDateFilter = (
  dateFilter,
  startDate,
  endDate,
  targetColumn,
  values,
) => {
  if (!dateFilter) return "";
  let sql = "";
  switch (dateFilter) {
    case "today":
      sql = ` AND ${targetColumn}::date = CURRENT_DATE`;
      break;
    case "yesterday":
      sql = ` AND ${targetColumn}::date = CURRENT_DATE - INTERVAL '1 day'`;
      break;
    case "nextday":
      sql = ` AND ${targetColumn}::date = CURRENT_DATE + INTERVAL '1 day'`;
      break;
    case "week":
      sql = ` AND ${targetColumn}::date >= date_trunc('week', CURRENT_DATE) AND ${targetColumn}::date < date_trunc('week', CURRENT_DATE) + INTERVAL '1 week'`;
      break;
    case "month":
      sql = ` AND ${targetColumn}::date >= date_trunc('month', CURRENT_DATE) AND ${targetColumn}::date < date_trunc('month', CURRENT_DATE) + INTERVAL '1 month'`;
      break;
    case "custom":
      values.push(startDate, endDate);
      sql = ` AND ${targetColumn}::date >= $${values.length - 1} AND ${targetColumn}::date <= $${values.length}`;
      break;
  }
  return sql;
};

const setAuditContext = async (client, userId) => {
  if (userId) {
    await client.query(`SELECT set_config('app.user_id', $1::text, true)`, [
      userId,
    ]);
  }
};

const getOrCreateWorkType = async (client, typeValue) => {
  if (!isNaN(typeValue)) return Number(typeValue);
  const workName = String(typeValue).trim();
  const existing = await client.query(
    `SELECT id FROM steel_erp.work_types WHERE LOWER(work_type_name) = LOWER($1) LIMIT 1`,
    [workName],
  );
  if (existing.rowCount > 0) return existing.rows[0].id;
  const created = await client.query(
    `INSERT INTO steel_erp.work_types (work_type_name) VALUES ($1) RETURNING id`,
    [workName],
  );
  return created.rows[0].id;
};

export const createWorkTypeService = async (client, data, userId) => {
  await setAuditContext(client, userId);
  const { work_type_name, description } = data;
  const existing = await client.query(
    `SELECT id FROM steel_erp.work_types WHERE LOWER(work_type_name) = LOWER($1)`,
    [work_type_name],
  );
  if (existing.rowCount > 0)
    throw new ApiError(409, "Work type already exists.");
  const result = await client.query(
    `INSERT INTO steel_erp.work_types (work_type_name, description) VALUES ($1, $2) RETURNING *`,
    [work_type_name, description || null],
  );
  return result.rows[0];
};

export const getWorkTypesService = async (client, query) => {
  const { search, is_active } = query;
  let conditions = ["1=1"];
  let values = [];
  if (is_active !== undefined) {
    values.push(is_active);
    conditions.push(`is_active = $${values.length}`);
  }
  if (search) {
    values.push(`%${search}%`);
    conditions.push(`LOWER(work_type_name) LIKE LOWER($${values.length})`);
  }
  const result = await client.query(
    `SELECT * FROM steel_erp.work_types WHERE ${conditions.join(" AND ")} ORDER BY work_type_name ASC`,
    values,
  );
  return result.rows;
};

export const updateWorkTypeService = async (client, id, data, userId) => {
  await setAuditContext(client, userId);
  const { work_type_name, description, is_active } = data;
  const result = await client.query(
    `UPDATE steel_erp.work_types SET work_type_name = COALESCE($1, work_type_name), description = COALESCE($2, description), is_active = COALESCE($3, is_active), updated_at = now() WHERE id = $4 RETURNING *`,
    [work_type_name, description, is_active, id],
  );
  if (result.rowCount === 0) throw new ApiError(404, "Work type not found");
  return result.rows[0];
};

export const deleteWorkTypeService = async (client, id, userId) => {
  await setAuditContext(client, userId);
  const usage = await client.query(
    `SELECT 1 FROM steel_erp.personnel_work_types pwt JOIN steel_erp.personnel p ON pwt.personnel_id = p.id WHERE pwt.work_type_id = $1 AND p.is_active = true LIMIT 1`,
    [id],
  );
  if (usage.rowCount > 0)
    throw new ApiError(
      400,
      "Cannot delete work type while it is assigned to active personnel.",
    );
  const result = await client.query(
    `UPDATE steel_erp.work_types SET is_active = false WHERE id = $1 RETURNING id`,
    [id],
  );
  if (result.rowCount === 0) throw new ApiError(404, "Work type not found");
  return { message: "Work type deactivated successfully." };
};

export const createStaffService = async (client, data, userId) => {
  await setAuditContext(client, userId); // 🌟 Sets audit context for triggers
  const { name, phone, address, category, work_types, machine_ids } = data;

  const result = await client.query(
    `INSERT INTO steel_erp.personnel (personnel_type, full_name, phone, address, is_active) VALUES ($1, $2, $3, $4, true) RETURNING *`,
    [category, name, phone || null, address || null],
  );

  const person = result.rows[0];
  if (work_types?.length > 0) {
    for (const typeValue of work_types) {
      const workTypeId = await getOrCreateWorkType(client, typeValue);
      await client.query(
        `INSERT INTO steel_erp.personnel_work_types (personnel_id, work_type_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [person.id, workTypeId],
      );
    }
  }
  if (machine_ids?.length > 0) {
    for (const machineId of machine_ids) {
      await client.query(
        `INSERT INTO steel_erp.personnel_machine_access (personnel_id, machine_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [person.id, machineId],
      );
    }
  }
  return person;
};

export const updateStaffService = async (client, id, data, userId) => {
  await setAuditContext(client, userId); // 🌟 Sets audit context for triggers
  const { name, phone, address, category, is_active, work_types, machine_ids } =
    data;

  const check = await client.query(
    `SELECT id FROM steel_erp.personnel WHERE id = $1`,
    [id],
  );
  if (check.rowCount === 0) throw new ApiError(404, "Personnel not found.");

  // FIX: Removed updated_by from the SQL query itself
  await client.query(
    `UPDATE steel_erp.personnel SET full_name = COALESCE($1, full_name), phone = COALESCE($2, phone), address = COALESCE($3, address), personnel_type = COALESCE($4, personnel_type), is_active = COALESCE($5, is_active), updated_at = now() WHERE id = $6`,
    [name, phone, address, category, is_active, id],
  );

  if (work_types !== undefined) {
    await client.query(
      `DELETE FROM steel_erp.personnel_work_types WHERE personnel_id = $1`,
      [id],
    );
    for (const typeValue of work_types) {
      const workTypeId = await getOrCreateWorkType(client, typeValue);
      await client.query(
        `INSERT INTO steel_erp.personnel_work_types (personnel_id, work_type_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [id, workTypeId],
      );
    }
  }
  if (machine_ids !== undefined) {
    await client.query(
      `DELETE FROM steel_erp.personnel_machine_access WHERE personnel_id = $1`,
      [id],
    );
    for (const machineId of machine_ids) {
      await client.query(
        `INSERT INTO steel_erp.personnel_machine_access (personnel_id, machine_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [id, machineId],
      );
    }
  }
  return { message: "Personnel updated successfully." };
};

export const getStaffService = async (client, query) => {
  const { search, personnel_type, is_active, page = 1, limit = 50 } = query;
  const offset = (page - 1) * limit;
  let conditions = ["1=1"];
  let values = [];

  if (is_active !== undefined) {
    values.push(is_active);
    conditions.push(`p.is_active = $${values.length}`);
  }
  if (search) {
    values.push(`%${search}%`);
    conditions.push(`LOWER(p.full_name) LIKE LOWER($${values.length})`);
  }
  if (personnel_type) {
    values.push(personnel_type);
    conditions.push(`p.personnel_type = $${values.length}`);
  }

  const sql = `
    SELECT 
      p.id, p.personnel_type, p.full_name, p.phone, p.address, p.is_active, p.created_at,
      COALESCE(JSON_AGG(DISTINCT wt.work_type_name) FILTER (WHERE wt.id IS NOT NULL), '[]') AS work_types,
      COALESCE(JSON_AGG(DISTINCT m.machine_name) FILTER (WHERE m.id IS NOT NULL), '[]') AS machines
    FROM steel_erp.personnel p
    LEFT JOIN steel_erp.personnel_work_types pw ON p.id = pw.personnel_id
    LEFT JOIN steel_erp.work_types wt ON pw.work_type_id = wt.id
    LEFT JOIN steel_erp.personnel_machine_access pm ON p.id = pm.personnel_id
    LEFT JOIN steel_erp.machines m ON pm.machine_id = m.id
    WHERE ${conditions.join(" AND ")}
    GROUP BY p.id
    ORDER BY p.full_name ASC
    LIMIT $${values.length + 1} OFFSET $${values.length + 2}
  `;
  const countSql = `SELECT COUNT(*) FROM steel_erp.personnel p WHERE ${conditions.join(" AND ")}`;
  const [dataResult, countResult] = await Promise.all([
    client.query(sql, [...values, limit, offset]),
    client.query(countSql, values),
  ]);
  return {
    data: dataResult.rows,
    meta: {
      total: parseInt(countResult.rows[0].count, 10),
      page: Number(page),
      limit: Number(limit),
      total_pages: Math.ceil(parseInt(countResult.rows[0].count, 10) / limit),
    },
  };
};

export const deleteStaffService = async (client, id, userId) => {
  await setAuditContext(client, userId); // 🌟 Ensure Postgres knows who is deleting!

  const existing = await client.query(
    `SELECT id, full_name FROM steel_erp.personnel WHERE id = $1`,
    [id],
  );
  if (existing.rowCount === 0) throw new ApiError(404, "Personnel not found.");

  // 1. Calculate Balance to check for pending payments
  const payRes = await client.query(
    `SELECT amount, reason FROM steel_erp.personnel_payments WHERE personnel_id = $1 AND COALESCE(is_reversed, false) = false`,
    [id],
  );

  let total_paid = 0;
  let total_billed = 0;

  payRes.rows.forEach((p) => {
    total_paid += Number(p.amount);
    const billMatch = p.reason?.match(/\| BILL:([\d.]+)/);
    if (billMatch) total_billed += Number(billMatch[1]);
  });

  const balance = total_billed - total_paid;

  // 2. Block deletion if balance is NOT zero (allowing a tiny 0.01 margin for float math issues)
  if (Math.abs(balance) > 0.01) {
    throw new ApiError(
      400,
      `Cannot delete: Please clear the pending payment balance (₹${Math.abs(balance).toFixed(2)}) for this personnel first.`,
    );
  }

  // 3. Perform Permanent Hard Delete of all associated records to prevent Foreign Key constraints from failing
  await client.query(
    `DELETE FROM steel_erp.personnel_work_types WHERE personnel_id = $1`,
    [id],
  );
  await client.query(
    `DELETE FROM steel_erp.personnel_machine_access WHERE personnel_id = $1`,
    [id],
  );
  await client.query(
    `DELETE FROM steel_erp.staff_attendance WHERE personnel_id = $1`,
    [id],
  );
  await client.query(
    `DELETE FROM steel_erp.personnel_payments WHERE personnel_id = $1`,
    [id],
  );
  await client.query(
    `DELETE FROM steel_erp.production_step_workers WHERE personnel_id = $1`,
    [id],
  );
  await client.query(
    `DELETE FROM steel_erp.contractor_jobs WHERE contractor_id = $1`,
    [id],
  );

  // Finally, delete the personnel record entirely
  await client.query(`DELETE FROM steel_erp.personnel WHERE id = $1`, [id]);

  return {
    message: "Personnel and all associated records permanently deleted.",
    deleted: true,
  };
};

export const getPersonnelOngoingWorkService = async (
  client,
  personnelId,
  query,
) => {
  const {
    date_filter,
    start_date,
    end_date,
    status,
    limit = 50,
    page = 1,
  } = query;
  const offset = (page - 1) * limit;

  const userCheck = await client.query(
    `SELECT personnel_type FROM steel_erp.personnel WHERE id = $1`,
    [personnelId],
  );
  if (userCheck.rowCount === 0) throw new ApiError(404, "Personnel not found");
  const pType = userCheck.rows[0].personnel_type;

  let workItems = [];
  let values = [personnelId];
  const dateSql = buildDateFilter(
    date_filter,
    start_date,
    end_date,
    "created_at",
    values,
  );

  if (pType === "STAFF") {
    let statusSql =
      status === "OPEN"
        ? `AND ps.status IN ('PLANNED', 'IN_PROGRESS')`
        : status === "CLOSED"
          ? `AND ps.status IN ('COMPLETED', 'CANCELLED')`
          : "";
    const staffWorkSql = `
      SELECT 
        ps.id as work_id, 'PRODUCTION_STEP' as work_type, ps.step_name as description, ps.status, ps.input_qty as target_qty, ps.input_uom as uom, ps.created_at as assigned_date, po.batch_no as reference_no, m.machine_name, ps.started_at, ps.completed_at,
        COALESCE((SELECT SUM(quantity_out) FROM steel_erp.stock_ledger WHERE reference_module = 'PRODUCTION' AND reference_line_id = ps.id AND movement_type = 'PRODUCTION_CONSUME'), 0) as consumed_so_far,
        GREATEST(0, ps.input_qty - COALESCE((SELECT SUM(quantity_out) FROM steel_erp.stock_ledger WHERE reference_module = 'PRODUCTION' AND reference_line_id = ps.id AND movement_type = 'PRODUCTION_CONSUME'), 0)) as pending_qty
      FROM steel_erp.production_steps ps
      JOIN steel_erp.production_step_workers psw ON ps.id = psw.production_step_id
      JOIN steel_erp.production_orders po ON ps.production_order_id = po.id
      LEFT JOIN steel_erp.machines m ON ps.machine_id = m.id
      WHERE psw.personnel_id = $1 ${dateSql.replace(/created_at/g, "ps.created_at")} ${statusSql}
      ORDER BY ps.created_at DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}
    `;
    const result = await client.query(staffWorkSql, [...values, limit, offset]);
    workItems = result.rows;
  } else if (pType === "CONTRACTOR") {
    let statusSql =
      status === "OPEN"
        ? `AND cj.status = 'OPEN'`
        : status === "CLOSED"
          ? `AND cj.status IN ('CLOSED', 'CANCELLED')`
          : "";
    const contractorWorkSql = `
      SELECT 
        cj.id as work_id, 'CONTRACTOR_JOB' as work_type, 'Job Work - ' || COALESCE(sfi.item_name, p.product_name, 'Legacy Material') as description, cj.status, cj.qty_sent as target_qty, cj.uom, cj.out_date as assigned_date, cj.job_no as reference_no, null as machine_name, cj.out_date as started_at, cj.updated_at as completed_at,
        COALESCE((SELECT SUM(quantity) FROM steel_erp.contractor_job_returns cr WHERE cr.contractor_job_id = cj.id), 0) as consumed_so_far,
        GREATEST(0, cj.qty_sent - COALESCE((SELECT SUM(quantity) FROM steel_erp.contractor_job_returns cr WHERE cr.contractor_job_id = cj.id), 0)) as pending_qty
      FROM steel_erp.contractor_jobs cj
      LEFT JOIN steel_erp.semi_finished_items sfi ON cj.semi_finished_id = sfi.id
      LEFT JOIN steel_erp.products p ON cj.product_id = p.id
      WHERE cj.contractor_id = $1 ${dateSql.replace(/created_at/g, "cj.created_at")} ${statusSql}
      ORDER BY cj.created_at DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}
    `;
    const result = await client.query(contractorWorkSql, [
      ...values,
      limit,
      offset,
    ]);
    workItems = result.rows;
  }

  return {
    data: workItems,
    meta: { page: Number(page), limit: Number(limit) },
  };
};

export const getPersonnelPaymentsService = async (
  client,
  personnelId,
  query,
) => {
  const { date_filter, start_date, end_date, limit = 50, page = 1 } = query;
  const offset = (page - 1) * limit;

  let values = [personnelId];
  let conditions = ["pp.personnel_id = $1"];

  const dateFilterSql = buildDateFilter(
    date_filter,
    start_date,
    end_date,
    "pp.payment_date",
    values,
  );
  if (dateFilterSql) conditions.push(dateFilterSql.replace(" AND ", ""));

  const sql = `
    SELECT pp.id, pp.payment_date, pp.amount, pp.reason, pp.created_at, u.full_name as recorded_by
    FROM steel_erp.personnel_payments pp
    LEFT JOIN steel_erp.users u ON pp.created_by = u.id
    WHERE ${conditions.join(" AND ")}
    ORDER BY pp.payment_date DESC, pp.created_at DESC
    LIMIT $${values.length + 1} OFFSET $${values.length + 2}
  `;

  const periodSql = `SELECT amount, reason FROM steel_erp.personnel_payments pp WHERE ${conditions.join(" AND ")}`;
  const allTimeSql = `SELECT amount, reason FROM steel_erp.personnel_payments WHERE personnel_id = $1`;

  const [paymentRes, periodRes, allTimeRes] = await Promise.all([
    client.query(sql, [...values, limit, offset]),
    client.query(periodSql, values),
    client.query(allTimeSql, [personnelId]),
  ]);

  let period_paid = 0;
  let period_billed = 0;
  periodRes.rows.forEach((p) => {
    period_paid += Number(p.amount);
    const billMatch = p.reason?.match(/\| BILL:([\d.]+)/);
    if (billMatch) period_billed += Number(billMatch[1]);
  });

  let all_time_paid = 0;
  let all_time_billed = 0;
  allTimeRes.rows.forEach((p) => {
    all_time_paid += Number(p.amount);
    const billMatch = p.reason?.match(/\| BILL:([\d.]+)/);
    if (billMatch) all_time_billed += Number(billMatch[1]);
  });

  const balance = all_time_billed - all_time_paid;

  return {
    data: paymentRes.rows,
    summary: {
      period_paid,
      period_billed,
      total_paid: all_time_paid,
      total_billed: all_time_billed,
      balance,
      standing: balance > 0 ? "PENDING" : balance < 0 ? "ADVANCE" : "SETTLED",
    },
    meta: { page: Number(page), limit: Number(limit) },
  };
};

export const getPersonnelAttendanceService = async (
  client,
  personnelId,
  query,
) => {
  const { date_filter, start_date, end_date, limit = 50, page = 1 } = query;
  const offset = (page - 1) * limit;
  let values = [personnelId];
  let conditions = ["personnel_id = $1"];
  const dateFilterSql = buildDateFilter(
    date_filter,
    start_date,
    end_date,
    "attendance_date",
    values,
  );
  if (dateFilterSql) conditions.push(dateFilterSql.replace(" AND ", ""));

  const sql = `
    SELECT id, attendance_date, status, remarks, morning_ot_type, morning_ot_value, evening_ot_type, evening_ot_value
    FROM steel_erp.vw_staff_attendance_daily
    WHERE ${conditions.join(" AND ")}
    ORDER BY attendance_date DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}
  `;
  const sumSql = `
    SELECT 
      COALESCE(SUM(CASE WHEN status = 'PRESENT' THEN 1 WHEN status = 'HALF_DAY' THEN 0.5 ELSE 0 END), 0) as total_present,
      COALESCE(SUM(CASE WHEN status = 'ABSENT' THEN 1 ELSE 0 END), 0) as total_absent,
      COALESCE(SUM(CASE WHEN status = 'HALF_DAY' THEN 1 ELSE 0 END), 0) as total_half_days,
      COALESCE(SUM(CASE WHEN status = 'HOLIDAY' THEN 1 ELSE 0 END), 0) as total_holidays,
      COALESCE(SUM(CASE WHEN morning_ot_type = 'HALF_DAY_SHIFT' THEN morning_ot_value ELSE 0 END + CASE WHEN evening_ot_type = 'HALF_DAY_SHIFT' THEN evening_ot_value ELSE 0 END), 0) as total_ot_shifts,
      COALESCE(SUM(CASE WHEN morning_ot_type = 'HOURLY' THEN morning_ot_value ELSE 0 END + CASE WHEN evening_ot_type = 'HOURLY' THEN evening_ot_value ELSE 0 END), 0) as total_ot_hours
    FROM steel_erp.vw_staff_attendance_daily WHERE ${conditions.join(" AND ")}
  `;

  const [dataRes, sumRes] = await Promise.all([
    client.query(sql, [...values, limit, offset]),
    client.query(sumSql, values),
  ]);
  return {
    data: dataRes.rows,
    summary: sumRes.rows[0],
    meta: { page: Number(page), limit: Number(limit) },
  };
};
