import { ApiError } from "../../utils/ApiError.js";

const setAuditContext = async (client, userId) => {
  if (userId)
    await client.query(`SELECT set_config('app.user_id', $1::text, true)`, [
      userId,
    ]);
};

const parseDispatchRemarks = (rawRemarks) => {
  try {
    if (!rawRemarks) return { text: "", payments: [], billing: null };
    const parsed = JSON.parse(rawRemarks);
    if (parsed && typeof parsed === "object") {
      return {
        text: parsed.text || "",
        payments: Array.isArray(parsed.payments) ? parsed.payments : [],
        billing: parsed.billing || null, // Extract billing metadata
      };
    }
  } catch (e) {}
  return { text: rawRemarks || "", payments: [], billing: null };
};

export const createDispatchService = async (client, data, userId) => {
  await setAuditContext(client, userId);
  const {
    dispatch_no,
    dispatch_type,
    dispatch_date,
    party_id,
    remarks,
    lines,
    billing,
  } = data;

  const initialPayload = JSON.stringify({
    text: remarks || "",
    payments: [],
    billing: billing || null,
  });

  const headerRes = await client.query(
    `INSERT INTO steel_erp.dispatch_headers (dispatch_no, dispatch_type, dispatch_date, party_id, remarks, created_by)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [
      dispatch_no,
      dispatch_type,
      dispatch_date,
      party_id,
      initialPayload,
      userId,
    ],
  );
  const header = headerRes.rows[0];

  const movementMap = {
    OWN_SALE: "SALE",
    JOB_WORK_RETURN: "JOB_WORK_RETURN",
    SCRAP_SALE: "SCRAP_SALE",
  };
  const movement_type = movementMap[dispatch_type];

  for (const line of lines) {
    let item_kind = dispatch_type === "SCRAP_SALE" ? "SCRAP" : line.item_kind;
    let ownership_type =
      dispatch_type === "JOB_WORK_RETURN" ? "JOB_WORK" : "OWN";
    let owner_party_id = ownership_type === "JOB_WORK" ? party_id : null;
    let product_id = item_kind === "FINISHED" ? line.item_id : null;

    let scrap_type_id = null;
    if (dispatch_type === "SCRAP_SALE") {
      const scrapMaster = await client.query(
        `SELECT id FROM steel_erp.scrap_types LIMIT 1`,
      );
      if (scrapMaster.rowCount === 0)
        throw new ApiError(400, "No scrap categories exist in the database.");
      scrap_type_id = scrapMaster.rows[0].id;
    }

    const lineRes = await client.query(
      `INSERT INTO steel_erp.dispatch_lines (dispatch_header_id, item_kind, ownership_type, owner_party_id, product_id, scrap_type_id, quantity, uom, sale_rate)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [
        header.id,
        item_kind,
        ownership_type,
        owner_party_id,
        product_id,
        scrap_type_id,
        line.quantity,
        line.uom,
        line.sale_rate || 0,
      ],
    );

    await client.query(
      `INSERT INTO steel_erp.stock_ledger (movement_date, movement_type, ownership_type, owner_party_id, item_kind, product_id, scrap_type_id, quantity_out, uom, reference_module, reference_id, reference_line_id, created_by, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'DISPATCH', $10, $11, $12, $13)`,
      [
        dispatch_date,
        movement_type,
        ownership_type,
        owner_party_id,
        item_kind,
        product_id,
        scrap_type_id,
        line.quantity,
        line.uom,
        header.id,
        lineRes.rows[0].id,
        userId,
        `Dispatch No: ${dispatch_no}`,
      ],
    );
  }
  return header;
};

export const getDispatchesService = async (client, query) => {
  const {
    page = 1,
    limit = 50,
    search,
    date_filter,
    startDate,
    endDate,
    dispatch_type,
    payment_status,
    status,
  } = query;
  const offset = (page - 1) * limit;

  let conditions = ["1=1"];
  let values = [];

  if (status && status !== "ALL") {
    values.push(status);
    conditions.push(`dh.status = $${values.length}`);
  }
  if (dispatch_type) {
    values.push(dispatch_type);
    conditions.push(`dh.dispatch_type = $${values.length}`);
  }
  if (date_filter) {
    switch (date_filter) {
      case "TODAY":
        conditions.push(`dh.dispatch_date = CURRENT_DATE`);
        break;
      case "YESTERDAY":
        conditions.push(`dh.dispatch_date = CURRENT_DATE - INTERVAL '1 day'`);
        break;
      case "WEEK":
        conditions.push(
          `date_trunc('week', dh.dispatch_date) = date_trunc('week', CURRENT_DATE)`,
        );
        break;
      case "MONTH":
        conditions.push(
          `date_trunc('month', dh.dispatch_date) = date_trunc('month', CURRENT_DATE)`,
        );
        break;
      case "CUSTOM":
        values.push(startDate, endDate);
        conditions.push(
          `dh.dispatch_date BETWEEN $${values.length - 1} AND $${values.length}`,
        );
        break;
    }
  }
  if (search) {
    values.push(`%${search}%`);
    conditions.push(
      `(dh.dispatch_no ILIKE $${values.length} OR p.party_name ILIKE $${values.length})`,
    );
  }

  const sql = `
    SELECT dh.*, p.party_name, COALESCE(SUM(dl.line_total), 0) as total_amount, COUNT(dl.id) as item_count
    FROM steel_erp.dispatch_headers dh
    JOIN steel_erp.parties p ON dh.party_id = p.id
    LEFT JOIN steel_erp.dispatch_lines dl ON dh.id = dl.dispatch_header_id
    WHERE ${conditions.join(" AND ")}
    GROUP BY dh.id, p.party_name
    ORDER BY dh.status DESC, dh.dispatch_date DESC, dh.created_at DESC
    LIMIT $${values.length + 1} OFFSET $${values.length + 2}
  `;

  const countSql = `SELECT count(dh.id)::int as total FROM steel_erp.dispatch_headers dh JOIN steel_erp.parties p ON dh.party_id = p.id WHERE ${conditions.join(" AND ")}`;
  const [dataRes, countRes] = await Promise.all([
    client.query(sql, [...values, limit, offset]),
    client.query(countSql, values),
  ]);

  let processedRows = dataRes.rows.map((row) => {
    const parsedData = parseDispatchRemarks(row.remarks);
    const amount_paid = parsedData.payments.reduce(
      (sum, p) => sum + Number(p.amount),
      0,
    );
    const subtotal = Number(row.total_amount);
    const grand_total = parsedData.billing
      ? Number(parsedData.billing.grand_total)
      : subtotal;

    let dynamic_status = row.payment_status;
    if (amount_paid > 0 && amount_paid < grand_total)
      dynamic_status = "PARTIAL";
    else if (amount_paid >= grand_total && grand_total > 0)
      dynamic_status = "PAID";

    return {
      ...row,
      remarks: parsedData.text,
      billing: parsedData.billing,
      amount_paid,
      grand_total,
      payment_status: dynamic_status,
    };
  });

  if (payment_status) {
    processedRows = processedRows.filter(
      (r) => r.payment_status === payment_status,
    );
  }

  return {
    data: processedRows,
    meta: {
      total: countRes.rows[0].total,
      page: Number(page),
      limit: Number(limit),
      total_pages: Math.ceil(countRes.rows[0].total / limit),
    },
  };
};

export const getDispatchByIdService = async (client, id) => {
  const headerRes = await client.query(
    `SELECT dh.*, p.party_name, p.phone, p.address 
    FROM steel_erp.dispatch_headers dh JOIN steel_erp.parties p ON dh.party_id = p.id WHERE dh.id = $1`,
    [id],
  );

  if (!headerRes.rowCount) throw new ApiError(404, "Dispatch not found");

  const linesRes = await client.query(
    `SELECT dl.*, pr.product_name, pr.product_code, st.scrap_name 
    FROM steel_erp.dispatch_lines dl
    LEFT JOIN steel_erp.products pr ON dl.product_id = pr.id
    LEFT JOIN steel_erp.scrap_types st ON dl.scrap_type_id = st.id
    WHERE dl.dispatch_header_id = $1`,
    [id],
  );

  const header = headerRes.rows[0];
  const parsedData = parseDispatchRemarks(header.remarks);
  const amount_paid = parsedData.payments.reduce(
    (sum, p) => sum + Number(p.amount),
    0,
  );
  const subtotal = linesRes.rows.reduce(
    (sum, l) => sum + Number(l.line_total),
    0,
  );
  const grand_total = parsedData.billing
    ? Number(parsedData.billing.grand_total)
    : subtotal;

  let dynamic_status = header.payment_status;
  if (amount_paid > 0 && amount_paid < grand_total) dynamic_status = "PARTIAL";
  else if (amount_paid >= grand_total && grand_total > 0)
    dynamic_status = "PAID";

  return {
    ...header,
    remarks: parsedData.text,
    billing: parsedData.billing,
    amount_paid,
    subtotal,
    grand_total,
    payment_status: dynamic_status,
    payments: parsedData.payments.sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at),
    ),
    lines: linesRes.rows,
  };
};

export const addDispatchPaymentService = async (
  client,
  dispatchId,
  data,
  userId,
) => {
  await setAuditContext(client, userId);

  const check = await client.query(
    `SELECT status, remarks FROM steel_erp.dispatch_headers WHERE id = $1 FOR UPDATE`,
    [dispatchId],
  );
  if (!check.rowCount) throw new ApiError(404, "Dispatch not found.");
  if (check.rows[0].status === "CANCELLED")
    throw new ApiError(400, "Cannot add payment to a cancelled dispatch.");

  const linesTotalRes = await client.query(
    `SELECT COALESCE(SUM(line_total),0) as total FROM steel_erp.dispatch_lines WHERE dispatch_header_id = $1`,
    [dispatchId],
  );
  const subtotal = Number(linesTotalRes.rows[0].total);

  const parsed = parseDispatchRemarks(check.rows[0].remarks);
  const grand_total = parsed.billing
    ? Number(parsed.billing.grand_total)
    : subtotal;

  parsed.payments.push({
    id: Date.now().toString(),
    payment_date: data.payment_date,
    amount: Number(data.amount),
    payment_mode: data.payment_mode || "Bank Transfer",
    reference_no: data.reference_no || "",
    created_at: new Date().toISOString(),
  });

  const amount_paid = parsed.payments.reduce(
    (acc, p) => acc + Number(p.amount),
    0,
  );
  const dbEnumStatus =
    amount_paid >= grand_total && grand_total > 0 ? "PAID" : "UNPAID";

  await client.query(
    `UPDATE steel_erp.dispatch_headers SET remarks = $1, payment_status = $2 WHERE id = $3`,
    [JSON.stringify(parsed), dbEnumStatus, dispatchId],
  );

  return { message: "Payment logged securely." };
};

export const updatePaymentStatusService = async (
  client,
  id,
  status,
  userId,
) => {
  await setAuditContext(client, userId);

  const headerRes = await client.query(
    `SELECT remarks, status FROM steel_erp.dispatch_headers WHERE id = $1 FOR UPDATE`,
    [id],
  );
  if (!headerRes.rowCount || headerRes.rows[0].status === "CANCELLED")
    throw new ApiError(400, "Cannot update status.");

  const linesTotalRes = await client.query(
    `SELECT COALESCE(SUM(line_total),0) as total FROM steel_erp.dispatch_lines WHERE dispatch_header_id = $1`,
    [id],
  );
  const subtotal = Number(linesTotalRes.rows[0].total);

  const parsed = parseDispatchRemarks(headerRes.rows[0].remarks);
  const grand_total = parsed.billing
    ? Number(parsed.billing.grand_total)
    : subtotal;

  if (status === "PAID") {
    const paidSoFar = parsed.payments.reduce(
      (acc, p) => acc + Number(p.amount),
      0,
    );
    if (grand_total > paidSoFar) {
      parsed.payments.push({
        id: Date.now().toString(),
        payment_date: new Date().toISOString().split("T")[0],
        amount: grand_total - paidSoFar, // 🌟 Settle based on GRAND TOTAL
        payment_mode: "Auto-Settled",
        reference_no: "Manual Toggle",
        created_at: new Date().toISOString(),
      });
    }
  } else {
    parsed.payments = [];
  }

  const res = await client.query(
    `UPDATE steel_erp.dispatch_headers SET payment_status = $1, remarks = $2 WHERE id = $3 RETURNING id`,
    [status, JSON.stringify(parsed), id],
  );
  return res.rows[0];
};

export const updateDispatchInfoService = async (client, id, data, userId) => {
  await setAuditContext(client, userId);
  const headerRes = await client.query(
    `SELECT remarks, status FROM steel_erp.dispatch_headers WHERE id = $1`,
    [id],
  );
  if (!headerRes.rowCount || headerRes.rows[0].status === "CANCELLED")
    throw new ApiError(400, "Cannot update.");

  const parsed = parseDispatchRemarks(headerRes.rows[0].remarks);
  parsed.text = data.remarks || "";

  const res = await client.query(
    `UPDATE steel_erp.dispatch_headers SET remarks = $1 WHERE id = $2 RETURNING id`,
    [JSON.stringify(parsed), id],
  );
  return res.rows[0];
};

export const cancelDispatchService = async (client, id, userId) => {
  await setAuditContext(client, userId);

  const check = await client.query(
    `SELECT status FROM steel_erp.dispatch_headers WHERE id=$1 FOR UPDATE`,
    [id],
  );
  if (!check.rowCount) throw new ApiError(404, "Dispatch not found");
  if (check.rows[0].status === "CANCELLED")
    throw new ApiError(400, "Dispatch is already cancelled.");

  await client.query(
    `SELECT steel_erp.fn_reverse_stock_by_reference('DISPATCH'::text, $1::bigint, $2::bigint)`,
    [id, userId],
  );
  await client.query(
    `UPDATE steel_erp.dispatch_headers SET status='CANCELLED', updated_at=now() WHERE id=$1`,
    [id],
  );

  return { message: "Dispatch successfully cancelled and stock reverted." };
};
