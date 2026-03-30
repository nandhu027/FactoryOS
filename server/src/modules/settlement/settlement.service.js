import { ApiError } from "../../utils/ApiError.js";

const setAuditContext = async (client, userId) => {
  if (userId)
    await client.query(`SELECT set_config('app.user_id', $1::text, true)`, [
      userId,
    ]);
};

const parseShadowLedger = (rawRemarks) => {
  try {
    if (!rawRemarks)
      return { text: "", payments: [], billing: null, lines_pricing: {} };
    const parsed = JSON.parse(rawRemarks);
    if (parsed && typeof parsed === "object") {
      return {
        text: parsed.text || "",
        payments: Array.isArray(parsed.payments) ? parsed.payments : [],
        billing: parsed.billing || null,
        lines_pricing: parsed.lines_pricing || {},
      };
    }
  } catch (e) {}
  return {
    text: rawRemarks || "",
    payments: [],
    billing: null,
    lines_pricing: {},
  };
};

export const getSettlementsService = async (client, query) => {
  const { party_id, status, bill_type, start_date, end_date, search } = query;

  let inwardConditions = ["1=1"];
  let dispatchConditions = ["1=1"];
  let inwardValues = [];
  let dispatchValues = [];

  if (party_id) {
    inwardValues.push(party_id);
    inwardConditions.push(`rh.party_id = $${inwardValues.length}`);
    dispatchValues.push(party_id);
    dispatchConditions.push(`dh.party_id = $${dispatchValues.length}`);
  }

  if (start_date && end_date) {
    inwardValues.push(start_date, end_date);
    inwardConditions.push(
      `rh.inward_date BETWEEN $${inwardValues.length - 1} AND $${inwardValues.length}`,
    );
    dispatchValues.push(start_date, end_date);
    dispatchConditions.push(
      `dh.dispatch_date BETWEEN $${dispatchValues.length - 1} AND $${dispatchValues.length}`,
    );
  }

  if (search) {
    inwardValues.push(`%${search}%`);
    inwardConditions.push(
      `(rh.inward_no ILIKE $${inwardValues.length} OR p.party_name ILIKE $${inwardValues.length})`,
    );
    dispatchValues.push(`%${search}%`);
    dispatchConditions.push(
      `(dh.dispatch_no ILIKE $${dispatchValues.length} OR p.party_name ILIKE $${dispatchValues.length})`,
    );
  }

  let fetchInwards = ["ALL", "PURCHASE"].includes(bill_type);
  let fetchDispatches = [
    "ALL",
    "DISPATCH",
    "OWN_SALE",
    "JOB_WORK_RETURN",
    "SCRAP_SALE",
  ].includes(bill_type);

  if (bill_type !== "ALL" && bill_type !== "DISPATCH" && fetchDispatches) {
    dispatchValues.push(bill_type);
    dispatchConditions.push(`dh.dispatch_type = $${dispatchValues.length}`);
  }

  let payablesRes = { rows: [] };
  let receivablesRes = { rows: [] };

  if (fetchInwards) {
    payablesRes = await client.query(
      `
      SELECT rh.id, rh.inward_no as bill_no, rh.inward_date as bill_date, 'PURCHASE' as bill_type, 
             p.party_name, rh.remarks, 0 as fallback_subtotal
      FROM steel_erp.raw_inward_headers rh
      JOIN steel_erp.parties p ON rh.party_id = p.id
      WHERE ${inwardConditions.join(" AND ")}
      AND rh.business_model IS DISTINCT FROM 'JOB_WORK'
    `,
      inwardValues,
    );
  }

  if (fetchDispatches) {
    receivablesRes = await client.query(
      `
      SELECT dh.id, dh.dispatch_no as bill_no, dh.dispatch_date as bill_date, dh.dispatch_type as bill_type, 
             p.party_name, dh.remarks,
             COALESCE((SELECT SUM(quantity * sale_rate) FROM steel_erp.dispatch_lines WHERE dispatch_header_id = dh.id), 0) as fallback_subtotal
      FROM steel_erp.dispatch_headers dh
      JOIN steel_erp.parties p ON dh.party_id = p.id
      WHERE ${dispatchConditions.join(" AND ")}
    `,
      dispatchValues,
    );
  }

  const processBills = (rows, direction, prefix) => {
    return rows.map((row) => {
      const parsed = parseShadowLedger(row.remarks);

      let fallback_total = Number(row.fallback_subtotal || 0);
      if (prefix === "PURCHASE" && parsed.lines_pricing) {
        fallback_total = Object.values(parsed.lines_pricing).reduce(
          (acc, curr) => acc + Number(curr.amount || 0),
          0,
        );
      }

      const grand_total = parsed.billing?.grand_total
        ? Number(parsed.billing.grand_total)
        : fallback_total;
      const amount_paid = parsed.payments.reduce(
        (sum, p) => sum + Number(p.amount),
        0,
      );
      const balance_due = grand_total - amount_paid;

      let dynamic_status = "PENDING";
      if (amount_paid > 0 && balance_due > 0) dynamic_status = "PARTIAL";
      if (balance_due <= 0 && grand_total > 0) dynamic_status = "PAID";
      // Handle zero value bills naturally
      if (grand_total === 0) dynamic_status = "PAID";

      return {
        unique_key: `${prefix}-${row.id}`,
        id: row.id,
        bill_no: row.bill_no,
        bill_date: row.bill_date,
        bill_type: row.bill_type,
        party_name: row.party_name,
        direction,
        grand_total,
        amount_paid,
        balance_due,
        status: dynamic_status,
        last_payment_date:
          parsed.payments.length > 0
            ? parsed.payments[parsed.payments.length - 1].payment_date
            : null,
      };
    });
  };

  let allBills = [
    ...processBills(payablesRes.rows, "PAYABLE", "PURCHASE"),
    ...processBills(receivablesRes.rows, "RECEIVABLE", "DISPATCH"),
  ];

  const jobworkParties = new Set(
    allBills
      .filter((b) => b.bill_type === "JOB_WORK_RETURN")
      .map((b) => b.party_name),
  );

  allBills = allBills.filter((b) => {
    if (b.bill_type === "PURCHASE" && jobworkParties.has(b.party_name)) {
      return false; // Wipe out the purchase bill
    }
    return true;
  });

  if (status !== "ALL") {
    allBills = allBills.filter((b) => b.status === status);
  }

  allBills.sort((a, b) => new Date(b.bill_date) - new Date(a.bill_date));
  return allBills;
};

export const processSettlementService = async (client, data, userId) => {
  await setAuditContext(client, userId);
  const {
    module_type,
    record_id,
    amount,
    payment_date,
    payment_mode,
    reference_no,
  } = data;

  const isPayable = module_type === "PURCHASE";
  const tableName = isPayable
    ? "steel_erp.raw_inward_headers"
    : "steel_erp.dispatch_headers";

  const check = await client.query(
    `SELECT remarks ${!isPayable ? ", dispatch_type" : ""} FROM ${tableName} WHERE id = $1 FOR UPDATE`,
    [record_id],
  );

  if (!check.rowCount) throw new ApiError(404, "Bill not found in database.");

  if (!isPayable && check.rows[0].dispatch_type !== module_type) {
    throw new ApiError(
      400,
      "Mismatch between Bill Type and Record ID. Action blocked.",
    );
  }

  const parsed = parseShadowLedger(check.rows[0].remarks);

  let fallback_total = 0;
  if (isPayable) {
    if (parsed.lines_pricing) {
      fallback_total = Object.values(parsed.lines_pricing).reduce(
        (acc, curr) => acc + Number(curr.amount || 0),
        0,
      );
    }
  } else {
    const linesTotalRes = await client.query(
      `SELECT COALESCE(SUM(quantity * sale_rate), 0) as total FROM steel_erp.dispatch_lines WHERE dispatch_header_id = $1`,
      [record_id],
    );
    fallback_total = Number(linesTotalRes.rows[0].total);
  }

  const grand_total = parsed.billing?.grand_total
    ? Number(parsed.billing.grand_total)
    : fallback_total;
  const already_paid = parsed.payments.reduce(
    (sum, p) => sum + Number(p.amount),
    0,
  );

  if (already_paid + Number(amount) > grand_total + 1) {
    throw new ApiError(
      400,
      `Payment exceeds outstanding balance. Total: ₹${grand_total}, Paid: ₹${already_paid}`,
    );
  }

  parsed.payments.push({
    id: `TXN-${Date.now()}`,
    payment_date,
    amount: Number(amount),
    payment_mode,
    reference_no: reference_no || "",
    created_at: new Date().toISOString(),
    created_by: userId,
  });

  const new_paid_total = already_paid + Number(amount);
  const new_status = new_paid_total >= grand_total ? "PAID" : "PARTIAL";

  if (!isPayable) {
    await client.query(
      `UPDATE ${tableName} SET remarks = $1, payment_status = $2 WHERE id = $3`,
      [
        JSON.stringify(parsed),
        new_status === "PARTIAL" ? "UNPAID" : "PAID",
        record_id,
      ],
    );
  } else {
    await client.query(`UPDATE ${tableName} SET remarks = $1 WHERE id = $2`, [
      JSON.stringify(parsed),
      record_id,
    ]);
  }

  return {
    message: "Payment processed securely",
    status: new_status,
    amount_paid: amount,
    balance_due: grand_total - new_paid_total,
  };
};

export const reverseSettlementService = async (
  client,
  record_id,
  payment_id,
  module_type,
  userId,
) => {
  await setAuditContext(client, userId);

  const isPayable = module_type === "PURCHASE";
  const tableName = isPayable
    ? "steel_erp.raw_inward_headers"
    : "steel_erp.dispatch_headers";

  const check = await client.query(
    `SELECT remarks ${!isPayable ? ", dispatch_type" : ""} FROM ${tableName} WHERE id = $1 FOR UPDATE`,
    [record_id],
  );

  if (!check.rowCount) throw new ApiError(404, "Bill not found in database.");

  if (!isPayable && check.rows[0].dispatch_type !== module_type) {
    throw new ApiError(400, "Mismatch between Bill Type and Record ID.");
  }

  const parsed = parseShadowLedger(check.rows[0].remarks);
  const paymentIndex = parsed.payments.findIndex((p) => p.id === payment_id);

  if (paymentIndex === -1) {
    throw new ApiError(
      404,
      "Payment transaction not found or already reversed.",
    );
  }

  parsed.payments.splice(paymentIndex, 1);

  if (!isPayable) {
    let fallback_total = 0;
    const linesTotalRes = await client.query(
      `SELECT COALESCE(SUM(quantity * sale_rate), 0) as total FROM steel_erp.dispatch_lines WHERE dispatch_header_id = $1`,
      [record_id],
    );
    fallback_total = Number(linesTotalRes.rows[0].total);

    const grand_total = parsed.billing?.grand_total
      ? Number(parsed.billing.grand_total)
      : fallback_total;
    const remaining_paid = parsed.payments.reduce(
      (sum, p) => sum + Number(p.amount),
      0,
    );

    const new_status =
      remaining_paid >= grand_total && grand_total > 0 ? "PAID" : "UNPAID";

    await client.query(
      `UPDATE ${tableName} SET remarks = $1, payment_status = $2 WHERE id = $3`,
      [JSON.stringify(parsed), new_status, record_id],
    );
  } else {
    await client.query(`UPDATE ${tableName} SET remarks = $1 WHERE id = $2`, [
      JSON.stringify(parsed),
      record_id,
    ]);
  }

  return { message: "Payment reversed successfully." };
};
