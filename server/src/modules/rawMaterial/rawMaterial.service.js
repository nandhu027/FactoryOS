import { ApiError } from "../../utils/ApiError.js";

const setAuditContext = async (client, userId) => {
  if (userId)
    await client.query(`SELECT set_config('app.user_id', $1::text, true)`, [
      userId,
    ]);
};

const parseInwardRemarks = (raw) => {
  try {
    if (!raw)
      return { text: "", billing: null, lines_pricing: {}, payments: [] };
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      return {
        text: parsed.text || "",
        billing: parsed.billing || null,
        lines_pricing: parsed.lines_pricing || {},
        payments: Array.isArray(parsed.payments) ? parsed.payments : [],
      };
    }
  } catch (e) {}
  return { text: raw || "", billing: null, lines_pricing: {}, payments: [] };
};

export const createRawMaterialMasterService = async (client, data) => {
  const existing = await client.query(
    `SELECT id FROM steel_erp.raw_materials WHERE lower(material_name) = lower($1)`,
    [data.material_name],
  );
  if (existing.rowCount > 0)
    throw new ApiError(400, "Material name already exists.");

  const result = await client.query(
    `INSERT INTO steel_erp.raw_materials (material_name, default_uom, is_active) VALUES ($1, $2, $3) RETURNING *`,
    [data.material_name, data.default_uom, data.is_active],
  );
  return result.rows[0];
};

export const getRawMaterialsMasterService = async (client, query) => {
  const { search, is_active } = query;
  let conditions = ["1=1"];
  let values = [];

  if (is_active !== undefined) {
    values.push(is_active);
    conditions.push(`is_active = $${values.length}`);
  }
  if (search) {
    values.push(`%${search}%`);
    conditions.push(`material_name ILIKE $${values.length}`);
  }

  const result = await client.query(
    `SELECT * FROM steel_erp.raw_materials WHERE ${conditions.join(" AND ")} ORDER BY material_name ASC`,
    values,
  );
  return result.rows;
};

export const updateRawMaterialMasterService = async (client, id, data) => {
  const result = await client.query(
    `UPDATE steel_erp.raw_materials 
     SET material_name = COALESCE($1, material_name), 
         default_uom = COALESCE($2, default_uom), 
         is_active = COALESCE($3, is_active), 
         updated_at = now() 
     WHERE id = $4 RETURNING *`,
    [data.material_name, data.default_uom, data.is_active, id],
  );
  if (result.rowCount === 0) throw new ApiError(404, "Material not found");
  return result.rows[0];
};

export const deleteRawMaterialMasterService = async (client, id) => {
  const result = await client.query(
    `UPDATE steel_erp.raw_materials SET is_active = false WHERE id = $1 RETURNING id`,
    [id],
  );
  if (result.rowCount === 0) throw new ApiError(404, "Material not found");
  return { message: "Material deactivated successfully." };
};

export const getRawInwardService = async (client, queryParams) => {
  const {
    page = 1,
    limit = 50,
    search,
    business_model,
    party_id,
    date_filter,
    custom_start,
    custom_end,
  } = queryParams;
  const offset = (page - 1) * limit;
  const values = [];
  let whereClauses = ["1=1"];

  if (business_model) {
    values.push(business_model);
    whereClauses.push(`rh.business_model = $${values.length}`);
  }
  if (party_id) {
    values.push(party_id);
    whereClauses.push(`rh.party_id = $${values.length}`);
  }

  if (date_filter === "TODAY")
    whereClauses.push(`rh.inward_date = CURRENT_DATE`);
  if (date_filter === "YESTERDAY")
    whereClauses.push(`rh.inward_date = CURRENT_DATE - INTERVAL '1 day'`);
  if (date_filter === "CUSTOM" && custom_start && custom_end) {
    values.push(custom_start, custom_end);
    whereClauses.push(
      `rh.inward_date BETWEEN $${values.length - 1} AND $${values.length}`,
    );
  }
  if (search) {
    values.push(`%${search}%`);
    whereClauses.push(
      `(rh.inward_no ILIKE $${values.length} OR rh.challan_no ILIKE $${values.length} OR p.party_name ILIKE $${values.length})`,
    );
  }

  const whereString = whereClauses.join(" AND ");

  const result = await client.query(
    `SELECT rh.*, p.party_name,
      COALESCE(
        JSON_AGG(
          JSON_BUILD_OBJECT('line_id', rl.id, 'raw_material_id', rl.raw_material_id, 'material_name', rm.material_name, 'raw_number', rl.raw_number, 'thickness_mm', rl.thickness_mm, 'quantity', rl.quantity, 'uom', rl.uom)
        ) FILTER (WHERE rl.id IS NOT NULL), '[]'
      ) AS lines
    FROM steel_erp.raw_inward_headers rh
    LEFT JOIN steel_erp.parties p ON rh.party_id = p.id
    LEFT JOIN steel_erp.raw_inward_lines rl ON rh.id = rl.header_id
    LEFT JOIN steel_erp.raw_materials rm ON rl.raw_material_id = rm.id
    WHERE ${whereString}
    GROUP BY rh.id, p.party_name
    ORDER BY rh.id DESC
    LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
    [...values, limit, offset],
  );

  const countRes = await client.query(
    `SELECT count(DISTINCT rh.id)::int as total FROM steel_erp.raw_inward_headers rh LEFT JOIN steel_erp.parties p ON rh.party_id = p.id WHERE ${whereString}`,
    values,
  );

  const processedRows = result.rows.map((row) => {
    const parsed = parseInwardRemarks(row.remarks);
    const enrichedLines = row.lines.map((line) => {
      const pricingData = parsed.lines_pricing[line.raw_number] || {
        rate: 0,
        amount: 0,
      };
      return { ...line, rate: pricingData.rate, amount: pricingData.amount };
    });

    return {
      ...row,
      remarks: parsed.text,
      billing: parsed.billing,
      grand_total: parsed.billing?.grand_total || 0,
      lines: enrichedLines,
    };
  });

  return {
    data: processedRows,
    meta: {
      total: countRes.rows[0].total,
      page: Number(page),
      limit: Number(limit),
    },
  };
};

export const createRawInwardService = async (client, data, userId) => {
  await setAuditContext(client, userId);
  const {
    inward_no,
    inward_date,
    business_model,
    party_id,
    challan_no,
    remarks,
    lines,
    billing,
  } = data;

  const lines_pricing = {};
  lines.forEach((line) => {
    lines_pricing[line.raw_number] = {
      rate: Number(line.rate || 0),
      amount: Number(line.quantity) * Number(line.rate || 0),
    };
  });

  const shadowPayload = JSON.stringify({
    text: remarks || "",
    billing: billing || null,
    lines_pricing,
    payments: [],
  });

  const ownership = business_model === "OWN_MANUFACTURING" ? "OWN" : "JOB_WORK";
  const ownerPartyId = ownership === "JOB_WORK" ? Number(party_id) : null;

  const headerRes = await client.query(
    `INSERT INTO steel_erp.raw_inward_headers (inward_no, inward_date, business_model, party_id, challan_no, remarks, created_by)
    VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [
      inward_no,
      inward_date,
      business_model,
      party_id,
      challan_no,
      shadowPayload,
      userId,
    ],
  );
  const header = headerRes.rows[0];

  for (const line of lines) {
    const lineRes = await client.query(
      `INSERT INTO steel_erp.raw_inward_lines (header_id, raw_material_id, raw_number, thickness_mm, quantity, uom) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [
        header.id,
        line.raw_material_id,
        line.raw_number,
        line.thickness_mm,
        line.quantity,
        line.uom,
      ],
    );

    await client.query(
      `INSERT INTO steel_erp.stock_ledger (movement_date, movement_type, ownership_type, owner_party_id, item_kind, raw_material_id, quantity_in, uom, reference_module, reference_id, reference_line_id, created_by)
      VALUES ($1, 'RAW_INWARD', $2, $3, 'RAW', $4, $5, $6, 'RAW_INWARD', $7, $8, $9)`,
      [
        inward_date,
        ownership,
        ownerPartyId,
        line.raw_material_id,
        line.quantity,
        line.uom,
        header.id,
        lineRes.rows[0].id,
        userId,
      ],
    );
  }
  return header;
};

export const updateRawInwardService = async (client, id, data, userId) => {
  await setAuditContext(client, userId);

  const existingHeader = await client.query(
    `SELECT inward_no, remarks FROM steel_erp.raw_inward_headers WHERE id = $1 FOR UPDATE`,
    [id],
  );
  if (existingHeader.rowCount === 0)
    throw new ApiError(404, "Raw inward not found");

  const oldInwardNo = existingHeader.rows[0].inward_no?.toString().trim();
  const newInwardNo = data.inward_no?.toString().trim();

  if (oldInwardNo !== newInwardNo) {
    const dupCheck = await client.query(
      `SELECT id FROM steel_erp.raw_inward_headers WHERE inward_no = $1 AND id != $2`,
      [newInwardNo, id],
    );
    if (dupCheck.rowCount > 0) {
      throw new ApiError(
        400,
        "This Inward Number is already in use by another record.",
      );
    }
  }

  const parsedOld = parseInwardRemarks(existingHeader.rows[0].remarks);

  const lines_pricing = {};
  data.lines.forEach((line) => {
    lines_pricing[line.raw_number] = {
      rate: Number(line.rate || 0),
      amount: Number(line.quantity) * Number(line.rate || 0),
    };
  });

  const newShadowPayload = JSON.stringify({
    text: data.remarks || "",
    billing: data.billing || null,
    lines_pricing,
    payments: parsedOld.payments,
  });

  const ownership =
    data.business_model === "OWN_MANUFACTURING" ? "OWN" : "JOB_WORK";
  const ownerPartyId = ownership === "JOB_WORK" ? Number(data.party_id) : null;

  if (oldInwardNo === newInwardNo) {
    await client.query(
      `UPDATE steel_erp.raw_inward_headers SET inward_date=$1, business_model=$2, party_id=$3, challan_no=$4, remarks=$5 WHERE id=$6`,
      [
        data.inward_date,
        data.business_model,
        data.party_id,
        data.challan_no,
        newShadowPayload,
        id,
      ],
    );
  } else {
    await client.query(
      `UPDATE steel_erp.raw_inward_headers SET inward_no=$1, inward_date=$2, business_model=$3, party_id=$4, challan_no=$5, remarks=$6 WHERE id=$7`,
      [
        newInwardNo,
        data.inward_date,
        data.business_model,
        data.party_id,
        data.challan_no,
        newShadowPayload,
        id,
      ],
    );
  }

  const existingLinesRes = await client.query(
    `SELECT id FROM steel_erp.raw_inward_lines WHERE header_id = $1`,
    [id],
  );
  const existingLineIds = existingLinesRes.rows.map((r) => r.id.toString());
  const incomingLineIds = data.lines
    .map((l) => l.id?.toString())
    .filter(Boolean);

  const linesToDelete = existingLineIds.filter(
    (id) => !incomingLineIds.includes(id),
  );

  if (linesToDelete.length > 0) {
    await client.query(
      `DELETE FROM steel_erp.stock_ledger WHERE reference_module = 'RAW_INWARD' AND reference_line_id = ANY($1::int[])`,
      [linesToDelete.map(Number)],
    );
    await client.query(
      `DELETE FROM steel_erp.raw_inward_lines WHERE id = ANY($1::int[])`,
      [linesToDelete.map(Number)],
    );
  }

  for (const line of data.lines) {
    if (
      line.id &&
      !isNaN(Number(line.id)) &&
      existingLineIds.includes(line.id.toString())
    ) {
      await client.query(
        `UPDATE steel_erp.raw_inward_lines SET raw_material_id=$1, raw_number=$2, thickness_mm=$3, quantity=$4, uom=$5 WHERE id=$6`,
        [
          line.raw_material_id,
          line.raw_number,
          line.thickness_mm,
          line.quantity,
          line.uom,
          line.id,
        ],
      );
      await client.query(
        `UPDATE steel_erp.stock_ledger SET movement_date=$1, ownership_type=$2, owner_party_id=$3, raw_material_id=$4, quantity_in=$5, uom=$6 WHERE reference_module = 'RAW_INWARD' AND reference_line_id = $7`,
        [
          data.inward_date,
          ownership,
          ownerPartyId,
          line.raw_material_id,
          line.quantity,
          line.uom,
          line.id,
        ],
      );
    } else {
      const insertedLine = await client.query(
        `INSERT INTO steel_erp.raw_inward_lines (header_id, raw_material_id, raw_number, thickness_mm, quantity, uom) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
        [
          id,
          line.raw_material_id,
          line.raw_number,
          line.thickness_mm,
          line.quantity,
          line.uom,
        ],
      );

      await client.query(
        `INSERT INTO steel_erp.stock_ledger (movement_date, movement_type, ownership_type, owner_party_id, item_kind, raw_material_id, quantity_in, uom, reference_module, reference_id, reference_line_id, created_by)
        VALUES ($1, 'RAW_INWARD', $2, $3, 'RAW', $4, $5, $6, 'RAW_INWARD', $7, $8, $9)`,
        [
          data.inward_date,
          ownership,
          ownerPartyId,
          line.raw_material_id,
          line.quantity,
          line.uom,
          id,
          insertedLine.rows[0].id,
          userId,
        ],
      );
    }
  }

  return { message: "Raw inward updated successfully" };
};

export const cancelRawInwardService = async (client, id, userId) => {
  await setAuditContext(client, userId);
  const header = await client.query(
    `SELECT id FROM steel_erp.raw_inward_headers WHERE id = $1 FOR UPDATE`,
    [id],
  );
  if (header.rowCount === 0) throw new ApiError(404, "Raw inward not found");

  await client.query(
    `SELECT steel_erp.fn_reverse_stock_by_reference('RAW_INWARD'::text, $1::bigint, $2::bigint)`,
    [id, userId],
  );
  await client.query(`DELETE FROM steel_erp.raw_inward_headers WHERE id = $1`, [
    id,
  ]);
  return { message: "Raw inward cancelled and stock reverted perfectly." };
};

export const getRawMaterialTraceabilityService = async (
  client,
  rawMaterialId,
) => {
  const result = await client.query(
    `SELECT po.batch_no, po.production_date, po.business_model, p.party_name AS job_work_party,
      ps.step_name, m.machine_name, ps.input_qty, ps.input_uom, ps.scrap_qty,
      (SELECT json_agg(per.full_name) FROM steel_erp.production_step_workers psw JOIN steel_erp.personnel per ON per.id = psw.personnel_id WHERE psw.production_step_id = ps.id) AS workers,
      (SELECT json_agg(json_build_object('product', pr.product_name, 'qty', pso.quantity, 'type', pso.output_item_kind)) FROM steel_erp.production_step_outputs pso JOIN steel_erp.products pr ON pr.id = pso.product_id WHERE pso.production_step_id = ps.id) AS products_made
    FROM steel_erp.production_steps ps
    JOIN steel_erp.production_orders po ON po.id = ps.production_order_id
    JOIN steel_erp.machines m ON m.id = ps.machine_id
    LEFT JOIN steel_erp.parties p ON p.id = po.party_id
    WHERE ps.input_raw_material_id = $1
    ORDER BY po.production_date DESC, ps.started_at DESC`,
    [rawMaterialId],
  );
  return result.rows;
};

export const getRawMaterialStockService = async (
  client,
  rawMaterialId,
  businessModel,
  partyId,
) => {
  let ownershipFilter = "";
  const values = [Number(rawMaterialId)];

  if (businessModel === "OWN_MANUFACTURING") {
    ownershipFilter = `AND sl.ownership_type = 'OWN' AND sl.owner_party_id IS NULL`;
  } else if (businessModel === "JOB_WORK") {
    if (!partyId) throw new ApiError(400, "Party required for job work");
    ownershipFilter = `AND sl.ownership_type = 'JOB_WORK' AND sl.owner_party_id = $2`;
    values.push(Number(partyId));
  }

  const result = await client.query(
    `SELECT rm.id AS raw_material_id, rm.material_name, rm.default_uom AS uom,
      COALESCE(SUM(sl.quantity_in - sl.quantity_out), 0) AS available_stock
    FROM steel_erp.raw_materials rm
    LEFT JOIN steel_erp.stock_ledger sl ON sl.raw_material_id = rm.id AND sl.item_kind = 'RAW' AND sl.is_reversal = false ${ownershipFilter}
    WHERE rm.id = $1 GROUP BY rm.id, rm.material_name, rm.default_uom`,
    values,
  );

  if (result.rowCount === 0) throw new ApiError(404, "Raw material not found");
  return result.rows[0];
};

export const getRawInwardByIdService = async (client, id) => {
  const headerRes = await client.query(
    `SELECT rh.*, p.party_name, p.phone, p.address
    FROM steel_erp.raw_inward_headers rh 
    JOIN steel_erp.parties p ON rh.party_id = p.id 
    WHERE rh.id = $1`,
    [id],
  );

  if (!headerRes.rowCount) throw new ApiError(404, "Inward not found");

  const linesRes = await client.query(
    `SELECT rl.*, rm.material_name, rm.default_uom
    FROM steel_erp.raw_inward_lines rl
    JOIN steel_erp.raw_materials rm ON rl.raw_material_id = rm.id
    WHERE rl.header_id = $1`,
    [id],
  );

  const header = headerRes.rows[0];
  const parsedData = parseInwardRemarks(header.remarks);

  const enrichedLines = linesRes.rows.map((line) => {
    const pricingData = parsedData.lines_pricing?.[line.raw_number] || {
      rate: 0,
      amount: 0,
    };
    return {
      ...line,
      rate: pricingData.rate,
      amount: pricingData.amount,
      line_total: pricingData.amount,
    };
  });

  const amount_paid =
    parsedData.payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
  const subtotal = enrichedLines.reduce((sum, l) => sum + Number(l.amount), 0);
  const grand_total = parsedData.billing
    ? Number(parsedData.billing.grand_total)
    : subtotal;

  let payment_status = "UNPAID";
  if (amount_paid > 0 && amount_paid < grand_total) payment_status = "PARTIAL";
  else if (amount_paid >= grand_total && grand_total > 0)
    payment_status = "PAID";

  return {
    ...header,
    remarks: parsedData.text,
    billing: parsedData.billing,
    amount_paid,
    subtotal,
    grand_total,
    payment_status,
    payments:
      parsedData.payments?.sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at),
      ) || [],
    lines: enrichedLines,
  };
};

export const addRawInwardPaymentService = async (
  client,
  inwardId,
  data,
  userId,
) => {
  await setAuditContext(client, userId);
  const check = await client.query(
    `SELECT remarks FROM steel_erp.raw_inward_headers WHERE id = $1 FOR UPDATE`,
    [inwardId],
  );
  if (!check.rowCount) throw new ApiError(404, "Inward not found.");

  const parsed = parseInwardRemarks(check.rows[0].remarks);
  if (!parsed.payments) parsed.payments = [];

  parsed.payments.push({
    id: Date.now().toString(),
    payment_date: data.payment_date,
    amount: Number(data.amount),
    payment_mode: data.payment_mode || "Bank Transfer",
    reference_no: data.reference_no || "",
    created_at: new Date().toISOString(),
  });

  await client.query(
    `UPDATE steel_erp.raw_inward_headers SET remarks = $1 WHERE id = $2`,
    [JSON.stringify(parsed), inwardId],
  );

  return { message: "Payment logged securely." };
};
