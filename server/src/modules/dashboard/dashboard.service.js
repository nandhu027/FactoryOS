import { ApiError } from "../../utils/ApiError.js";

const parseShadowLedger = (raw) => {
  try {
    if (!raw)
      return { text: "", payments: [], billing: null, lines_pricing: {} };
    let parsed = raw;
    if (typeof raw === "string") {
      const trimmed = raw.trim();
      if (trimmed.startsWith("{") || trimmed.startsWith("["))
        parsed = JSON.parse(trimmed);
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
    text: typeof raw === "string" ? raw : "",
    payments: [],
    billing: null,
    lines_pricing: {},
  };
};

const normalizeDateStr = (dateInput) => {
  if (!dateInput) return "1970-01-01";

  if (dateInput instanceof Date) {
    const year = dateInput.getFullYear();
    const month = String(dateInput.getMonth() + 1).padStart(2, "0");
    const day = String(dateInput.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  const dStr = String(dateInput).trim();
  if (dStr.includes("T")) return dStr.split("T")[0];

  const parts = dStr.split(/[-/]/);
  if (parts.length === 3) {
    if (parts[2].length === 4)
      return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
    if (parts[0].length === 4)
      return `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`;
  }
  return dStr.substring(0, 10);
};

export const getDashboardDataService = async (
  client,
  { startDate, endDate },
) => {
  const todayStr = new Date().toLocaleDateString("en-CA"); // Always YYYY-MM-DD locally
  const startStr = startDate || todayStr;
  const endStr = endDate || todayStr;

  const start = `${startStr} 00:00:00`;
  const end = `${endStr} 23:59:59`;

  const megaMetricsRes = await client.query(
    `
    WITH time_bounds AS (
      SELECT $1::timestamp as start_t, $2::timestamp as end_t, $1::date as start_d, $2::date as end_d
    ),
    kpi AS (
      SELECT 
        (SELECT COALESCE(sum(quantity_in - quantity_out), 0) FROM steel_erp.stock_ledger WHERE movement_ts BETWEEN (SELECT start_t FROM time_bounds) AND (SELECT end_t FROM time_bounds) AND movement_type = 'PRODUCTION_OUTPUT') AS yield_kg,
        (SELECT COALESCE(sum(CASE WHEN dl.uom = 'TON' THEN dl.quantity * 1000 ELSE dl.quantity END), 0) FROM steel_erp.dispatch_lines dl JOIN steel_erp.dispatch_headers dh ON dl.dispatch_header_id = dh.id WHERE dh.dispatch_date BETWEEN (SELECT start_d FROM time_bounds) AND (SELECT end_d FROM time_bounds) AND dh.status IS DISTINCT FROM 'CANCELLED') AS dispatch_qty_kg,
        (SELECT count(*) FROM steel_erp.production_steps WHERE status = 'IN_PROGRESS' AND updated_at < now() - interval '2 hours') AS stuck_steps
    ),
    machines AS (
      SELECT count(*) FILTER (WHERE status = 'ACTIVE') as active, count(*) FILTER (WHERE status = 'INACTIVE') as idle, count(*) FILTER (WHERE status = 'UNDER_MAINTENANCE') as maintenance, count(*) as total FROM steel_erp.machines WHERE is_active = true
    ),
    fin AS (
      SELECT 
        (SELECT COALESCE(sum(amount), 0) FROM steel_erp.expenses WHERE expense_date BETWEEN (SELECT start_d FROM time_bounds) AND (SELECT end_d FROM time_bounds)) as total_expenses,
        (SELECT COALESCE(sum(amount), 0) FROM steel_erp.personnel_payments WHERE payment_date BETWEEN (SELECT start_d FROM time_bounds) AND (SELECT end_d FROM time_bounds) AND COALESCE(is_reversed, false) = false) as total_payroll
    ),
    wf AS (
      SELECT count(*) FILTER (WHERE personnel_type = 'STAFF' AND is_active = true) as active_staff, count(*) FILTER (WHERE personnel_type = 'CONTRACTOR' AND is_active = true) as active_contractors FROM steel_erp.personnel
    )
    SELECT 
      (SELECT row_to_json(kpi.*) FROM kpi) as kpis,
      (SELECT row_to_json(machines.*) FROM machines) as machines,
      (SELECT row_to_json(fin.*) FROM fin) as finance,
      (SELECT row_to_json(wf.*) FROM wf) as workforce
  `,
    [start, end],
  );

  const rawMetrics = megaMetricsRes.rows[0];

  const [
    stockRes,
    allDispatchesRes,
    allInwardsRes,
    chartRes,
    timelineRes,
    attendanceCountsRes,
    attendanceDetailsRes,
    expensesListRes,
    paymentsListRes,
  ] = await Promise.all([
    client.query(
      `SELECT item_kind, COALESCE(sum(quantity_in - quantity_out), 0) as balance FROM steel_erp.stock_ledger GROUP BY item_kind`,
    ),
    client.query(
      `SELECT p.party_name, dh.dispatch_date, dh.remarks, dh.dispatch_type, dh.created_at, (SELECT COALESCE(SUM(quantity * sale_rate),0) FROM steel_erp.dispatch_lines WHERE dispatch_header_id = dh.id) as fallback_total FROM steel_erp.dispatch_headers dh JOIN steel_erp.parties p ON dh.party_id = p.id WHERE dh.status IS DISTINCT FROM 'CANCELLED'`,
    ),
    client.query(
      `SELECT p.party_name, rh.inward_date, rh.remarks, rh.business_model, rh.created_at FROM steel_erp.raw_inward_headers rh JOIN steel_erp.parties p ON rh.party_id = p.id`,
    ),
    client.query(
      `SELECT DATE(movement_ts AT TIME ZONE 'Asia/Kolkata') as prod_date, 
              COALESCE(sum(quantity_in - quantity_out), 0) as yield 
       FROM steel_erp.stock_ledger 
       WHERE movement_ts BETWEEN $1 AND $2 
         AND movement_type = 'PRODUCTION_OUTPUT' 
       GROUP BY DATE(movement_ts AT TIME ZONE 'Asia/Kolkata') 
       ORDER BY prod_date ASC`,
      [start, end],
    ),
    client.query(
      `SELECT * FROM ( SELECT 'alert' as type, 'Machine Down' as title, machine_name as machine, updated_at as event_time FROM steel_erp.machines WHERE status = 'UNDER_MAINTENANCE' UNION ALL SELECT 'alert' as type, 'Stuck Production' as title, po.batch_no || ' - ' || ps.step_name as machine, ps.updated_at as event_time FROM steel_erp.production_steps ps JOIN steel_erp.production_orders po ON ps.production_order_id = po.id WHERE ps.status = 'IN_PROGRESS' AND ps.updated_at < now() - interval '2 hours' UNION ALL SELECT 'success' as type, 'Batch Completed' as title, batch_no as machine, updated_at as event_time FROM steel_erp.production_orders WHERE status = 'COMPLETED' UNION ALL SELECT 'success' as type, 'Dispatch Shipped' as title, dh.dispatch_no as machine, dh.created_at as event_time FROM steel_erp.dispatch_headers dh WHERE dh.status IS DISTINCT FROM 'CANCELLED' ) as unified_timeline WHERE event_time BETWEEN $1 AND $2 ORDER BY event_time DESC LIMIT 50`,
      [start, end],
    ),
    client.query(
      `SELECT COUNT(*) FILTER (WHERE status = 'PRESENT') as present_days, COUNT(*) FILTER (WHERE status = 'HALF_DAY') as halfday_days, COUNT(*) FILTER (WHERE status = 'ABSENT') as absent_days FROM steel_erp.vw_staff_attendance_daily WHERE attendance_date::date >= $1::date AND attendance_date::date <= $2::date`,
      [startStr, endStr],
    ),
    client.query(
      `SELECT staff_name, status, attendance_date FROM steel_erp.vw_staff_attendance_daily WHERE attendance_date::date >= $1::date AND attendance_date::date <= $2::date ORDER BY attendance_date DESC, staff_name ASC LIMIT 50`,
      [startStr, endStr],
    ),
    client.query(
      `SELECT e.id, e.amount, e.reason, c.category_name, e.expense_date FROM steel_erp.expenses e JOIN steel_erp.expense_categories c ON e.category_id = c.id WHERE e.expense_date::date >= $1::date AND e.expense_date::date <= $2::date ORDER BY e.expense_date DESC, e.id DESC LIMIT 8`,
      [startStr, endStr],
    ),
    client.query(
      `SELECT pp.id, pp.amount, pp.reason, p.full_name, p.personnel_type, pp.payment_date FROM steel_erp.personnel_payments pp JOIN steel_erp.personnel p ON pp.personnel_id = p.id WHERE pp.payment_date::date >= $1::date AND pp.payment_date::date <= $2::date AND COALESCE(pp.is_reversed, false) = false ORDER BY pp.payment_date DESC, pp.id DESC LIMIT 8`,
      [startStr, endStr],
    ),
  ]);
  let monthly_sales_billed = 0;
  let monthly_amount_received = 0;
  const receivablesMap = {};

  allDispatchesRes.rows.forEach((row) => {
    const isSale = [
      "OWN_SALE",
      "JOB_WORK_RETURN",
      "SCRAP_SALE",
      "DISPATCH",
    ].includes(row.dispatch_type);
    const parsed = parseShadowLedger(row.remarks);
    const billed =
      parsed.billing?.grand_total != null && parsed.billing.grand_total !== ""
        ? Number(parsed.billing.grand_total)
        : Number(row.fallback_total || 0);
    const invoiceDate = normalizeDateStr(row.dispatch_date || row.created_at);

    if (isSale && invoiceDate >= startStr && invoiceDate <= endStr) {
      monthly_sales_billed += isNaN(billed) ? 0 : billed;
    }

    let paid_all_time = 0;
    if (Array.isArray(parsed.payments)) {
      parsed.payments.forEach((p) => {
        const amt = Number(p.amount) || 0;
        paid_all_time += amt;
        const pDate = normalizeDateStr(p.payment_date || p.created_at);
        if (pDate >= startStr && pDate <= endStr) {
          monthly_amount_received += amt;
        }
      });
    }

    if (isSale) {
      const pending = billed - paid_all_time;
      if (pending > 0.5) {
        receivablesMap[row.party_name] =
          (receivablesMap[row.party_name] || 0) + pending;
      }
    }
  });
  let monthly_purchases_billed = 0;
  let monthly_supplier_payments = 0;
  const payablesMap = {};

  allInwardsRes.rows.forEach((row) => {
    const isPurchase = [
      "STANDARD_PURCHASE",
      "OWN_MANUFACTURING",
      "OWN_MANUFACTURING_OUTSOURCE",
    ].includes(row.business_model);
    if (isPurchase) {
      const parsed = parseShadowLedger(row.remarks);
      let fallback_total = 0;
      if (parsed.lines_pricing) {
        fallback_total = Object.values(parsed.lines_pricing).reduce(
          (acc, curr) => acc + Number(curr.amount || 0),
          0,
        );
      }

      const billed =
        parsed.billing?.grand_total != null && parsed.billing.grand_total !== ""
          ? Number(parsed.billing.grand_total)
          : fallback_total;
      const invoiceDate = normalizeDateStr(row.inward_date || row.created_at);

      if (invoiceDate >= startStr && invoiceDate <= endStr) {
        monthly_purchases_billed += isNaN(billed) ? 0 : billed;
      }

      let paid_all_time = 0;
      if (Array.isArray(parsed.payments)) {
        parsed.payments.forEach((p) => {
          const amt = Number(p.amount) || 0;
          paid_all_time += amt;
          const pDate = normalizeDateStr(p.payment_date || p.created_at);
          if (pDate >= startStr && pDate <= endStr) {
            monthly_supplier_payments += amt;
          }
        });
      }

      const pending = billed - paid_all_time;
      if (pending > 0.5) {
        payablesMap[row.party_name] =
          (payablesMap[row.party_name] || 0) + pending;
      }
    }
  });
  const total_expenses = Number(rawMetrics.finance?.total_expenses || 0);
  const total_payroll = Number(rawMetrics.finance?.total_payroll || 0);
  const monthly_amount_paid =
    monthly_supplier_payments + total_expenses + total_payroll;
  const monthly_net_cashflow = monthly_amount_received - monthly_amount_paid;

  const pending_receivables = Object.entries(receivablesMap)
    .map(([name, amount]) => ({ name, amount: Math.round(amount) }))
    .sort((a, b) => b.amount - a.amount);

  const pending_payables = Object.entries(payablesMap)
    .map(([name, amount]) => ({ name, amount: Math.round(amount) }))
    .sort((a, b) => b.amount - a.amount);

  const stockObj = { RAW: 0, SEMI_FINISHED: 0, FINISHED: 0, SCRAP: 0 };
  stockRes.rows.forEach((r) => {
    stockObj[r.item_kind] = Number(r.balance);
  });
  const dailyData = chartRes.rows.reduce((acc, row) => {
    const dStr = normalizeDateStr(row.prod_date);
    acc[dStr] = Number(row.yield) / 1000;
    return acc;
  }, {});

  const chartData = [];
  let currentDate = new Date(startStr);
  const limitDate = new Date(endStr);

  while (currentDate <= limitDate) {
    const dStr = normalizeDateStr(currentDate);
    chartData.push({
      date: dStr,
      yield: dailyData[dStr] || 0,
    });
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return {
    kpis: {
      yield_tonnes: (Number(rawMetrics.kpis?.yield_kg || 0) / 1000).toFixed(2),
      dispatch_qty: `${(Number(rawMetrics.kpis?.dispatch_qty_kg || 0) / 1000).toFixed(2)} MT`,
      stuck_alerts: Number(rawMetrics.kpis?.stuck_steps || 0),
    },
    machines: rawMetrics.machines,
    finance: {
      sales_billed: monthly_sales_billed,
      amount_received: monthly_amount_received,
      purchases_billed: monthly_purchases_billed,
      amount_paid: monthly_amount_paid,
      net_cashflow: monthly_net_cashflow,
      supplier_payments: monthly_supplier_payments,
      total_expenses,
      total_payroll,
    },
    attendance: {
      present: Number(attendanceCountsRes.rows[0]?.present_days || 0),
      halfday: Number(attendanceCountsRes.rows[0]?.halfday_days || 0),
      absent: Number(attendanceCountsRes.rows[0]?.absent_days || 0),
      details: attendanceDetailsRes.rows,
    },
    workforce: rawMetrics.workforce,
    stock: stockObj,
    chartData,
    timeline: timelineRes.rows,
    pending_receivables,
    pending_payables,
    recent_expenses: expensesListRes.rows,
    recent_payments: paymentsListRes.rows,
  };
};
