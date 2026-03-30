import { ApiError } from "../../utils/ApiError.js";

const parseShadowLedger = (rawRemarks) => {
  try {
    if (!rawRemarks)
      return { text: "", payments: [], billing: null, lines_pricing: {} };

    let parsed = rawRemarks;
    if (typeof rawRemarks === "string") {
      const trimmed = rawRemarks.trim();
      if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
        parsed = JSON.parse(trimmed);
      }
    }

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
    text: typeof rawRemarks === "string" ? rawRemarks : "",
    payments: [],
    billing: null,
    lines_pricing: {},
  };
};

export const createPartyService = async (client, data) => {
  const { name, phone, address, types, is_active } = data;

  const existing = await client.query(
    `SELECT id FROM steel_erp.parties WHERE lower(party_name) = lower($1)`,
    [name],
  );
  if (existing.rowCount > 0)
    throw new ApiError(409, "A party with this exact name already exists.");

  const partyRes = await client.query(
    `INSERT INTO steel_erp.parties (party_name, phone, address, is_active) VALUES ($1, $2, $3, $4) RETURNING *`,
    [name, phone || null, address || null, is_active],
  );
  const party = partyRes.rows[0];

  if (types && types.length > 0) {
    for (const type of types) {
      await client.query(
        `INSERT INTO steel_erp.party_types (party_id, party_type) VALUES ($1, $2)`,
        [party.id, type],
      );
    }
  }
  return party;
};

export const getPartiesService = async (client, query) => {
  const { page, limit, search, type, is_active } = query;
  const offset = (page - 1) * limit;

  let conditions = ["1=1"];
  let values = [];

  if (is_active !== undefined) {
    values.push(is_active);
    conditions.push(`p.is_active = $${values.length}`);
  }

  if (search) {
    values.push(`%${search}%`);
    conditions.push(
      `(p.party_name ILIKE $${values.length} OR p.phone ILIKE $${values.length})`,
    );
  }

  if (type) {
    values.push(type);
    conditions.push(
      `EXISTS (SELECT 1 FROM steel_erp.party_types pt WHERE pt.party_id = p.id AND pt.party_type = $${values.length})`,
    );
  }

  const sql = `
    SELECT p.*,
           COALESCE(ARRAY_AGG(DISTINCT pt.party_type::text) FILTER (WHERE pt.party_type IS NOT NULL), ARRAY[]::text[]) AS types
    FROM steel_erp.parties p
    LEFT JOIN steel_erp.party_types pt ON p.id = pt.party_id
    WHERE ${conditions.join(" AND ")}
    GROUP BY p.id
    ORDER BY p.is_active DESC, p.party_name ASC
    LIMIT $${values.length + 1} OFFSET $${values.length + 2}
  `;

  const countSql = `SELECT count(p.id)::int as total FROM steel_erp.parties p WHERE ${conditions.join(" AND ")}`;

  const [dataRes, countRes] = await Promise.all([
    client.query(sql, [...values, limit, offset]),
    client.query(countSql, values),
  ]);

  return {
    data: dataRes.rows,
    meta: { total: countRes.rows[0].total, page, limit },
  };
};

export const getPartyByIdService = async (client, id) => {
  const partyRes = await client.query(
    `SELECT p.*, COALESCE(ARRAY_AGG(DISTINCT pt.party_type::text) FILTER (WHERE pt.party_type IS NOT NULL), ARRAY[]::text[]) AS types
    FROM steel_erp.parties p LEFT JOIN steel_erp.party_types pt ON p.id = pt.party_id WHERE p.id = $1 GROUP BY p.id`,
    [id],
  );
  if (!partyRes.rowCount) throw new ApiError(404, "Party not found");
  const party = partyRes.rows[0];

  const [inwards, dispatches, productions, stock] = await Promise.all([
    client.query(
      `SELECT rh.id, rh.inward_no, rh.inward_date, rh.business_model, rh.challan_no, rh.remarks,
        (SELECT JSONB_AGG(JSONB_BUILD_OBJECT('item', rm.material_name, 'batch', rl.raw_number, 'thick', rl.thickness_mm, 'qty', rl.quantity, 'uom', rl.uom)) 
         FROM steel_erp.raw_inward_lines rl JOIN steel_erp.raw_materials rm ON rm.id = rl.raw_material_id WHERE rl.header_id = rh.id) as items
      FROM steel_erp.raw_inward_headers rh WHERE rh.party_id = $1 ORDER BY rh.inward_date DESC`,
      [id],
    ),
    client.query(
      `SELECT dh.id, dh.dispatch_no, dh.dispatch_type, dh.dispatch_date, dh.payment_status, dh.remarks,
        (SELECT COALESCE(SUM(line_total), 0) FROM steel_erp.dispatch_lines WHERE dispatch_header_id = dh.id) as invoice_value,
        (SELECT JSONB_AGG(JSONB_BUILD_OBJECT('item', COALESCE(pr.product_name, st.scrap_name), 'qty', dl.quantity, 'rate', dl.sale_rate, 'total', dl.line_total, 'uom', dl.uom)) 
         FROM steel_erp.dispatch_lines dl LEFT JOIN steel_erp.products pr ON pr.id = dl.product_id LEFT JOIN steel_erp.scrap_types st ON st.id = dl.scrap_type_id WHERE dl.dispatch_header_id = dh.id) as items
      FROM steel_erp.dispatch_headers dh WHERE dh.party_id = $1 AND dh.status != 'CANCELLED' ORDER BY dh.dispatch_date DESC`,
      [id],
    ),
    client.query(
      `SELECT id, batch_no, production_date, status, business_model FROM steel_erp.production_orders WHERE party_id = $1 ORDER BY production_date DESC`,
      [id],
    ),
    client.query(
      `SELECT raw_qty, semi_finished_qty, finished_qty FROM steel_erp.vw_jobwork_party_dashboard WHERE party_id = $1`,
      [id],
    ),
  ]);

  let lifetime_sale_value = 0;
  let total_amount_received = 0;
  let pending_invoices = 0;

  let lifetime_purchase_value = 0;
  let total_amount_paid_out = 0;
  let pending_bills = 0;

  let all_payments = [];

  const processedInwards = inwards.rows.map((row) => {
    const parsedData = parseShadowLedger(row.remarks);
    let inwardTotal = 0;

    if (parsedData.billing && parsedData.billing.grand_total) {
      inwardTotal = Number(parsedData.billing.grand_total);
    } else if (row.items && row.items.length > 0) {
      inwardTotal = row.items.reduce((sum, item) => {
        const pricing = parsedData.lines_pricing?.[item.batch] || { amount: 0 };
        return sum + Number(pricing.amount || 0);
      }, 0);
    }

    const amountPaid = parsedData.payments.reduce(
      (sum, p) => sum + Number(p.amount),
      0,
    );

    const isPurchase = [
      "STANDARD_PURCHASE",
      "OWN_MANUFACTURING",
      "OWN_MANUFACTURING_OUTSOURCE",
    ].includes(row.business_model);

    if (isPurchase) {
      lifetime_purchase_value += inwardTotal;
      total_amount_paid_out += amountPaid;

      let dynamic_status = "UNPAID";
      if (amountPaid > 0 && amountPaid < inwardTotal)
        dynamic_status = "PARTIAL";
      else if (amountPaid >= inwardTotal && inwardTotal > 0)
        dynamic_status = "PAID";

      if (dynamic_status !== "PAID" && inwardTotal > 0) pending_bills += 1;
      row.payment_status = dynamic_status;

      parsedData.payments.forEach((p) => {
        all_payments.push({
          ...p,
          invoice_no: row.inward_no,
          invoice_date: row.inward_date,
          direction: "OUTFLOW",
        });
      });
    } else {
      row.payment_status = "N/A";
      inwardTotal = 0;
    }

    return {
      ...row,
      remarks: parsedData.text,
      inward_value: inwardTotal,
      amount_paid: amountPaid,
    };
  });

  const processedDispatches = dispatches.rows.map((row) => {
    const parsedData = parseShadowLedger(row.remarks);
    let invoiceTotal = parsedData.billing?.grand_total
      ? Number(parsedData.billing.grand_total)
      : Number(row.invoice_value || 0);
    const amountPaid = parsedData.payments.reduce(
      (sum, p) => sum + Number(p.amount),
      0,
    );

    const isSale = ["OWN_SALE", "JOB_WORK_RETURN", "SCRAP_SALE"].includes(
      row.dispatch_type,
    );

    if (isSale) {
      lifetime_sale_value += invoiceTotal;
      total_amount_received += amountPaid;

      let dynamic_status = "PENDING";
      if (amountPaid > 0 && amountPaid < invoiceTotal)
        dynamic_status = "PARTIAL";
      else if (amountPaid >= invoiceTotal && invoiceTotal > 0)
        dynamic_status = "PAID";
      else if (invoiceTotal === 0) dynamic_status = "N/A";

      if (
        dynamic_status !== "PAID" &&
        dynamic_status !== "N/A" &&
        invoiceTotal > 0
      )
        pending_invoices += 1;
      row.payment_status = dynamic_status;

      parsedData.payments.forEach((p) => {
        all_payments.push({
          ...p,
          invoice_no: row.dispatch_no,
          invoice_date: row.dispatch_date,
          direction: "INFLOW",
        });
      });
    } else {
      row.payment_status = "N/A";
      invoiceTotal = 0;
    }

    return {
      ...row,
      remarks: parsedData.text,
      amount_paid: amountPaid,
      invoice_value: invoiceTotal,
    };
  });

  all_payments.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const today = new Date();
  const currentMonthStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    1,
  ).toISOString();

  const monthly_inwards = processedInwards.filter(
    (i) => new Date(i.inward_date) >= new Date(currentMonthStart),
  );
  const monthly_productions = productions.rows.filter(
    (p) => new Date(p.production_date) >= new Date(currentMonthStart),
  );

  return {
    ...party,
    financial_summary: {
      sales: {
        lifetime_billed: lifetime_sale_value,
        total_received: total_amount_received,
        balance_due: lifetime_sale_value - total_amount_received,
        pending_invoices,
      },
      purchases: {
        lifetime_purchased: lifetime_purchase_value,
        total_paid: total_amount_paid_out,
        balance_due: lifetime_purchase_value - total_amount_paid_out,
        pending_bills,
      },
    },
    stock_snapshot: stock.rows[0] || {
      raw_qty: 0,
      semi_finished_qty: 0,
      finished_qty: 0,
    },

    purchase_history: processedInwards,
    sales_history: processedDispatches,
    payment_ledger: all_payments,

    monthly_logistics: {
      inwards: monthly_inwards,
      productions: monthly_productions,
    },
  };
};

export const updatePartyService = async (client, id, data) => {
  const { name, phone, address, types, is_active } = data;
  const existing = await client.query(
    `SELECT id FROM steel_erp.parties WHERE id = $1`,
    [id],
  );
  if (existing.rowCount === 0) throw new ApiError(404, "Party not found");

  const updated = await client.query(
    `UPDATE steel_erp.parties SET party_name = COALESCE($1, party_name), phone = COALESCE($2, phone), address = COALESCE($3, address), is_active = COALESCE($4, is_active), updated_at = now() WHERE id = $5 RETURNING *`,
    [name, phone, address, is_active, id],
  );

  if (types && Array.isArray(types)) {
    await client.query(
      `DELETE FROM steel_erp.party_types WHERE party_id = $1`,
      [id],
    );
    for (const type of types) {
      await client.query(
        `INSERT INTO steel_erp.party_types (party_id, party_type) VALUES ($1, $2)`,
        [id, type],
      );
    }
  }

  return updated.rows[0];
};

export const deletePartyService = async (client, id) => {
  const existing = await client.query(
    `SELECT id FROM steel_erp.parties WHERE id = $1`,
    [id],
  );
  if (existing.rowCount === 0) throw new ApiError(404, "Party not found");

  const usageCheck = await client.query(
    `SELECT 1 FROM (
       SELECT 1 FROM steel_erp.raw_inward_headers WHERE party_id = $1
       UNION ALL
       SELECT 1 FROM steel_erp.production_orders WHERE party_id = $1
       UNION ALL
       SELECT 1 FROM steel_erp.contractor_jobs WHERE owner_party_id = $1
       UNION ALL
       SELECT 1 FROM steel_erp.dispatch_headers WHERE party_id = $1
       UNION ALL
       SELECT 1 FROM steel_erp.stock_ledger WHERE owner_party_id = $1
     ) AS usage LIMIT 1`,
    [id],
  );

  if (usageCheck.rowCount > 0) {
    await client.query(
      `UPDATE steel_erp.parties SET is_active = false, updated_at = now() WHERE id = $1`,
      [id],
    );
    return {
      message:
        "Party is linked to historical transactions (Inwards/Sales/Production). It has been safely deactivated instead of deleted.",
      deactivated: true,
    };
  } else {
    await client.query(`DELETE FROM steel_erp.parties WHERE id = $1`, [id]);
    return {
      message: "Party permanently eradicated from the system.",
      deleted: true,
    };
  }
};
