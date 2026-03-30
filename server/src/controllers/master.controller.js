import { asyncHandler } from "../utils/asyncHandler.js";
import { withTransaction } from "../utils/dbTransaction.js";

export const getMachinesMaster = asyncHandler(async (req, res) => {
  const result = await withTransaction((client) =>
    client.query(
      `SELECT id, machine_name FROM steel_erp.machines WHERE is_active = true ORDER BY machine_name`,
    ),
  );
  res.json({ success: true, data: result.rows });
});

export const getPersonnelMaster = asyncHandler(async (req, res) => {
  const result = await withTransaction((client) =>
    client.query(
      `SELECT id, full_name, personnel_type FROM steel_erp.personnel WHERE is_active = true ORDER BY full_name`,
    ),
  );
  res.json({ success: true, data: result.rows });
});

export const getRawMaterialsMaster = asyncHandler(async (req, res) => {
  const result = await withTransaction((client) =>
    client.query(
      `SELECT id, material_name FROM steel_erp.raw_materials WHERE is_active = true ORDER BY material_name`,
    ),
  );
  res.json({ success: true, data: result.rows });
});

export const getProductsMaster = asyncHandler(async (req, res) => {
  const result = await withTransaction((client) =>
    client.query(
      `SELECT id, product_name, default_uom FROM steel_erp.products WHERE is_active = true ORDER BY product_name`,
    ),
  );
  res.json({ success: true, data: result.rows });
});

export const getSemiFinishedMaster = asyncHandler(async (req, res) => {
  const result = await withTransaction((client) =>
    client.query(
      `SELECT id, item_name, default_uom FROM steel_erp.semi_finished_items WHERE is_active = true ORDER BY item_name`,
    ),
  );
  res.json({ success: true, data: result.rows });
});

export const getScrapTypesMaster = asyncHandler(async (req, res) => {
  const result = await withTransaction((client) =>
    client.query(
      `SELECT id, scrap_name, default_uom FROM steel_erp.scrap_types WHERE is_active = true ORDER BY scrap_name`,
    ),
  );
  res.json({ success: true, data: result.rows });
});

export const getPartiesMaster = asyncHandler(async (req, res) => {
  const { type } = req.query;
  let query = `SELECT id, party_name FROM steel_erp.parties WHERE is_active = true ORDER BY party_name`;
  const values = [];

  if (type) {
    query = `
      SELECT p.id, p.party_name 
      FROM steel_erp.parties p
      JOIN steel_erp.party_types pt ON pt.party_id = p.id
      WHERE p.is_active = true AND pt.party_type = $1
      ORDER BY p.party_name
    `;
    values.push(type);
  }

  const result = await withTransaction((client) => client.query(query, values));
  res.json({ success: true, data: result.rows });
});

export const getRawMaterialStock = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { business_model, party_id } = req.query;

  const result = await withTransaction(async (client) => {
    let query = "";
    let values = [];

    if (business_model === "JOB_WORK" && party_id) {
      query = `
        SELECT COALESCE(SUM(balance_qty), 0) AS available_stock 
        FROM steel_erp.vw_stock_balance 
        WHERE raw_material_id = $1 
          AND item_kind = 'RAW'
          AND ownership_type = 'JOB_WORK' 
          AND owner_party_id = $2
      `;
      values = [id, party_id];
    } else {
      query = `
        SELECT COALESCE(SUM(balance_qty), 0) AS available_stock 
        FROM steel_erp.vw_stock_balance 
        WHERE raw_material_id = $1 
          AND item_kind = 'RAW'
          AND ownership_type = 'OWN'
      `;
      values = [id];
    }

    return client.query(query, values);
  });

  const available_stock =
    result.rows.length > 0 ? Number(result.rows[0].available_stock) : 0;

  res.json({
    success: true,
    data: { available_stock },
  });
});
