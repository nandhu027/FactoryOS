import { ApiError } from "../../utils/ApiError.js";

export const createProductService = async (client, data) => {
  const { product_name, product_code, default_uom, is_active } = data;
  const res = await client.query(
    `INSERT INTO steel_erp.products (product_name, product_code, default_uom, is_active) VALUES ($1, $2, $3, $4) RETURNING *`,
    [product_name, product_code, default_uom, is_active],
  );
  return res.rows[0];
};

export const getProductsService = async (client, query) => {
  const { page = 1, limit = 50, search, is_active = true } = query;

  const limitNum = Number(limit);
  const offset = (Number(page) - 1) * limitNum;

  let conditions = ["p.product_name NOT LIKE '[System Proxy]%'"];
  let values = [];

  if (is_active !== "ALL" && is_active !== "all") {
    values.push(is_active === "true" || is_active === true);
    conditions.push(`p.is_active = $${values.length}`);
  }

  if (search) {
    values.push(`%${search}%`);
    conditions.push(
      `(p.product_name ILIKE $${values.length} OR p.product_code ILIKE $${values.length})`,
    );
  }

  const whereStr =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const sql = `
    SELECT 
      p.*,
      COALESCE((SELECT SUM(quantity_in - quantity_out) FROM steel_erp.stock_ledger WHERE product_id = p.id AND item_kind = 'FINISHED' AND ownership_type = 'OWN'), 0) as own_stock,
      COALESCE((SELECT SUM(quantity_in - quantity_out) FROM steel_erp.stock_ledger WHERE product_id = p.id AND item_kind = 'FINISHED' AND ownership_type = 'JOB_WORK'), 0) as job_work_stock
    FROM steel_erp.products p
    ${whereStr}
    ORDER BY p.is_active DESC, p.product_name ASC
    LIMIT $${values.length + 1} OFFSET $${values.length + 2}
  `;

  const countSql = `SELECT count(*)::int as total FROM steel_erp.products p ${whereStr}`;

  const [dataRes, countRes] = await Promise.all([
    client.query(sql, [...values, limitNum, offset]),
    client.query(countSql, values),
  ]);

  return {
    data: dataRes.rows,
    meta: {
      total: countRes.rows[0].total,
      page: Number(page),
      limit: limitNum,
      total_pages: Math.ceil(countRes.rows[0].total / limitNum),
    },
  };
};

export const getProductByIdService = async (client, id, filters) => {
  const { startDate, endDate } = filters || {};
  let dateFilterProd = "";
  let dateFilterDisp = "";
  let values = [id];

  if (startDate && endDate) {
    values.push(startDate, endDate);
    dateFilterProd = `AND po.production_date BETWEEN $2 AND $3`;
    dateFilterDisp = `AND dh.dispatch_date BETWEEN $2 AND $3`;
  }

  const prodRes = await client.query(
    `SELECT * FROM steel_erp.products WHERE id = $1`,
    [id],
  );
  if (!prodRes.rowCount) throw new ApiError(404, "Product not found");

  const [balances, productionHistory, dispatchHistory] = await Promise.all([
    client.query(
      `SELECT ownership_type, SUM(quantity_in - quantity_out) as balance FROM steel_erp.stock_ledger WHERE product_id = $1 AND item_kind = 'FINISHED' GROUP BY ownership_type`,
      [id],
    ),
    client.query(
      `
      SELECT po.batch_no, ps.step_name, po.business_model, po.production_date, p.party_name, pso.quantity, pso.uom, pso.created_at
      FROM steel_erp.production_step_outputs pso
      JOIN steel_erp.production_steps ps ON pso.production_step_id = ps.id
      JOIN steel_erp.production_orders po ON ps.production_order_id = po.id
      LEFT JOIN steel_erp.parties p ON po.party_id = p.id
      WHERE pso.product_id = $1 AND pso.output_item_kind = 'FINISHED' ${dateFilterProd}
      ORDER BY pso.created_at DESC
    `,
      values,
    ),
    client.query(
      `
      SELECT dh.dispatch_no, dh.dispatch_type, dh.dispatch_date, p.party_name, dl.quantity, dl.sale_rate, dl.uom, dh.created_at
      FROM steel_erp.dispatch_lines dl
      JOIN steel_erp.dispatch_headers dh ON dl.dispatch_header_id = dh.id
      LEFT JOIN steel_erp.parties p ON dh.party_id = p.id
      WHERE dl.product_id = $1 AND dh.status != 'CANCELLED' ${dateFilterDisp}
      ORDER BY dh.created_at DESC
    `,
      values,
    ),
  ]);

  return {
    ...prodRes.rows[0],
    stock_balances: balances.rows,
    production_history: productionHistory.rows,
    dispatch_history: dispatchHistory.rows,
  };
};

export const updateProductService = async (client, id, data) => {
  const { product_name, product_code, default_uom, is_active } = data;
  const res = await client.query(
    `UPDATE steel_erp.products SET product_name = COALESCE($1, product_name), product_code = COALESCE($2, product_code), default_uom = COALESCE($3, default_uom), is_active = COALESCE($4, is_active), updated_at = now() WHERE id = $5 RETURNING *`,
    [product_name, product_code, default_uom, is_active, id],
  );
  if (!res.rowCount) throw new ApiError(404, "Product not found");
  return res.rows[0];
};

export const deleteProductService = async (client, id) => {
  const check = await client.query(
    `SELECT 1 FROM steel_erp.stock_ledger WHERE product_id = $1 LIMIT 1`,
    [id],
  );
  if (check.rowCount > 0) {
    await client.query(
      `UPDATE steel_erp.products SET is_active = false WHERE id = $1`,
      [id],
    );
    return {
      message: "Product is linked to stock ledgers. Safely deactivated.",
    };
  }
  await client.query(`DELETE FROM steel_erp.products WHERE id = $1`, [id]);
  return { message: "Product permanently deleted." };
};

export const createSemiFinishedService = async (client, data) => {
  const { item_name, item_code, default_uom, is_active } = data;
  const res = await client.query(
    `INSERT INTO steel_erp.semi_finished_items (item_name, item_code, default_uom, is_active) VALUES ($1, $2, $3, $4) RETURNING *`,
    [item_name, item_code, default_uom, is_active],
  );
  return res.rows[0];
};

export const getSemiFinishedService = async (client, query) => {
  const { page = 1, limit = 50, search, is_active = true } = query;

  const limitNum = Number(limit);
  const offset = (Number(page) - 1) * limitNum;

  let conditions = ["1=1"];
  let values = [];

  if (is_active !== "ALL" && is_active !== "all") {
    values.push(is_active === "true" || is_active === true);
    conditions.push(`sfi.is_active = $${values.length}`);
  }

  if (search) {
    values.push(`%${search}%`);
    conditions.push(
      `(sfi.item_name ILIKE $${values.length} OR sfi.item_code ILIKE $${values.length})`,
    );
  }

  const whereStr =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const sql = `
    SELECT 
      sfi.*,
      COALESCE((SELECT SUM(quantity_in - quantity_out) FROM steel_erp.stock_ledger WHERE semi_finished_id = sfi.id AND item_kind = 'SEMI_FINISHED' AND ownership_type = 'OWN'), 0) as own_stock,
      COALESCE((SELECT SUM(quantity_in - quantity_out) FROM steel_erp.stock_ledger WHERE semi_finished_id = sfi.id AND item_kind = 'SEMI_FINISHED' AND ownership_type = 'JOB_WORK'), 0) as job_work_stock
    FROM steel_erp.semi_finished_items sfi
    ${whereStr}
    ORDER BY sfi.is_active DESC, sfi.item_name ASC
    LIMIT $${values.length + 1} OFFSET $${values.length + 2}
  `;

  const countSql = `SELECT count(*)::int as total FROM steel_erp.semi_finished_items sfi ${whereStr}`;

  const [dataRes, countRes] = await Promise.all([
    client.query(sql, [...values, limitNum, offset]),
    client.query(countSql, values),
  ]);

  return {
    data: dataRes.rows,
    meta: {
      total: countRes.rows[0].total,
      page: Number(page),
      limit: limitNum,
      total_pages: Math.ceil(countRes.rows[0].total / limitNum),
    },
  };
};

export const getSemiFinishedByIdService = async (client, id, filters) => {
  const { startDate, endDate } = filters || {};
  let dateFilterProd = "";
  let dateFilterCons = "";
  let dateFilterCont = "";
  let values = [id];

  if (startDate && endDate) {
    values.push(startDate, endDate);
    dateFilterProd = `AND po.production_date BETWEEN $2 AND $3`;
    dateFilterCons = `AND po.production_date BETWEEN $2 AND $3`;
    dateFilterCont = `AND cj.out_date BETWEEN $2 AND $3`;
  }

  const prodRes = await client.query(
    `SELECT * FROM steel_erp.semi_finished_items WHERE id = $1`,
    [id],
  );
  if (!prodRes.rowCount) throw new ApiError(404, "WIP Item not found");

  const [balances, producedHistory, consumedHistory, contractorHistory] =
    await Promise.all([
      client.query(
        `SELECT ownership_type, SUM(quantity_in - quantity_out) as balance FROM steel_erp.stock_ledger WHERE semi_finished_id = $1 AND item_kind = 'SEMI_FINISHED' GROUP BY ownership_type`,
        [id],
      ),
      client.query(
        `
      SELECT po.batch_no, ps.step_name, po.business_model, po.production_date, p.party_name, pso.quantity, pso.uom, pso.created_at
      FROM steel_erp.production_step_outputs pso
      JOIN steel_erp.production_steps ps ON pso.production_step_id = ps.id
      JOIN steel_erp.production_orders po ON ps.production_order_id = po.id
      LEFT JOIN steel_erp.parties p ON po.party_id = p.id
      WHERE pso.semi_finished_id = $1 AND pso.output_item_kind = 'SEMI_FINISHED' ${dateFilterProd}
      ORDER BY pso.created_at DESC
    `,
        values,
      ),
      client.query(
        `
      SELECT po.batch_no, ps.step_name, po.business_model, po.production_date, p.party_name, ps.input_qty as quantity, ps.input_uom as uom, ps.created_at
      FROM steel_erp.production_steps ps
      JOIN steel_erp.production_orders po ON ps.production_order_id = po.id
      LEFT JOIN steel_erp.parties p ON po.party_id = p.id
      WHERE ps.input_semi_finished_id = $1 AND ps.input_item_kind = 'SEMI_FINISHED' ${dateFilterCons}
      ORDER BY ps.created_at DESC
    `,
        values,
      ),
      client.query(
        `
      SELECT cj.job_no, per.full_name as contractor_name, cj.qty_sent as quantity, cj.uom, cj.out_date
      FROM steel_erp.contractor_jobs cj
      JOIN steel_erp.personnel per ON cj.contractor_id = per.id
      WHERE cj.semi_finished_id = $1 ${dateFilterCont}
      ORDER BY cj.out_date DESC
    `,
        values,
      ),
    ]);

  return {
    ...prodRes.rows[0],
    stock_balances: balances.rows,
    produced_history: producedHistory.rows,
    consumed_history: consumedHistory.rows,
    contractor_history: contractorHistory.rows,
  };
};

export const updateSemiFinishedService = async (client, id, data) => {
  const { item_name, item_code, default_uom, is_active } = data;
  const res = await client.query(
    `UPDATE steel_erp.semi_finished_items SET item_name = COALESCE($1, item_name), item_code = COALESCE($2, item_code), default_uom = COALESCE($3, default_uom), is_active = COALESCE($4, is_active), updated_at = now() WHERE id = $5 RETURNING *`,
    [item_name, item_code, default_uom, is_active, id],
  );
  if (!res.rowCount) throw new ApiError(404, "WIP Item not found");
  return res.rows[0];
};

export const deleteSemiFinishedService = async (client, id) => {
  const check = await client.query(
    `SELECT 1 FROM steel_erp.stock_ledger WHERE semi_finished_id = $1 LIMIT 1`,
    [id],
  );
  if (check.rowCount > 0) {
    await client.query(
      `UPDATE steel_erp.semi_finished_items SET is_active = false WHERE id = $1`,
      [id],
    );
    return { message: "Item is linked to stock ledgers. Safely deactivated." };
  }
  await client.query(
    `DELETE FROM steel_erp.semi_finished_items WHERE id = $1`,
    [id],
  );
  return { message: "Item permanently deleted." };
};
