import { ApiError } from "../../utils/ApiError.js";
import { validateStockMovement } from "./stock.validation.js";

const setAuditContext = async (client, userId) => {
  if (userId) {
    await client.query(`SELECT set_config('app.user_id', $1::text, true)`, [
      userId,
    ]);
  }
};

export const addStockMovement = async (client, data) => {
  validateStockMovement(data);
  const {
    movement_type,
    ownership_type,
    owner_party_id,
    item_kind,
    raw_material_id,
    semi_finished_id,
    product_id,
    scrap_type_id,
    quantity,
    uom,
    direction,
    reference_module,
    reference_id,
    reference_line_id,
    created_by,
    notes,
  } = data;

  const quantity_in = direction === "IN" ? quantity : 0;
  const quantity_out = direction === "OUT" ? quantity : 0;

  const result = await client.query(
    `INSERT INTO steel_erp.stock_ledger
    (movement_ts, movement_type, ownership_type, owner_party_id, item_kind, raw_material_id, semi_finished_id, product_id, scrap_type_id, quantity_in, quantity_out, uom, reference_module, reference_id, reference_line_id, created_by, notes)
    VALUES (now(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) RETURNING *`,
    [
      movement_type,
      ownership_type,
      ownership_type === "JOB_WORK" ? owner_party_id : null,
      item_kind,
      raw_material_id || null,
      semi_finished_id || null,
      product_id || null,
      scrap_type_id || null,
      quantity_in,
      quantity_out,
      uom,
      reference_module,
      reference_id,
      reference_line_id || null,
      created_by || null,
      notes || null,
    ],
  );
  return result.rows[0];
};

export const reverseStockByReference = async (
  client,
  reference_module,
  reference_id,
  userId,
) => {
  const movements = await client.query(
    `SELECT * FROM steel_erp.stock_ledger WHERE reference_module = $1 AND reference_id = $2 AND is_reversal = false`,
    [reference_module, reference_id],
  );

  for (const row of movements.rows) {
    const qtyIn = Number(row.quantity_in) || 0;
    const qtyOut = Number(row.quantity_out) || 0;

    const isOriginalIn = qtyIn > 0;
    const absoluteQty = isOriginalIn ? qtyIn : qtyOut;

    if (absoluteQty <= 0) continue;

    const newMovementData = {
      movement_type: isOriginalIn ? "ADJUSTMENT_OUT" : "ADJUSTMENT_IN",
      ownership_type: row.ownership_type,
      owner_party_id: row.owner_party_id,
      item_kind: row.item_kind,
      raw_material_id: row.raw_material_id,
      semi_finished_id: row.semi_finished_id,
      product_id: row.product_id,
      scrap_type_id: row.scrap_type_id,
      quantity: absoluteQty,
      uom: row.uom,
      direction: isOriginalIn ? "OUT" : "IN",
      reference_module: row.reference_module,
      reference_id: row.reference_id,
      reference_line_id: row.reference_line_id,
      created_by: userId,
      notes: "System Auto-Reversal",
    };

    const insertedRow = await addStockMovement(client, newMovementData);

    await client.query(
      `UPDATE steel_erp.stock_ledger SET is_reversal = true, reversal_of_ledger_id = $1 WHERE id = $2`,
      [insertedRow.id, row.id],
    );

    await client.query(
      `UPDATE steel_erp.stock_ledger SET is_reversal = true WHERE id = $1`,
      [insertedRow.id],
    );
  }
};

export const getStockSnapshotService = async (client, query) => {
  // 🌟 FIX: Extract party_id from the query parameters
  const { search, item_kind, ownership_type, party_id } = query;
  let conditions = ["1=1"];
  let values = [];

  if (item_kind && item_kind !== "ALL") {
    values.push(item_kind);
    conditions.push(`item_kind = $${values.length}::steel_erp.item_kind_enum`);
  }
  if (ownership_type && ownership_type !== "ALL") {
    values.push(ownership_type);
    conditions.push(
      `ownership_type = $${values.length}::steel_erp.ownership_type_enum`,
    );
  }
  // 🌟 FIX: If party_id is requested, strictly filter by it so parties don't see each other's stock
  if (party_id) {
    values.push(party_id);
    conditions.push(`owner_party_id = $${values.length}`);
  }

  if (search) {
    values.push(`%${search}%`);
    conditions.push(
      `(display_name ILIKE $${values.length} OR party_name ILIKE $${values.length})`,
    );
  }

  const sql = `
    WITH MasterItems AS (
      SELECT 'RAW'::steel_erp.item_kind_enum as item_kind, id as raw_material_id, NULL::bigint as semi_finished_id, NULL::bigint as product_id, NULL::bigint as scrap_type_id, material_name as display_name, default_uom as uom FROM steel_erp.raw_materials
      UNION ALL
      SELECT 'SEMI_FINISHED'::steel_erp.item_kind_enum, NULL, id, NULL, NULL, item_name, default_uom FROM steel_erp.semi_finished_items
      UNION ALL
      SELECT 'FINISHED'::steel_erp.item_kind_enum, NULL, NULL, id, NULL, product_name, default_uom 
      FROM steel_erp.products 
      WHERE product_name NOT LIKE '[System Proxy]%' 
      UNION ALL
      SELECT 'SCRAP'::steel_erp.item_kind_enum, NULL, NULL, NULL, id, scrap_name, default_uom FROM steel_erp.scrap_types
    ),
    LedgerAgg AS (
      SELECT 
        ownership_type, owner_party_id, item_kind, raw_material_id, semi_finished_id, 
        (CASE WHEN item_kind = 'SEMI_FINISHED' THEN NULL ELSE product_id END) as product_id, 
        scrap_type_id,
        uom,
        SUM(quantity_in - quantity_out) as balance
      FROM steel_erp.stock_ledger
      GROUP BY 1, 2, 3, 4, 5, 6, 7, 8 
    ),
    Combined AS (
      SELECT 
        'OWN'::steel_erp.ownership_type_enum as ownership_type, NULL::bigint as owner_party_id, NULL::text as party_name,
        m.item_kind, l.uom, m.raw_material_id, m.semi_finished_id, m.product_id, m.scrap_type_id, m.display_name,
        COALESCE(l.balance, 0) as balance
      FROM MasterItems m
      LEFT JOIN LedgerAgg l ON m.item_kind = l.item_kind 
        AND COALESCE(m.raw_material_id, 0) = COALESCE(l.raw_material_id, 0)
        AND COALESCE(m.semi_finished_id, 0) = COALESCE(l.semi_finished_id, 0)
        AND COALESCE(m.product_id, 0) = COALESCE(l.product_id, 0)
        AND COALESCE(m.scrap_type_id, 0) = COALESCE(l.scrap_type_id, 0)
        AND l.ownership_type = 'OWN'::steel_erp.ownership_type_enum
      UNION ALL
      SELECT 
        l.ownership_type, l.owner_party_id, p.party_name, m.item_kind, l.uom,
        l.raw_material_id, l.semi_finished_id, l.product_id, l.scrap_type_id, m.display_name, l.balance
      FROM LedgerAgg l
      JOIN MasterItems m ON l.item_kind = m.item_kind 
        AND COALESCE(l.raw_material_id, 0) = COALESCE(m.raw_material_id, 0)
        AND COALESCE(l.semi_finished_id, 0) = COALESCE(m.semi_finished_id, 0)
        AND COALESCE(l.product_id, 0) = COALESCE(m.product_id, 0)
        AND COALESCE(l.scrap_type_id, 0) = COALESCE(m.scrap_type_id, 0)
      LEFT JOIN steel_erp.parties p ON l.owner_party_id = p.id
      WHERE l.ownership_type = 'JOB_WORK'::steel_erp.ownership_type_enum AND l.balance <> 0
    )
    SELECT * FROM Combined WHERE ${conditions.join(" AND ")} ORDER BY ownership_type ASC, item_kind ASC, display_name ASC;
  `;

  const res = await client.query(sql, values);
  return res.rows;
};

export const getStockLedgerHistoryService = async (client, queryParams) => {
  const {
    page,
    limit,
    item_kind,
    item_id,
    ownership_type,
    owner_party_id,
    startDate,
    endDate,
    search,
    movement_type,
    direction,
  } = queryParams;
  const offset = (page - 1) * limit;

  let baseConditions = ["1=1"];
  let baseValues = [];

  if (item_kind) {
    baseValues.push(item_kind);
    baseConditions.push(`sl.item_kind = $${baseValues.length}`);
  }
  if (ownership_type) {
    baseValues.push(ownership_type);
    baseConditions.push(`sl.ownership_type = $${baseValues.length}`);
  }
  if (owner_party_id) {
    baseValues.push(owner_party_id);
    baseConditions.push(`sl.owner_party_id = $${baseValues.length}`);
  } else if (ownership_type === "OWN") {
    baseConditions.push(`sl.owner_party_id IS NULL`);
  }
  if (movement_type) {
    baseValues.push(movement_type);
    baseConditions.push(`sl.movement_type = $${baseValues.length}`);
  }
  if (startDate) {
    baseValues.push(startDate);
    baseConditions.push(`sl.movement_date >= $${baseValues.length}`);
  }
  if (endDate) {
    baseValues.push(endDate);
    baseConditions.push(`sl.movement_date <= $${baseValues.length}`);
  }

  if (direction === "IN") baseConditions.push(`sl.quantity_in > 0`);
  if (direction === "OUT") baseConditions.push(`sl.quantity_out > 0`);

  if (item_kind && item_id) {
    baseValues.push(item_id);
    if (item_kind === "RAW")
      baseConditions.push(`sl.raw_material_id = $${baseValues.length}`);
    if (item_kind === "SEMI_FINISHED")
      baseConditions.push(`sl.semi_finished_id = $${baseValues.length}`);
    if (item_kind === "FINISHED")
      baseConditions.push(`sl.product_id = $${baseValues.length}`);
    if (item_kind === "SCRAP")
      baseConditions.push(`sl.scrap_type_id = $${baseValues.length}`);
  }

  let finalConditions = ["1=1"];
  if (search) {
    baseValues.push(`%${search}%`);
    finalConditions.push(
      `(transaction_ref_no ILIKE $${baseValues.length} OR transaction_entity ILIKE $${baseValues.length} OR notes ILIKE $${baseValues.length})`,
    );
  }

  const query = `
    WITH BaseLedger AS (
      SELECT 
        sl.id, sl.movement_ts, sl.movement_date, sl.movement_type, sl.item_kind,
        sl.quantity_in, sl.quantity_out, sl.uom, sl.is_reversal, sl.notes,
        sl.reference_module, sl.reference_id,
        COALESCE(rm.material_name, sfi.item_name, pr.product_name, st.scrap_name, 'Unknown') AS item_name,
        p_own.party_name as owner_party, u.full_name as created_by_user,
        COALESCE(p_rih.party_name, p_dh.party_name, p_po.party_name, per_cj.full_name, 'System') AS transaction_entity,
        COALESCE(rih.inward_no, dh.dispatch_no, po.batch_no, cj.job_no, 'MANUAL') AS transaction_ref_no
      FROM steel_erp.stock_ledger sl
      LEFT JOIN steel_erp.parties p_own ON sl.owner_party_id = p_own.id
      LEFT JOIN steel_erp.users u ON sl.created_by = u.id
      LEFT JOIN steel_erp.raw_materials rm ON sl.raw_material_id = rm.id
      LEFT JOIN steel_erp.semi_finished_items sfi ON sl.semi_finished_id = sfi.id
      LEFT JOIN steel_erp.products pr ON sl.product_id = pr.id
      LEFT JOIN steel_erp.scrap_types st ON sl.scrap_type_id = st.id
      LEFT JOIN steel_erp.raw_inward_headers rih ON sl.reference_module = 'RAW_INWARD' AND sl.reference_id = rih.id
      LEFT JOIN steel_erp.parties p_rih ON rih.party_id = p_rih.id
      LEFT JOIN steel_erp.dispatch_headers dh ON sl.reference_module = 'DISPATCH' AND sl.reference_id = dh.id
      LEFT JOIN steel_erp.parties p_dh ON dh.party_id = p_dh.id
      LEFT JOIN steel_erp.production_orders po ON sl.reference_module = 'PRODUCTION' AND sl.reference_id = po.id
      LEFT JOIN steel_erp.parties p_po ON po.party_id = p_po.id
      LEFT JOIN steel_erp.contractor_jobs cj ON sl.reference_module = 'CONTRACTOR' AND sl.reference_id = cj.id
      LEFT JOIN steel_erp.personnel per_cj ON cj.contractor_id = per_cj.id
      WHERE ${baseConditions.join(" AND ")}
    )
    SELECT * FROM BaseLedger WHERE ${finalConditions.join(" AND ")} ORDER BY movement_ts DESC LIMIT $${baseValues.length + 1} OFFSET $${baseValues.length + 2}
  `;

  const countQuery = `
    WITH BaseLedger AS (
      SELECT sl.notes, COALESCE(p_rih.party_name, p_dh.party_name, p_po.party_name, per_cj.full_name, 'System') AS transaction_entity, COALESCE(rih.inward_no, dh.dispatch_no, po.batch_no, cj.job_no, 'MANUAL') AS transaction_ref_no
      FROM steel_erp.stock_ledger sl
      LEFT JOIN steel_erp.raw_inward_headers rih ON sl.reference_module = 'RAW_INWARD' AND sl.reference_id = rih.id
      LEFT JOIN steel_erp.parties p_rih ON rih.party_id = p_rih.id
      LEFT JOIN steel_erp.dispatch_headers dh ON sl.reference_module = 'DISPATCH' AND sl.reference_id = dh.id
      LEFT JOIN steel_erp.parties p_dh ON dh.party_id = p_dh.id
      LEFT JOIN steel_erp.production_orders po ON sl.reference_module = 'PRODUCTION' AND sl.reference_id = po.id
      LEFT JOIN steel_erp.parties p_po ON po.party_id = p_po.id
      LEFT JOIN steel_erp.contractor_jobs cj ON sl.reference_module = 'CONTRACTOR' AND sl.reference_id = cj.id
      LEFT JOIN steel_erp.personnel per_cj ON cj.contractor_id = per_cj.id
      WHERE ${baseConditions.join(" AND ")}
    )
    SELECT count(*)::int as total FROM BaseLedger WHERE ${finalConditions.join(" AND ")}
  `;

  const [dataRes, countRes] = await Promise.all([
    client.query(query, [...baseValues, limit, offset]),
    client.query(countQuery, baseValues),
  ]);

  return {
    data: dataRes.rows,
    meta: { total: countRes.rows[0].total, page, limit },
  };
};

const getIsolatedProxyProduct = async (client, semiFinishedId, uom) => {
  const code = `PROXY-SF-${semiFinishedId}`;
  const res = await client.query(
    `SELECT id FROM steel_erp.products WHERE product_code = $1`,
    [code],
  );
  if (res.rowCount > 0) return res.rows[0].id;

  const sfRes = await client.query(
    `SELECT item_name FROM steel_erp.semi_finished_items WHERE id = $1`,
    [semiFinishedId],
  );
  const name = sfRes.rowCount > 0 ? sfRes.rows[0].item_name : "Unknown WIP";

  const insertRes = await client.query(
    `INSERT INTO steel_erp.products (product_name, product_code, default_uom, is_active) VALUES ($1, $2, $3, false) RETURNING id`,
    [`[System Proxy] ${name}`, code, uom],
  );
  return insertRes.rows[0].id;
};

export const createStockConversionService = async (client, data, userId) => {
  await setAuditContext(client, userId);
  const {
    conversion_date,
    ownership_type,
    party_id,
    source_item_kind,
    source_item_id,
    source_qty,
    source_uom,
    target_item_kind,
    target_item_id,
    target_qty,
    target_uom,
    scrap_type_id,
    scrap_qty,
    remarks,
  } = data;

  const insertQuery = `
    INSERT INTO steel_erp.stock_conversions (
      conversion_date, ownership_type, party_id,
      source_item_kind, source_raw_id, source_semi_id, source_qty, source_uom,
      target_item_kind, target_product_id, target_semi_id, target_qty, target_uom,
      scrap_type_id, scrap_qty, remarks, created_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17) RETURNING id
  `;

  const convRes = await client.query(insertQuery, [
    conversion_date,
    ownership_type,
    ownership_type === "JOB_WORK" ? party_id : null,
    source_item_kind,
    source_item_kind === "RAW" ? source_item_id : null,
    source_item_kind === "SEMI_FINISHED" ? source_item_id : null,
    source_qty,
    source_uom,
    target_item_kind,
    target_item_kind === "FINISHED" ? target_item_id : null,
    target_item_kind === "SEMI_FINISHED" ? target_item_id : null,
    target_qty,
    target_uom,
    scrap_type_id || null,
    scrap_qty || 0,
    remarks || null,
    userId,
  ]);

  const conversionId = convRes.rows[0].id;

  const bucketQuery = await client.query(
    `
    SELECT raw_material_id, semi_finished_id, product_id, scrap_type_id, uom, SUM(quantity_in - quantity_out) as available_balance
    FROM steel_erp.stock_ledger
    WHERE item_kind = $1 
      AND ownership_type = $2 
      AND (owner_party_id = $3 OR ($3 IS NULL AND owner_party_id IS NULL))
      AND (
        (item_kind = 'RAW' AND raw_material_id = $4) OR
        (item_kind = 'SEMI_FINISHED' AND semi_finished_id = $4) OR
        (item_kind = 'FINISHED' AND product_id = $4)
      )
      AND uom = $5
    GROUP BY raw_material_id, semi_finished_id, product_id, scrap_type_id, uom
    HAVING SUM(quantity_in - quantity_out) > 0
    ORDER BY available_balance DESC
  `,
    [
      source_item_kind,
      ownership_type,
      ownership_type === "JOB_WORK" ? party_id : null,
      source_item_id,
      source_uom,
    ],
  );

  let remaining_qty_to_consume = Number(source_qty);

  if (bucketQuery.rows.length === 0) {
    throw new ApiError(
      400,
      "Insufficient Stock: No active stock found in the ledger for this specific UOM and ownership context.",
    );
  }

  for (const bucket of bucketQuery.rows) {
    if (remaining_qty_to_consume <= 0) break;

    const bucketBal = Number(bucket.available_balance);
    const qty_to_take = Math.min(bucketBal, remaining_qty_to_consume);

    await addStockMovement(client, {
      movement_type: "ADJUSTMENT_OUT",
      ownership_type,
      owner_party_id: party_id,
      item_kind: source_item_kind,
      raw_material_id: bucket.raw_material_id,
      semi_finished_id: bucket.semi_finished_id,
      product_id: bucket.product_id,
      scrap_type_id: bucket.scrap_type_id,
      quantity: qty_to_take,
      uom: bucket.uom,
      direction: "OUT",
      reference_module: "MANUAL_ADJUSTMENT",
      reference_id: conversionId,
      created_by: userId,
      notes: `Direct Conversion #${conversionId} - Consumed fragment (${qty_to_take} ${bucket.uom})`,
    });

    remaining_qty_to_consume -= qty_to_take;
  }

  if (remaining_qty_to_consume > 0.001) {
    throw new ApiError(
      400,
      "Insufficient Stock: The total available fragmented stock is still less than the requested conversion quantity.",
    );
  }

  await addStockMovement(client, {
    movement_type: "ADJUSTMENT_IN",
    ownership_type,
    owner_party_id: party_id,
    item_kind: target_item_kind,
    product_id: target_item_kind === "FINISHED" ? target_item_id : null,
    semi_finished_id:
      target_item_kind === "SEMI_FINISHED" ? target_item_id : null,
    quantity: target_qty,
    uom: target_uom,
    direction: "IN",
    reference_module: "MANUAL_ADJUSTMENT",
    reference_id: conversionId,
    created_by: userId,
    notes: `Direct Conversion #${conversionId} - Output Produced`,
  });

  if (scrap_type_id && scrap_qty > 0) {
    await addStockMovement(client, {
      movement_type: "ADJUSTMENT_IN",
      ownership_type: "OWN",
      owner_party_id: null,
      item_kind: "SCRAP",
      scrap_type_id: scrap_type_id,
      quantity: scrap_qty,
      uom: "KG",
      direction: "IN",
      reference_module: "MANUAL_ADJUSTMENT",
      reference_id: conversionId,
      created_by: userId,
      notes: `Direct Conversion #${conversionId} - Scrap Recovered`,
    });
  }

  return {
    message: "Direct conversion successful.",
    conversion_id: conversionId,
  };
};

export const getStockConversionsService = async (client, queryParams) => {
  const { page = 1, limit = 50, ownership_type } = queryParams;
  const offset = (page - 1) * limit;

  let conditions = ["1=1"];
  let values = [];

  if (ownership_type && ownership_type !== "ALL") {
    values.push(ownership_type);
    conditions.push(`sc.ownership_type = $${values.length}`);
  }

  const sql = `
    SELECT 
      sc.id, sc.conversion_date, sc.ownership_type, p.party_name,
      sc.source_item_kind, sc.source_qty, sc.source_uom,
      COALESCE(rm.material_name, sfi_src.item_name) as source_name,
      sc.target_item_kind, sc.target_qty, sc.target_uom,
      COALESCE(pr.product_name, sfi_tgt.item_name) as target_name,
      sc.scrap_qty, st.scrap_name, sc.remarks, u.full_name as converted_by
    FROM steel_erp.stock_conversions sc
    LEFT JOIN steel_erp.parties p ON sc.party_id = p.id
    LEFT JOIN steel_erp.users u ON sc.created_by = u.id
    LEFT JOIN steel_erp.raw_materials rm ON sc.source_raw_id = rm.id
    LEFT JOIN steel_erp.semi_finished_items sfi_src ON sc.source_semi_id = sfi_src.id
    LEFT JOIN steel_erp.products pr ON sc.target_product_id = pr.id
    LEFT JOIN steel_erp.semi_finished_items sfi_tgt ON sc.target_semi_id = sfi_tgt.id
    LEFT JOIN steel_erp.scrap_types st ON sc.scrap_type_id = st.id
    WHERE ${conditions.join(" AND ")}
    ORDER BY sc.conversion_date DESC, sc.id DESC
    LIMIT $${values.length + 1} OFFSET $${values.length + 2}
  `;

  const countSql = `SELECT count(*)::int as total FROM steel_erp.stock_conversions sc WHERE ${conditions.join(" AND ")}`;

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
    },
  };
};

export const reverseStockConversionService = async (
  client,
  conversionId,
  userId,
) => {
  await setAuditContext(client, userId);

  const conversionRes = await client.query(
    `SELECT * FROM steel_erp.stock_conversions WHERE id = $1 FOR UPDATE`,
    [conversionId],
  );

  if (!conversionRes.rowCount) {
    throw new ApiError(404, "Stock conversion record not found");
  }

  const conversion = conversionRes.rows[0];

  if (conversion.remarks && conversion.remarks.includes("[REVERSED]")) {
    throw new ApiError(400, "This conversion has already been reversed");
  }

  await reverseStockByReference(
    client,
    "MANUAL_ADJUSTMENT",
    conversionId,
    userId,
  );

  const updatedRemarks = conversion.remarks
    ? `${conversion.remarks} [REVERSED]`
    : `[REVERSED]`;

  await client.query(
    `UPDATE steel_erp.stock_conversions 
     SET remarks = $1
     WHERE id = $2`,
    [updatedRemarks, conversionId],
  );

  return { message: "Stock conversion reversed successfully." };
};
