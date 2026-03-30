import { ApiError } from "../../utils/ApiError.js";

export const createMachineService = async (client, data) => {
  const {
    machine_name,
    physical_weight_kg,
    capacity_per_hour,
    capacity_uom,
    status,
  } = data;

  const existing = await client.query(
    `SELECT id FROM steel_erp.machines WHERE LOWER(machine_name) = LOWER($1)`,
    [machine_name],
  );
  if (existing.rowCount > 0)
    throw new ApiError(409, "Machine name already exists on the floor.");

  const result = await client.query(
    `INSERT INTO steel_erp.machines (machine_name, physical_weight_kg, capacity_per_hour, capacity_uom, status)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [
      machine_name,
      physical_weight_kg || null,
      capacity_per_hour || null,
      capacity_uom || null,
      status || "ACTIVE",
    ],
  );
  return result.rows[0];
};

export const getMachinesService = async (client, query) => {
  const { page, limit, search, status, is_active } = query;
  const offset = (page - 1) * limit;

  let conditions = ["1=1"];
  let values = [];

  if (is_active !== undefined) {
    values.push(is_active);
    conditions.push(`is_active = $${values.length}`);
  }
  if (status) {
    values.push(status);
    conditions.push(`status = $${values.length}`);
  }
  if (search) {
    values.push(`%${search}%`);
    conditions.push(`machine_name ILIKE $${values.length}`);
  }

  const sql = `
    SELECT * FROM steel_erp.machines 
    WHERE ${conditions.join(" AND ")} 
    ORDER BY is_active DESC, machine_name ASC 
    LIMIT $${values.length + 1} OFFSET $${values.length + 2}
  `;

  const countSql = `SELECT count(id)::int as total FROM steel_erp.machines WHERE ${conditions.join(" AND ")}`;

  const [dataRes, countRes] = await Promise.all([
    client.query(sql, [...values, limit, offset]),
    client.query(countSql, values),
  ]);

  return {
    data: dataRes.rows,
    meta: { total: countRes.rows[0].total, page, limit },
  };
};

export const getMachineByIdService = async (client, id, filters) => {
  const machineRes = await client.query(
    `SELECT * FROM steel_erp.machines WHERE id = $1`,
    [id],
  );
  if (!machineRes.rowCount) throw new ApiError(404, "Machine not found");
  const machine = machineRes.rows[0];

  let dateFilter = "";
  let values = [id];
  if (filters.startDate && filters.endDate) {
    values.push(filters.startDate, filters.endDate);
    dateFilter = `AND ps.created_at BETWEEN $2 AND $3::date + interval '1 day'`;
  }

  const timelineRes = await client.query(
    `
    SELECT 
      ps.id as step_id, ps.step_no, ps.step_name, ps.status as step_status, 
      ps.created_at, ps.started_at, ps.completed_at, ps.input_qty, ps.input_uom, ps.scrap_qty,
      po.batch_no, po.business_model,
      p.party_name,
      (
        SELECT json_agg(json_build_object('id', per.id, 'name', per.full_name, 'type', per.personnel_type)) 
        FROM steel_erp.production_step_workers psw 
        JOIN steel_erp.personnel per ON psw.personnel_id = per.id 
        WHERE psw.production_step_id = ps.id
      ) as workers,
      (
        SELECT json_agg(json_build_object('name', COALESCE(pr.product_name, sf.item_name), 'qty', pso.quantity, 'uom', pso.uom, 'type', pso.output_item_kind)) 
        FROM steel_erp.production_step_outputs pso 
        LEFT JOIN steel_erp.products pr ON pso.product_id = pr.id 
        LEFT JOIN steel_erp.semi_finished_items sf ON pso.semi_finished_id = sf.id 
        WHERE pso.production_step_id = ps.id
      ) as yields,
      COALESCE((SELECT SUM(quantity_out) FROM steel_erp.stock_ledger WHERE reference_module = 'PRODUCTION' AND reference_line_id = ps.id AND movement_type = 'PRODUCTION_CONSUME'), 0) AS consumed_so_far,
      COALESCE((SELECT SUM(quantity_in) FROM steel_erp.stock_ledger WHERE reference_module = 'PRODUCTION' AND reference_line_id = ps.id AND movement_type = 'PRODUCTION_OUTPUT'), 0) AS yielded_so_far,
      COALESCE((SELECT SUM(quantity_in) FROM steel_erp.stock_ledger WHERE reference_module = 'PRODUCTION' AND reference_line_id = ps.id AND movement_type = 'PRODUCTION_SCRAP'), 0) AS scrap_generated
    FROM steel_erp.production_steps ps
    JOIN steel_erp.production_orders po ON ps.production_order_id = po.id
    LEFT JOIN steel_erp.parties p ON po.party_id = p.id
    WHERE ps.machine_id = $1 ${dateFilter}
    ORDER BY ps.created_at DESC
    LIMIT 50
  `,
    values,
  );

  return { ...machine, operational_timeline: timelineRes.rows };
};

export const updateMachineService = async (client, id, data) => {
  const result = await client.query(
    `UPDATE steel_erp.machines 
     SET machine_name = COALESCE($1, machine_name),
         physical_weight_kg = $2,
         capacity_per_hour = $3,
         capacity_uom = $4,
         status = COALESCE($5, status),
         is_active = COALESCE($6, is_active),
         updated_at = now()
     WHERE id = $7 RETURNING *`,
    [
      data.machine_name,
      data.physical_weight_kg !== undefined ? data.physical_weight_kg : null,
      data.capacity_per_hour !== undefined ? data.capacity_per_hour : null,
      data.capacity_uom !== undefined ? data.capacity_uom : null,
      data.status,
      data.is_active,
      id,
    ],
  );
  if (result.rowCount === 0) throw new ApiError(404, "Machine not found");
  return result.rows[0];
};

export const deleteMachineService = async (client, id) => {
  const existing = await client.query(
    `SELECT id, machine_name FROM steel_erp.machines WHERE id = $1`,
    [id],
  );
  if (existing.rowCount === 0) throw new ApiError(404, "Machine not found");

  const usageCheck = await client.query(
    `SELECT 1 FROM steel_erp.production_steps WHERE machine_id = $1 LIMIT 1`,
    [id],
  );

  if (usageCheck.rowCount > 0) {
    await client.query(
      `UPDATE steel_erp.machines SET is_active = false, status = 'INACTIVE', updated_at = now() WHERE id = $1`,
      [id],
    );
    return {
      message:
        "Machine is linked to historical production batches. It cannot be permanently deleted, but has been safely deactivated.",
      deactivated: true,
    };
  } else {
    await client.query(`DELETE FROM steel_erp.machines WHERE id = $1`, [id]);
    return {
      message: "Machine permanently eradicated from the system.",
      deleted: true,
    };
  }
};
