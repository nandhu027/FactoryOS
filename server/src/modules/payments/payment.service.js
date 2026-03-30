import { ApiError } from "../../utils/ApiError.js";

const normalizePagination = (query) => {
  const page = Math.max(parseInt(query.page || 1, 10), 1);
  const limit = Math.min(Math.max(parseInt(query.limit || 20, 10), 1), 100);
  const offset = (page - 1) * limit;
  return { page, limit, offset };
};

const normalizeSort = (sort) => {
  if (!sort) return "DESC";
  return sort.toLowerCase() === "asc" ? "ASC" : "DESC";
};

const getLocalTodayString = () => {
  const d = new Date();
  const tzOffset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOffset).toISOString().split("T")[0];
};

const buildPaymentFilters = (query) => {
  const {
    personnel_id,
    personnel_type,
    search,
    start_date,
    end_date,
    date_filter,
  } = query;

  const conditions = ["COALESCE(pp.is_reversed, false) = false"];
  const values = [];

  if (personnel_id) {
    values.push(personnel_id);
    conditions.push(`pp.personnel_id = $${values.length}`);
  }
  if (personnel_type) {
    values.push(personnel_type);
    conditions.push(`p.personnel_type = $${values.length}`);
  }
  if (search) {
    values.push(`%${search.trim()}%`);
    conditions.push(
      `(LOWER(pp.reason) LIKE LOWER($${values.length}) OR LOWER(p.full_name) LIKE LOWER($${values.length}))`,
    );
  }

  switch (date_filter) {
    case "today":
      conditions.push(`pp.payment_date::date = CURRENT_DATE`);
      break;
    case "yesterday":
      conditions.push(
        `pp.payment_date::date = CURRENT_DATE - INTERVAL '1 day'`,
      );
      break;
    case "nextday":
      conditions.push(
        `pp.payment_date::date = CURRENT_DATE + INTERVAL '1 day'`,
      );
      break;
    case "week":
      conditions.push(
        `pp.payment_date::date >= date_trunc('week', CURRENT_DATE) AND pp.payment_date::date < date_trunc('week', CURRENT_DATE) + INTERVAL '1 week'`,
      );
      break;
    case "month":
      conditions.push(
        `pp.payment_date::date >= date_trunc('month', CURRENT_DATE) AND pp.payment_date::date < date_trunc('month', CURRENT_DATE) + INTERVAL '1 month'`,
      );
      break;
    case "custom":
    default:
      if (start_date) {
        values.push(start_date);
        conditions.push(`pp.payment_date::date >= $${values.length}`);
      }
      if (end_date) {
        values.push(end_date);
        conditions.push(`pp.payment_date::date <= $${values.length}`);
      }
      break;
  }

  const where =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  return { where, values };
};

const buildDateFilter = (
  filterType,
  startDate,
  endDate,
  dateField,
  valuesArray,
) => {
  if (!filterType && !startDate && !endDate) return null;

  if (filterType === "CUSTOM") {
    if (startDate && endDate) {
      valuesArray.push(startDate, endDate);
      return ` AND ${dateField} BETWEEN $${valuesArray.length - 1} AND $${valuesArray.length}`;
    }
    return null;
  }

  switch (filterType) {
    case "TODAY":
      return ` AND ${dateField} = CURRENT_DATE`;
    case "YESTERDAY":
      return ` AND ${dateField} = CURRENT_DATE - INTERVAL '1 day'`;
    case "WEEK":
      return ` AND date_trunc('week', ${dateField}) = date_trunc('week', CURRENT_DATE)`;
    case "MONTH":
      return ` AND date_trunc('month', ${dateField}) = date_trunc('month', CURRENT_DATE)`;
    default:
      return null;
  }
};

export const createPaymentService = async (client, data, userId) => {
  const { payment_date, personnel_id, amount, reason } = data;
  const personnel = await client.query(
    `SELECT id, is_active FROM steel_erp.personnel WHERE id = $1`,
    [personnel_id],
  );
  if (!personnel.rowCount) throw new ApiError(404, "Personnel not found");
  if (!personnel.rows[0].is_active)
    throw new ApiError(400, "Cannot log payment for inactive personnel");

  const res = await client.query(
    `INSERT INTO steel_erp.personnel_payments (payment_date, personnel_id, amount, reason, created_by) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [payment_date, personnel_id, amount, reason.trim(), userId],
  );
  return res.rows[0];
};

export const getPaymentsService = async (client, query) => {
  const { page, limit, offset } = normalizePagination(query);
  const sort = normalizeSort(query.sort);
  const { where, values } = buildPaymentFilters(query);

  const countRes = await client.query(
    `SELECT COUNT(*)::int AS total FROM steel_erp.personnel_payments pp JOIN steel_erp.personnel p ON p.id = pp.personnel_id ${where}`,
    values,
  );
  const total = countRes.rows[0].total;

  values.push(limit, offset);
  const res = await client.query(
    `SELECT pp.id, pp.payment_date, pp.amount, pp.reason, pp.created_at, p.id AS personnel_id, p.full_name, p.personnel_type 
     FROM steel_erp.personnel_payments pp JOIN steel_erp.personnel p ON p.id = pp.personnel_id ${where} 
     ORDER BY pp.payment_date ${sort}, pp.id DESC LIMIT $${values.length - 1} OFFSET $${values.length}`,
    values,
  );

  return { total, page, limit, rows: res.rows };
};

export const getPaymentByIdService = async (client, id) => {
  const res = await client.query(
    `SELECT pp.*, p.full_name, p.personnel_type FROM steel_erp.personnel_payments pp JOIN steel_erp.personnel p ON p.id = pp.personnel_id WHERE pp.id = $1 AND COALESCE(pp.is_reversed, false) = false`,
    [id],
  );
  if (!res.rowCount) throw new ApiError(404, "Payment record not found");
  return res.rows[0];
};

export const updatePaymentService = async (client, id, data) => {
  const { payment_date, personnel_id, amount, reason } = data;
  if (personnel_id) {
    const personnel = await client.query(
      `SELECT id FROM steel_erp.personnel WHERE id = $1`,
      [personnel_id],
    );
    if (!personnel.rowCount)
      throw new ApiError(400, "Invalid personnel selected");
  }

  const res = await client.query(
    `UPDATE steel_erp.personnel_payments SET payment_date = COALESCE($1, payment_date), personnel_id = COALESCE($2, personnel_id), amount = COALESCE($3, amount), reason = COALESCE($4, reason) WHERE id = $5 AND COALESCE(is_reversed, false) = false RETURNING *`,
    [payment_date, personnel_id, amount, reason?.trim(), id],
  );
  if (!res.rowCount)
    throw new ApiError(404, "Payment record not found or already reversed");
  return res.rows[0];
};

export const deletePaymentService = async (client, id, userId) => {
  // 1. Fetch original
  const originalRes = await client.query(
    `SELECT * FROM steel_erp.personnel_payments WHERE id = $1 FOR UPDATE`,
    [id],
  );
  if (!originalRes.rowCount) throw new ApiError(404, "Payment not found");

  const original = originalRes.rows[0];
  if (original.is_reversed)
    throw new ApiError(400, "Payment is already reversed");

  const updatedReason = `[REVERSED] ${original.reason}`;

  await client.query(
    `UPDATE steel_erp.personnel_payments SET is_reversed = true, reason = $1 WHERE id = $2`,
    [updatedReason, id],
  );

  return { message: "Payment successfully reversed." };
};

export const getPaymentSummaryService = async (client, query = {}) => {
  const { personnel_id, personnel_type } = query;
  const conditions = ["COALESCE(pp.is_reversed, false) = false"];
  const values = [];

  if (personnel_id) {
    values.push(personnel_id);
    conditions.push(`pp.personnel_id = $${values.length}`);
  }
  if (personnel_type) {
    values.push(personnel_type);
    conditions.push(`p.personnel_type = $${values.length}`);
  }

  const where =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const res = await client.query(
    `
    SELECT
      COALESCE(SUM(CASE WHEN pp.payment_date::date = CURRENT_DATE THEN pp.amount END), 0) AS today_total,
      COALESCE(SUM(CASE WHEN pp.payment_date::date = CURRENT_DATE - INTERVAL '1 day' THEN pp.amount END), 0) AS yesterday_total,
      COALESCE(SUM(CASE WHEN date_trunc('week', pp.payment_date) = date_trunc('week', CURRENT_DATE) THEN pp.amount END), 0) AS week_total,
      COALESCE(SUM(CASE WHEN date_trunc('month', pp.payment_date) = date_trunc('month', CURRENT_DATE) THEN pp.amount END), 0) AS month_total,
      COALESCE(SUM(CASE WHEN date_trunc('year', pp.payment_date) = date_trunc('year', CURRENT_DATE) THEN pp.amount END), 0) AS year_total
    FROM steel_erp.personnel_payments pp JOIN steel_erp.personnel p ON p.id = pp.personnel_id ${where}`,
    values,
  );
  return res.rows[0];
};

export const getPersonnelPaymentSummaryService = async (client, query) => {
  const { where, values } = buildPaymentFilters(query);
  const res = await client.query(
    `
    SELECT p.id AS personnel_id, p.full_name, p.personnel_type, COALESCE(SUM(pp.amount), 0) AS total_paid
    FROM steel_erp.personnel p LEFT JOIN steel_erp.personnel_payments pp ON pp.personnel_id = p.id ${where} 
    GROUP BY p.id, p.full_name, p.personnel_type ORDER BY total_paid DESC`,
    values,
  );
  return res.rows;
};

export const generateStaffSalaryService = async (client, query) => {
  const { personnel_id, month, year, base_salary, shift_hours } = query;

  const localTodayStr = getLocalTodayString();
  const currentYear = parseInt(localTodayStr.split("-")[0]);
  const currentMonth = parseInt(localTodayStr.split("-")[1]);

  const monthStartStr = `${year}-${String(month).padStart(2, "0")}-01`;
  const monthEndStr = new Date(year, month, 0).toISOString().split("T")[0];

  const daysInTargetMonth = new Date(year, month, 0).getDate();

  let attendanceEndStr;
  if (Number(year) === currentYear && Number(month) === currentMonth) {
    attendanceEndStr = localTodayStr;
  } else {
    attendanceEndStr = monthEndStr;
  }

  const payQuery = `
    SELECT amount, reason FROM steel_erp.personnel_payments
    WHERE personnel_id = $1 AND payment_date::date <= $2::date AND COALESCE(is_reversed, false) = false
  `;

  const payRes = await client.query(payQuery, [personnel_id, monthEndStr]);

  let latestSettlementEnd = null;
  let total_paid_all_time = 0;
  let total_billed_all_time = 0;

  payRes.rows.forEach((pay) => {
    total_paid_all_time += Number(pay.amount);

    const billMatch = pay.reason.match(/\| BILL:([\d.]+)/);
    if (billMatch) total_billed_all_time += Number(billMatch[1]);

    const periodMatch = pay.reason.match(/\| PERIOD:([\d-]+),([\d-]+)/);
    if (periodMatch) {
      const pEnd = periodMatch[2];
      if (pEnd.startsWith(`${year}-${String(month).padStart(2, "0")}`)) {
        if (!latestSettlementEnd || pEnd > latestSettlementEnd) {
          latestSettlementEnd = pEnd;
        }
      }
    }
  });

  let periodStart = monthStartStr;
  let is_fully_generated = false;

  if (latestSettlementEnd) {
    const nextDay = new Date(latestSettlementEnd);
    nextDay.setDate(nextDay.getDate() + 1);
    const nextDayStr = nextDay.toISOString().split("T")[0];

    if (nextDayStr > attendanceEndStr) {
      is_fully_generated = true;
      periodStart = attendanceEndStr;
    } else {
      periodStart = nextDayStr;
    }
  }

  const attQuery = `
    SELECT 
      SUM(CASE WHEN status = 'PRESENT' THEN 1 ELSE 0 END) as present,
      SUM(CASE WHEN status = 'ABSENT' THEN 1 ELSE 0 END) as absent,
      SUM(CASE WHEN status = 'HALF_DAY' THEN 1 ELSE 0 END) as half_days,
      SUM(CASE WHEN status = 'HOLIDAY' THEN 1 ELSE 0 END) as holidays,
      SUM(CASE WHEN morning_ot_type = 'HALF_DAY_SHIFT' THEN morning_ot_value ELSE 0 END + CASE WHEN evening_ot_type = 'HALF_DAY_SHIFT' THEN evening_ot_value ELSE 0 END) as halfday_ots,
      SUM(CASE WHEN morning_ot_type = 'HOURLY' THEN morning_ot_value ELSE 0 END + CASE WHEN evening_ot_type = 'HOURLY' THEN evening_ot_value ELSE 0 END) as hourly_ots
    FROM steel_erp.vw_staff_attendance_daily
    WHERE personnel_id = $1 AND attendance_date BETWEEN $2 AND $3
  `;

  const attRes = await client.query(attQuery, [
    personnel_id,
    periodStart,
    attendanceEndStr,
  ]);
  const att = attRes.rows[0];

  const present = Number(att.present || 0);
  const holidays = Number(att.holidays || 0);
  const halfDays = Number(att.half_days || 0);
  const halfdayOts = Number(att.halfday_ots || 0);
  const hourlyOts = Number(att.hourly_ots || 0);
  const absent = Number(att.absent || 0);

  const dailyWage = base_salary / 30;
  const hourlyWage = dailyWage / shift_hours;

  const rawActualDays = present + holidays + halfDays * 0.5 + halfdayOts * 0.5;
  const scaledPayableDays = (rawActualDays / daysInTargetMonth) * 30;

  const grossSalary = is_fully_generated
    ? 0
    : scaledPayableDays * dailyWage + hourlyOts * hourlyWage;

  const previous_balance = total_billed_all_time - total_paid_all_time;
  let advances_available = 0;
  let previous_pending = 0;

  if (previous_balance > 0) previous_pending = previous_balance;
  else advances_available = Math.abs(previous_balance);

  const net_payable = grossSalary + previous_pending - advances_available;

  return {
    personnel_id,
    period: {
      month,
      year,
      start_date: periodStart,
      end_date: attendanceEndStr,
    },
    meta: { is_fully_generated, previous_settlement_end: latestSettlementEnd },
    wage_rates: {
      base_salary: Number(base_salary),
      shift_hours: Number(shift_hours),
      daily_wage: Number(dailyWage.toFixed(2)),
      hourly_wage: Number(hourlyWage.toFixed(2)),
    },
    attendance_summary: {
      present: is_fully_generated ? 0 : present,
      holidays: is_fully_generated ? 0 : holidays,
      half_days: is_fully_generated ? 0 : halfDays,
      absent: is_fully_generated ? 0 : absent,
      halfday_ots: is_fully_generated ? 0 : halfdayOts,
      hourly_ots: is_fully_generated ? 0 : hourlyOts,
      actual_raw_days: is_fully_generated ? 0 : rawActualDays,
      total_payable_days: is_fully_generated
        ? 0
        : Number(scaledPayableDays.toFixed(2)),
    },
    financials: {
      gross_salary: Number(grossSalary.toFixed(2)),
      advances_available: Number(advances_available.toFixed(2)),
      previous_pending: Number(previous_pending.toFixed(2)),
      raw_net_balance: Number(net_payable.toFixed(2)),
      net_payable: Number(Math.max(0, net_payable).toFixed(2)),
    },
  };
};

export const generateContractorPayoutService = async (client, query) => {
  const {
    personnel_id,
    month,
    year,
    rates: ratesStr,
    selected_items: selectedStr,
  } = query;

  const rates = JSON.parse(ratesStr || "{}");
  const selectedItemIds = selectedStr
    ? JSON.parse(selectedStr).map(String)
    : null;

  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDate = new Date(year, month, 0).toISOString().split("T")[0];
  const currentPeriodStr = `${year}-${String(month).padStart(2, "0")}`;

  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const shortMonth = monthNames[Number(month) - 1];

  const returnsQuery = `
    SELECT 
      CASE 
        WHEN sl.item_kind = 'FINISHED' THEN 'FIN-' || sl.product_id::text
        WHEN sl.item_kind = 'SCRAP' THEN 'SCR-' || sl.scrap_type_id::text
        ELSE 'WIP-' || COALESCE(sl.semi_finished_id, cj.semi_finished_id)::text 
      END as item_id,
            
      MAX(CASE 
        WHEN sl.item_kind = 'FINISHED' THEN p.product_name
        WHEN sl.item_kind = 'SCRAP' THEN st.scrap_name
        ELSE sfi.item_name 
      END) as item_name,
                
      MAX(CASE 
        WHEN sl.item_kind = 'FINISHED' THEN 'FINISHED'
        WHEN sl.item_kind = 'SCRAP' THEN 'SCRAP'
        ELSE 'WIP' 
      END) as item_type,
                
      SUM(sl.quantity_in) as total_qty,
      MAX(sl.uom) as uom
      
    FROM steel_erp.stock_ledger sl
    JOIN steel_erp.contractor_jobs cj ON sl.reference_id = cj.id 
    
    LEFT JOIN steel_erp.semi_finished_items sfi ON COALESCE(sl.semi_finished_id, cj.semi_finished_id) = sfi.id
    LEFT JOIN steel_erp.products p ON sl.product_id = p.id
    LEFT JOIN steel_erp.scrap_types st ON sl.scrap_type_id = st.id
    
    WHERE sl.movement_type = 'CONTRACTOR_RETURN' 
      AND sl.reference_module = 'CONTRACTOR'
      AND COALESCE(sl.is_reversal, false) = false
      AND cj.contractor_id = $1 
      AND sl.movement_date BETWEEN $2 AND $3
      
    GROUP BY 
      CASE 
        WHEN sl.item_kind = 'FINISHED' THEN 'FIN-' || sl.product_id::text
        WHEN sl.item_kind = 'SCRAP' THEN 'SCR-' || sl.scrap_type_id::text
        ELSE 'WIP-' || COALESCE(sl.semi_finished_id, cj.semi_finished_id)::text 
      END
    HAVING SUM(sl.quantity_in) > 0
  `;

  const payQuery = `
    SELECT amount, reason FROM steel_erp.personnel_payments
    WHERE personnel_id = $1 AND payment_date::date <= $2::date AND COALESCE(is_reversed, false) = false
  `;

  const [retRes, payRes] = await Promise.all([
    client.query(returnsQuery, [personnel_id, startDate, endDate]),
    client.query(payQuery, [personnel_id, endDate]),
  ]);

  const previouslySettledIds = new Set();
  let total_paid_all_time = 0;
  let total_billed_all_time = 0;

  payRes.rows.forEach((pay) => {
    total_paid_all_time += Number(pay.amount);

    const reasonStr = pay.reason || "";

    const billMatch = reasonStr.match(/\| BILL:([\d.]+)/);
    if (billMatch) total_billed_all_time += Number(billMatch[1]);

    const isTargetMonth =
      reasonStr.includes(currentPeriodStr) ||
      reasonStr.includes(shortMonth) ||
      reasonStr.includes(`PERIOD:${year}`);

    if (isTargetMonth) {
      const settledMatch = reasonStr.match(/\| SETTLED:\[(.*?)\]/);
      if (settledMatch) {
        settledMatch[1].split(",").forEach((id) => {
          if (id.trim()) previouslySettledIds.add(id.trim());
        });
      }
    }
  });

  let current_slip_gross = 0;
  const unpaid_items = [];
  const paid_items = [];

  for (const r of retRes.rows) {
    const strId = String(r.item_id);
    const itemName = String(r.item_name);

    let isPaid = false;
    for (const settled of previouslySettledIds) {
      const cleanSettled = settled
        .replace(/\(.*?\)/g, "")
        .trim()
        .toLowerCase();
      const cleanName = itemName.trim().toLowerCase();

      if (
        settled === strId ||
        settled === strId.replace("WIP-", "") ||
        cleanSettled === cleanName
      ) {
        isPaid = true;
        break;
      }
    }

    const qty = Number(r.total_qty);

    if (isPaid) {
      paid_items.push({
        item_id: r.item_id,
        item_name: r.item_name,
        item_type: r.item_type,
        quantity: qty,
        uom: r.uom,
        is_paid: true,
      });
      continue;
    }

    if (selectedItemIds !== null && !selectedItemIds.includes(strId)) continue;

    const rate = Number(rates[r.item_id] || 0);
    const total = qty * rate;
    current_slip_gross += total;

    unpaid_items.push({
      item_id: r.item_id,
      item_name: r.item_name,
      item_type: r.item_type,
      quantity: qty,
      uom: r.uom,
      rate: rate,
      total: total,
      is_paid: false,
    });
  }

  const previous_balance = total_billed_all_time - total_paid_all_time;
  let advances_available = 0;
  let previous_pending = 0;

  if (previous_balance > 0) previous_pending = previous_balance;
  else advances_available = Math.abs(previous_balance);

  const net_payable =
    current_slip_gross + previous_pending - advances_available;

  return {
    personnel_id,
    period: { month, year, start_date: startDate, end_date: endDate },
    unpaid_items,
    paid_items,
    financials: {
      current_slip_gross: Number(current_slip_gross.toFixed(2)),
      advances_available: Number(advances_available.toFixed(2)),
      previous_pending: Number(previous_pending.toFixed(2)),
      raw_net_balance: Number(net_payable.toFixed(2)),
      net_payable: Number(Math.max(0, net_payable).toFixed(2)),
    },
  };
};
