import { ApiError } from "../../utils/ApiError.js";

export const getAllSemiFinishedService = async (client, queryParams) => {
  const { page, limit, search, status, uom } = queryParams;
  const offset = (page - 1) * limit;
  const values = [];
  let conditions = ["1=1"];

  if (status === "ACTIVE") conditions.push(`is_active = true`);
  if (status === "INACTIVE") conditions.push(`is_active = false`);

  if (uom) {
    values.push(uom);
    conditions.push(`default_uom = $${values.length}`);
  }

  if (search) {
    values.push(`%${search}%`);
    conditions.push(
      `(item_name ILIKE $${values.length} OR item_code ILIKE $${values.length})`,
    );
  }

  const whereString = conditions.join(" AND ");

  const res = await client.query(
    `
    SELECT id, item_name, item_code, default_uom, is_active, created_at, updated_at
    FROM steel_erp.semi_finished_items
    WHERE ${whereString}
    ORDER BY is_active DESC, item_name ASC
    LIMIT $${values.length + 1} OFFSET $${values.length + 2}
  `,
    [...values, limit, offset],
  );

  const countRes = await client.query(
    `SELECT count(id)::int as total FROM steel_erp.semi_finished_items WHERE ${whereString}`,
    values,
  );

  return {
    data: res.rows,
    meta: {
      total: countRes.rows[0].total,
      page,
      limit,
      total_pages: Math.ceil(countRes.rows[0].total / limit),
    },
  };
};

export const getSemiFinishedByIdService = async (client, id) => {
  const res = await client.query(
    `
    WITH LedgerHistory AS (
      SELECT 
        sl.movement_date, sl.movement_type, sl.ownership_type, 
        sl.quantity_in, sl.quantity_out, sl.reference_module,
        p.party_name as owner_party
      FROM steel_erp.stock_ledger sl
      LEFT JOIN steel_erp.parties p ON p.id = sl.owner_party_id
      WHERE sl.semi_finished_id = $1
      ORDER BY sl.movement_ts DESC
      LIMIT 10
    ),
    LiveBalances AS (
      SELECT 
        COALESCE(SUM(CASE WHEN ownership_type = 'OWN' THEN quantity_in - quantity_out ELSE 0 END), 0) as own_stock,
        COALESCE(SUM(CASE WHEN ownership_type = 'JOB_WORK' THEN quantity_in - quantity_out ELSE 0 END), 0) as job_work_stock
      FROM steel_erp.stock_ledger
      WHERE semi_finished_id = $1
    )
    SELECT 
      sfi.*,
      lb.own_stock,
      lb.job_work_stock,
      COALESCE((SELECT json_agg(lh.*) FROM LedgerHistory lh), '[]'::json) as recent_movements
    FROM steel_erp.semi_finished_items sfi
    CROSS JOIN LiveBalances lb
    WHERE sfi.id = $1
  `,
    [id],
  );

  if (!res.rowCount) throw new ApiError(404, "Semi-Finished item not found.");
  return res.rows[0];
};

export const createSemiFinishedService = async (client, data) => {
  const { item_name, item_code, default_uom } = data;

  const check = await client.query(
    `SELECT 1 FROM steel_erp.semi_finished_items WHERE lower(item_name) = lower($1) OR lower(item_code) = lower($2)`,
    [item_name, item_code],
  );
  if (check.rowCount > 0)
    throw new ApiError(400, "Item Name or Code already exists.");

  const res = await client.query(
    `
    INSERT INTO steel_erp.semi_finished_items (item_name, item_code, default_uom)
    VALUES ($1, $2, $3) RETURNING *
  `,
    [item_name, item_code, default_uom],
  );

  return res.rows[0];
};

export const updateSemiFinishedService = async (client, id, data) => {
  const updates = [];
  const values = [];
  let paramIdx = 1;

  for (const [key, val] of Object.entries(data)) {
    updates.push(`${key} = $${paramIdx}`);
    values.push(val);
    paramIdx++;
  }

  if (updates.length === 0)
    throw new ApiError(400, "No valid fields provided for update.");
  values.push(id);

  const res = await client.query(
    `
    UPDATE steel_erp.semi_finished_items 
    SET ${updates.join(", ")}
    WHERE id = $${paramIdx} RETURNING *
  `,
    values,
  );

  if (!res.rowCount) throw new ApiError(404, "Item not found.");
  return res.rows[0];
};

export const deleteSemiFinishedService = async (client, id) => {
  try {
    await client.query(
      `DELETE FROM steel_erp.semi_finished_items WHERE id = $1`,
      [id],
    );
    return { message: "Item deleted successfully." };
  } catch (error) {
    if (error.code === "23503") {
      await client.query(
        `UPDATE steel_erp.semi_finished_items SET is_active = false WHERE id = $1`,
        [id],
      );
      return {
        message:
          "Item is in use and cannot be deleted. It has been marked as INACTIVE instead.",
      };
    }
    throw error;
  }
};
