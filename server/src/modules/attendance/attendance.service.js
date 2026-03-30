import { ApiError } from "../../utils/ApiError.js";

const setAuditContext = async (client, userId) => {
  if (userId)
    await client.query(`SELECT set_config('app.user_id', $1::text, true)`, [
      userId,
    ]);
};

export const markAttendanceService = async (client, data, userId) => {
  await setAuditContext(client, userId);
  const { attendance_date, records } = data;

  const insertQuery = `
    INSERT INTO steel_erp.staff_attendance 
      (attendance_date, personnel_id, status, morning_ot_type, morning_ot_value, evening_ot_type, evening_ot_value, remarks, created_by)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    ON CONFLICT (personnel_id, attendance_date) 
    DO UPDATE SET 
      status = EXCLUDED.status,
      morning_ot_type = EXCLUDED.morning_ot_type,
      morning_ot_value = EXCLUDED.morning_ot_value,
      evening_ot_type = EXCLUDED.evening_ot_type,
      evening_ot_value = EXCLUDED.evening_ot_value,
      remarks = EXCLUDED.remarks,
      created_by = EXCLUDED.created_by,
      updated_at = now()
    RETURNING id;
  `;

  const results = [];
  for (const record of records) {
    const {
      personnel_id,
      status,
      morning_ot_type = "NONE",
      morning_ot_value = 0,
      evening_ot_type = "NONE",
      evening_ot_value = 0,
      remarks = null,
    } = record;
    try {
      const { rows } = await client.query(insertQuery, [
        attendance_date,
        personnel_id,
        status,
        morning_ot_type,
        morning_ot_value,
        evening_ot_type,
        evening_ot_value,
        remarks,
        userId,
      ]);
      results.push(rows[0].id);
    } catch (error) {
      if (error.message.includes("not STAFF")) {
        throw new ApiError(
          400,
          `Personnel ID ${personnel_id} is a Contractor. You can only mark attendance for internal STAFF.`,
        );
      }
      throw error;
    }
  }

  return { message: "Attendance saved successfully", count: results.length };
};

export const getAttendanceService = async (client, query) => {
  const {
    page = 1,
    limit = 50,
    date_filter,
    startDate,
    endDate,
    personnel_id,
  } = query;
  const offset = (page - 1) * limit;

  let conditions = ["1=1"];
  let values = [];

  if (personnel_id) {
    values.push(personnel_id);
    conditions.push(`personnel_id = $${values.length}`);
  }

  if (date_filter) {
    switch (date_filter) {
      case "TODAY":
        conditions.push(`attendance_date = CURRENT_DATE`);
        break;
      case "YESTERDAY":
        conditions.push(`attendance_date = CURRENT_DATE - INTERVAL '1 day'`);
        break;
      case "WEEK":
        conditions.push(
          `date_trunc('week', attendance_date) = date_trunc('week', CURRENT_DATE)`,
        );
        break;
      case "MONTH":
        conditions.push(
          `date_trunc('month', attendance_date) = date_trunc('month', CURRENT_DATE)`,
        );
        break;
      case "CUSTOM":
        if (startDate && endDate) {
          values.push(startDate, endDate);
          conditions.push(
            `attendance_date BETWEEN $${values.length - 1} AND $${values.length}`,
          );
        }
        break;
    }
  }

  const sql = `
    SELECT * FROM steel_erp.vw_staff_attendance_daily
    WHERE ${conditions.join(" AND ")}
    ORDER BY attendance_date DESC, staff_name ASC
    LIMIT $${values.length + 1} OFFSET $${values.length + 2}
  `;

  const countSql = `SELECT count(*)::int as total FROM steel_erp.vw_staff_attendance_daily WHERE ${conditions.join(" AND ")}`;

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
      total_pages: Math.ceil(countRes.rows[0].total / limit),
    },
  };
};

export const getAttendanceSummaryService = async (client, query) => {
  const { startDate, endDate, personnel_id, date_filter } = query;

  let conditions = ["1=1"];
  let values = [];

  if (personnel_id) {
    values.push(personnel_id);
    conditions.push(`personnel_id = $${values.length}`);
  }

  if (date_filter) {
    switch (date_filter) {
      case "TODAY":
        conditions.push(`attendance_date = CURRENT_DATE`);
        break;
      case "YESTERDAY":
        conditions.push(`attendance_date = CURRENT_DATE - INTERVAL '1 day'`);
        break;
      case "WEEK":
        conditions.push(
          `date_trunc('week', attendance_date) = date_trunc('week', CURRENT_DATE)`,
        );
        break;
      case "MONTH":
        conditions.push(
          `date_trunc('month', attendance_date) = date_trunc('month', CURRENT_DATE)`,
        );
        break;
      case "CUSTOM":
        if (startDate && endDate) {
          values.push(startDate, endDate);
          conditions.push(
            `attendance_date BETWEEN $${values.length - 1} AND $${values.length}`,
          );
        }
        break;
    }
  } else if (startDate && endDate) {
    values.push(startDate, endDate);
    conditions.push(
      `attendance_date BETWEEN $${values.length - 1} AND $${values.length}`,
    );
  }

  const sql = `
    SELECT 
      personnel_id,
      staff_name,
      COUNT(*) as total_days_logged,
      SUM(CASE WHEN status = 'PRESENT' THEN 1 WHEN status = 'HALF_DAY' THEN 0.5 ELSE 0 END) as total_days_present,
      SUM(CASE WHEN status = 'ABSENT' THEN 1 ELSE 0 END) as total_absent,
      SUM(CASE WHEN status = 'HALF_DAY' THEN 1 ELSE 0 END) as total_half_days,
      SUM(CASE WHEN status = 'HOLIDAY' THEN 1 ELSE 0 END) as total_holidays,
      
      -- Calculate Total OT Shifts
      SUM(
        CASE WHEN morning_ot_type = 'HALF_DAY_SHIFT' THEN morning_ot_value ELSE 0 END +
        CASE WHEN evening_ot_type = 'HALF_DAY_SHIFT' THEN evening_ot_value ELSE 0 END
      ) as total_ot_shifts,
      
      -- Calculate Total OT Hours
      SUM(
        CASE WHEN morning_ot_type = 'HOURLY' THEN morning_ot_value ELSE 0 END +
        CASE WHEN evening_ot_type = 'HOURLY' THEN evening_ot_value ELSE 0 END
      ) as total_ot_hours

    FROM steel_erp.vw_staff_attendance_daily
    WHERE ${conditions.join(" AND ")}
    GROUP BY personnel_id, staff_name 
    ORDER BY staff_name ASC
  `;

  const { rows } = await client.query(sql, values);
  return rows;
};

export const updateAttendanceService = async (client, id, data, userId) => {
  await setAuditContext(client, userId);

  const { rows } = await client.query(
    `UPDATE steel_erp.staff_attendance
     SET status = COALESCE($1, status),
         morning_ot_type = COALESCE($2, morning_ot_type),
         morning_ot_value = COALESCE($3, morning_ot_value),
         evening_ot_type = COALESCE($4, evening_ot_type),
         evening_ot_value = COALESCE($5, evening_ot_value),
         remarks = COALESCE($6, remarks),
         updated_at = now()
     WHERE id = $7 RETURNING *`,
    [
      data.status,
      data.morning_ot_type,
      data.morning_ot_value,
      data.evening_ot_type,
      data.evening_ot_value,
      data.remarks,
      id,
    ],
  );

  if (!rows.length) throw new ApiError(404, "Attendance record not found");
  return rows[0];
};

export const deleteAttendanceService = async (client, id, userId) => {
  await setAuditContext(client, userId);
  const { rowCount } = await client.query(
    `DELETE FROM steel_erp.staff_attendance WHERE id = $1`,
    [id],
  );
  if (rowCount === 0) throw new ApiError(404, "Attendance record not found");
  return { message: "Attendance record removed securely." };
};
