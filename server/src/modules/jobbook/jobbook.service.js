import { ApiError } from "../../utils/ApiError.js";

export const getLiveJobBookService = async (client, filters) => {
  const { target_date } = filters;

  // Run queries sequentially inside the transaction
  const machineFloorData = await getMachineFloorStatus(client, filters);
  const contractorOutData = await getExternalContractorStatus(
    client,
    target_date,
  );
  const factoryLogData = await getTodayFactoryLog(client, target_date);
  const liveStockSnapshot = await getLiveStockSnapshot(client);

  return {
    timestamp: new Date().toISOString(),
    filters_applied: filters,
    machine_floor: machineFloorData,
    contractor_dispatch: contractorOutData,
    factory_log: factoryLogData,
    live_inventory: liveStockSnapshot,
  };
};

const getMachineFloorStatus = async (client, filters) => {
  const {
    target_date,
    search,
    machine_id,
    party_id,
    personnel_id,
    view_mode,
    stuck_threshold_mins,
  } = filters;

  const values = [target_date, stuck_threshold_mins, personnel_id || -1];
  let conditions = ["m.is_active = true"];

  if (machine_id) {
    values.push(machine_id);
    conditions.push(`m.id = $${values.length}`);
  }
  if (party_id) {
    values.push(party_id);
    conditions.push(`po.party_id = $${values.length}`);
  }
  if (search) {
    values.push(`%${search}%`);
    conditions.push(
      `(po.batch_no ILIKE $${values.length} OR pty.party_name ILIKE $${values.length})`,
    );
  }

  const sql = `
    WITH OperatorData AS (
      SELECT 
        psw.production_step_id,
        jsonb_agg(jsonb_build_object('id', per.id, 'name', per.full_name, 'type', per.personnel_type)) as operators,
        bool_or(per.id = $3) as has_target_personnel
      FROM steel_erp.production_step_workers psw
      JOIN steel_erp.personnel per ON per.id = psw.personnel_id
      GROUP BY psw.production_step_id
    )
    SELECT 
      m.id AS machine_id, 
      m.machine_name, 
      m.status AS hardware_status,
      ps.id AS step_id, ps.step_no, ps.step_name, ps.status AS execution_status,
      ps.input_qty, ps.input_uom,
      po.id AS order_id, po.batch_no, po.business_model, pty.party_name,
      
      -- Details of what is going IN
      COALESCE(rm.material_name, sfi_in.item_name) AS input_item,
      
      -- Details of what is expected OUT
      (SELECT string_agg(COALESCE(pr_out.product_name, sfi_out.item_name), ', ') 
       FROM steel_erp.production_step_outputs pso 
       LEFT JOIN steel_erp.products pr_out ON pso.product_id = pr_out.id 
       LEFT JOIN steel_erp.semi_finished_items sfi_out ON pso.semi_finished_id = sfi_out.id 
       WHERE pso.production_step_id = ps.id) AS target_output_items,

      COALESCE(od.operators, '[]'::jsonb) AS active_team,
      ps.started_at, ps.updated_at,
      
      -- Calculate Time
      CASE 
        WHEN ps.status IN ('IN_PROGRESS', 'PLANNED') THEN GREATEST(0, EXTRACT(EPOCH FROM (now() - COALESCE(ps.updated_at, ps.started_at, ps.created_at))) / 60)
        ELSE 0 
      END AS minutes_since_last_update,
      
      -- Detect Stuck
      CASE 
        WHEN ps.status = 'IN_PROGRESS' AND (EXTRACT(EPOCH FROM (now() - COALESCE(ps.updated_at, ps.started_at))) / 60) > $2 THEN true 
        ELSE false 
      END AS is_stuck,

      -- 🌟 PRO FIX: Live consumption AND live yield/scrap tracked perfectly
      COALESCE((SELECT SUM(quantity_out) FROM steel_erp.stock_ledger WHERE reference_module = 'PRODUCTION' AND reference_line_id = ps.id AND movement_type = 'PRODUCTION_CONSUME'), 0) AS consumed_so_far,
      COALESCE((SELECT SUM(quantity_in) FROM steel_erp.stock_ledger WHERE reference_module = 'PRODUCTION' AND reference_line_id = ps.id AND movement_type = 'PRODUCTION_OUTPUT'), 0) AS yielded_so_far,
      COALESCE((SELECT SUM(quantity_in) FROM steel_erp.stock_ledger WHERE reference_module = 'PRODUCTION' AND reference_line_id = ps.id AND movement_type = 'PRODUCTION_SCRAP'), 0) AS scrap_generated

    FROM steel_erp.machines m
    LEFT JOIN steel_erp.production_steps ps ON ps.machine_id = m.id AND ps.status IN ('PLANNED', 'IN_PROGRESS') AND ps.created_at::date <= $1::date
    LEFT JOIN steel_erp.production_orders po ON po.id = ps.production_order_id AND po.status IN ('DRAFT', 'IN_PROGRESS')
    LEFT JOIN steel_erp.parties pty ON pty.id = po.party_id
    LEFT JOIN steel_erp.raw_materials rm ON rm.id = ps.input_raw_material_id
    LEFT JOIN steel_erp.semi_finished_items sfi_in ON sfi_in.id = ps.input_semi_finished_id
    LEFT JOIN OperatorData od ON od.production_step_id = ps.id

    WHERE ${conditions.join(" AND ")}
    ${personnel_id ? `AND od.has_target_personnel = true` : ""}
    ORDER BY is_stuck DESC, m.machine_name ASC
  `;

  const res = await client.query(sql, values);
  let rows = res.rows;

  if (view_mode === "STUCK_ONLY") rows = rows.filter((r) => r.is_stuck);
  if (view_mode === "ACTIVE_ONLY")
    rows = rows.filter((r) => r.step_id !== null);

  return rows;
};

const getExternalContractorStatus = async (client, target_date) => {
  // 🌟 PRO FIX: Separate Physical Return from Process Loss to match contractor.service.js perfectly
  const sql = `
    SELECT 
      cj.id, cj.job_no, po.batch_no, per.full_name AS contractor_name, pr.product_name,
      cj.qty_sent, cj.uom, cj.out_date, cj.ownership_type, pty.party_name AS owner_party,
      CURRENT_DATE - cj.out_date AS days_pending,
      COALESCE((SELECT sum(quantity) FROM steel_erp.contractor_job_returns WHERE contractor_job_id = cj.id AND COALESCE(remarks, '') != 'Process Loss'), 0) AS physical_returned,
      COALESCE((SELECT sum(quantity) FROM steel_erp.contractor_job_returns WHERE contractor_job_id = cj.id AND COALESCE(remarks, '') = 'Process Loss'), 0) AS process_loss,
      GREATEST(0, (cj.qty_sent - COALESCE((SELECT SUM(quantity) FROM steel_erp.contractor_job_returns WHERE contractor_job_id = cj.id), 0))) AS pending_qty
    FROM steel_erp.contractor_jobs cj
    JOIN steel_erp.personnel per ON per.id = cj.contractor_id
    LEFT JOIN steel_erp.products pr ON pr.id = cj.product_id
    LEFT JOIN steel_erp.production_orders po ON po.id = cj.production_order_id
    LEFT JOIN steel_erp.parties pty ON pty.id = cj.owner_party_id
    WHERE cj.status = 'OPEN' AND cj.out_date <= $1
    ORDER BY days_pending DESC
  `;
  const res = await client.query(sql, [target_date]);
  return res.rows;
};

const getTodayFactoryLog = async (client, target_date) => {
  // 🌟 PRO FIX: Now includes CONTRACTOR OUT and RETURN to capture the ENTIRE floor's activity, joined safely.
  const sql = `
    SELECT 
      sl.id AS log_id,
      sl.movement_ts,
      sl.movement_type,
      sl.item_kind,
      COALESCE(rm.material_name, sfi.item_name, pr.product_name, sc.scrap_name) AS item_name,
      sl.quantity_in,
      sl.quantity_out,
      sl.uom,
      COALESCE(po.batch_no, cj.job_no) AS reference_no,
      ps.step_name,
      m.machine_name,
      COALESCE(
        (SELECT string_agg(per.full_name, ', ') 
         FROM steel_erp.production_step_workers psw 
         JOIN steel_erp.personnel per ON per.id = psw.personnel_id 
         WHERE psw.production_step_id = ps.id),
        c_per.full_name
      ) AS actors,
      u.full_name AS system_logger
    FROM steel_erp.stock_ledger sl
    LEFT JOIN steel_erp.production_steps ps ON sl.reference_module = 'PRODUCTION' AND sl.reference_line_id = ps.id
    LEFT JOIN steel_erp.production_orders po ON ps.production_order_id = po.id
    LEFT JOIN steel_erp.machines m ON ps.machine_id = m.id
    LEFT JOIN steel_erp.contractor_jobs cj ON sl.reference_module = 'CONTRACTOR' AND sl.reference_id = cj.id
    LEFT JOIN steel_erp.personnel c_per ON cj.contractor_id = c_per.id
    LEFT JOIN steel_erp.raw_materials rm ON sl.raw_material_id = rm.id
    LEFT JOIN steel_erp.semi_finished_items sfi ON sl.semi_finished_id = sfi.id
    LEFT JOIN steel_erp.products pr ON sl.product_id = pr.id
    LEFT JOIN steel_erp.scrap_types sc ON sl.scrap_type_id = sc.id
    LEFT JOIN steel_erp.users u ON sl.created_by = u.id
    WHERE sl.movement_date = $1 
      AND sl.is_reversal = false
      AND sl.movement_type IN ('PRODUCTION_CONSUME', 'PRODUCTION_OUTPUT', 'PRODUCTION_SCRAP', 'CONTRACTOR_OUT', 'CONTRACTOR_RETURN')
    ORDER BY sl.movement_ts DESC
  `;

  const res = await client.query(sql, [target_date]);
  return res.rows;
};

const getLiveStockSnapshot = async (client) => {
  const sql = `
    SELECT 
      COALESCE(sum(quantity_in - quantity_out) FILTER (WHERE item_kind = 'RAW'), 0) as raw_stock,
      COALESCE(sum(quantity_in - quantity_out) FILTER (WHERE item_kind = 'SEMI_FINISHED'), 0) as semi_finished_stock,
      COALESCE(sum(quantity_in - quantity_out) FILTER (WHERE item_kind = 'FINISHED'), 0) as finished_stock,
      COALESCE(sum(quantity_in - quantity_out) FILTER (WHERE item_kind = 'SCRAP'), 0) as scrap_stock
    FROM steel_erp.stock_ledger
  `;
  const res = await client.query(sql);
  return res.rows[0];
};
