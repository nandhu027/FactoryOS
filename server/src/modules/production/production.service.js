import { ApiError } from "../../utils/ApiError.js";

const setAuditContext = async (client, userId) => {
  if (userId)
    await client.query(`SELECT set_config('app.user_id', $1::text, true)`, [
      userId,
    ]);
};

const getIsolatedProxyProduct = async (client, semiFinishedId, uom) => {
  if (!semiFinishedId) return null;
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

const drainProductionStockBuckets = async (
  client,
  ownership_type,
  ownerParty,
  semi_finished_id,
  qty_to_consume,
  uom,
  orderId,
  stepId,
  userId,
) => {
  let remainingQty = Number(qty_to_consume);
  const bucketsRes = await client.query(
    `SELECT product_id, SUM(quantity_in - quantity_out) as balance,
            CASE WHEN reference_module = 'PRODUCTION' AND reference_id = $5 THEN 1 ELSE 2 END as priority
     FROM steel_erp.stock_ledger 
     WHERE item_kind = 'SEMI_FINISHED' 
       AND semi_finished_id = $1 
       AND ownership_type = $2 
       AND owner_party_id IS NOT DISTINCT FROM $3
       AND uom = $4
     GROUP BY product_id, priority
     HAVING SUM(quantity_in - quantity_out) > 0
     ORDER BY priority ASC, balance DESC`,
    [semi_finished_id, ownership_type, ownerParty, uom, orderId],
  );

  for (const bucket of bucketsRes.rows) {
    if (remainingQty <= 0) break;
    const bucketBalance = Number(bucket.balance);
    const deductQty = Math.min(bucketBalance, remainingQty);

    await client.query(
      `INSERT INTO steel_erp.stock_ledger 
        (movement_date, movement_type, ownership_type, owner_party_id, item_kind, semi_finished_id, product_id, quantity_out, quantity_in, uom, reference_module, reference_id, reference_line_id, created_by)
       VALUES (CURRENT_DATE, 'PRODUCTION_CONSUME', $1, $2, 'SEMI_FINISHED', $3, $4, $5, 0, $6, 'PRODUCTION', $7, $8, $9)`,
      [
        ownership_type,
        ownerParty,
        semi_finished_id,
        bucket.product_id,
        deductQty,
        uom,
        orderId,
        stepId,
        userId,
      ],
    );
    remainingQty -= deductQty;
  }

  if (remainingQty > 0.005) {
    throw new ApiError(
      400,
      `Insufficient WIP stock. Cannot consume ${qty_to_consume} ${uom}. Missing ${remainingQty.toFixed(2)} ${uom}. Verify upstream yield or contractor returns.`,
    );
  }
};

export const getProductionService = async (client, queryParams) => {
  const {
    page = 1,
    limit = 50,
    search,
    status,
    business_model,
    party_id,
    date_filter,
    custom_start,
    custom_end,
  } = queryParams || {};
  const offset = (page - 1) * limit;
  const values = [];
  let conditions = ["1=1"];

  if (status) {
    values.push(status);
    conditions.push(
      `po.status = $${values.length}::steel_erp.production_status_enum`,
    );
  }
  if (business_model) {
    values.push(business_model);
    conditions.push(
      `po.business_model = $${values.length}::steel_erp.business_model_enum`,
    );
  }
  if (party_id) {
    values.push(party_id);
    conditions.push(`po.party_id = $${values.length}`);
  }

  if (date_filter) {
    switch (date_filter) {
      case "TODAY":
        conditions.push(`po.production_date = CURRENT_DATE`);
        break;
      case "YESTERDAY":
        conditions.push(`po.production_date = CURRENT_DATE - INTERVAL '1 day'`);
        break;
      case "WEEK":
        conditions.push(
          `date_trunc('week', po.production_date) = date_trunc('week', CURRENT_DATE)`,
        );
        break;
      case "MONTH":
        conditions.push(
          `date_trunc('month', po.production_date) = date_trunc('month', CURRENT_DATE)`,
        );
        break;
      case "CUSTOM":
        values.push(custom_start, custom_end);
        conditions.push(
          `po.production_date BETWEEN $${values.length - 1} AND $${values.length}`,
        );
        break;
    }
  }

  if (search) {
    values.push(`%${search}%`);
    conditions.push(
      `(po.batch_no ILIKE $${values.length} OR p.party_name ILIKE $${values.length})`,
    );
  }

  const whereString = conditions.join(" AND ");

  const res = await client.query(
    `SELECT po.id, po.batch_no, po.production_date, po.business_model, po.status, po.remarks, p.id as party_id, p.party_name,
      (SELECT count(*) FROM steel_erp.production_steps ps WHERE ps.production_order_id = po.id) as total_steps,
      (SELECT count(*) FROM steel_erp.production_steps ps WHERE ps.production_order_id = po.id AND ps.status = 'COMPLETED') as completed_steps
    FROM steel_erp.production_orders po
    LEFT JOIN steel_erp.parties p ON p.id = po.party_id
    WHERE ${whereString} ORDER BY po.production_date DESC, po.id DESC
    LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
    [...values, limit, offset],
  );

  const countRes = await client.query(
    `SELECT count(po.id)::int as total FROM steel_erp.production_orders po LEFT JOIN steel_erp.parties p ON p.id = po.party_id WHERE ${whereString}`,
    values,
  );
  return {
    data: res.rows,
    meta: {
      total: countRes.rows[0].total,
      page,
      limit,
      total_pages: Math.ceil(countRes.rows[0].total / limit),
    },
  };
};

export const getProductionByIdService = async (client, id) => {
  const res = await client.query(
    `WITH WorkerData AS (
      SELECT psw.production_step_id, jsonb_agg(jsonb_build_object('id', per.id, 'full_name', per.full_name, 'type', per.personnel_type)) as workers
      FROM steel_erp.production_step_workers psw JOIN steel_erp.personnel per ON per.id = psw.personnel_id GROUP BY psw.production_step_id
    ),
    InputData AS (
      SELECT psi.production_step_id, jsonb_agg(jsonb_build_object(
        'id', psi.id, 'input_item_kind', psi.input_item_kind, 'raw_material_id', psi.raw_material_id, 'semi_finished_id', psi.semi_finished_id, 
        'item_name', COALESCE(rm.material_name, sfi.item_name), 'planned_qty', psi.quantity, 'uom', psi.uom,
        'consumed_qty', COALESCE((
           SELECT SUM(sl.quantity_out)
           FROM steel_erp.stock_ledger sl
           WHERE sl.reference_module = 'PRODUCTION'
             AND sl.reference_id = $1
             AND sl.reference_line_id = psi.production_step_id
             AND sl.movement_type = 'PRODUCTION_CONSUME'
             AND (
               (psi.input_item_kind = 'RAW' AND sl.raw_material_id = psi.raw_material_id) OR
               (psi.input_item_kind = 'SEMI_FINISHED' AND sl.semi_finished_id = psi.semi_finished_id)
             )
        ), 0)
      )) as inputs
      FROM steel_erp.production_step_inputs psi
      LEFT JOIN steel_erp.raw_materials rm ON rm.id = psi.raw_material_id
      LEFT JOIN steel_erp.semi_finished_items sfi ON sfi.id = psi.semi_finished_id
      GROUP BY psi.production_step_id
    ),
    OutputData AS (
      SELECT pso.production_step_id, jsonb_agg(jsonb_build_object(
        'id', pso.id, 'output_item_kind', pso.output_item_kind, 'product_id', pso.product_id, 'semi_finished_id', pso.semi_finished_id, 
        'product_name', pr.product_name, 'semi_finished_name', sfi.item_name, 'quantity', pso.quantity, 'uom', pso.uom,
        'produced_qty', COALESCE((
           SELECT SUM(sl.quantity_in)
           FROM steel_erp.stock_ledger sl
           WHERE sl.reference_module = 'PRODUCTION'
             AND sl.reference_id = $1
             AND sl.reference_line_id = pso.production_step_id
             AND sl.movement_type = 'PRODUCTION_OUTPUT'
             AND (
               (pso.output_item_kind = 'FINISHED' AND sl.product_id = pso.product_id) OR
               (pso.output_item_kind = 'SEMI_FINISHED' AND sl.semi_finished_id = pso.semi_finished_id)
             )
        ), 0)
      )) as outputs
      FROM steel_erp.production_step_outputs pso 
      LEFT JOIN steel_erp.products pr ON pr.id = pso.product_id 
      LEFT JOIN steel_erp.semi_finished_items sfi ON sfi.id = pso.semi_finished_id 
      GROUP BY pso.production_step_id
    ),
    ContractorData AS (
      SELECT cj.source_step_id,
        jsonb_agg(jsonb_build_object(
          'job_no', cj.job_no, 'status', cj.status, 'qty_sent', cj.qty_sent,
          'returned_qty', COALESCE((SELECT sum(quantity) FROM steel_erp.contractor_job_returns WHERE contractor_job_id = cj.id), 0)
        )) as contractor_jobs,
        SUM(cj.qty_sent) as total_sent,
        SUM(COALESCE((SELECT sum(quantity) FROM steel_erp.contractor_job_returns cr WHERE cr.contractor_job_id = cj.id), 0)) as total_returned,
        SUM(COALESCE((SELECT sum(quantity) FROM steel_erp.contractor_job_returns cr WHERE cr.contractor_job_id = cj.id AND COALESCE(cr.remarks, '') != 'Process Loss'), 0)) as physical_returned,
        SUM(COALESCE((SELECT sum(quantity) FROM steel_erp.contractor_job_returns cr WHERE cr.contractor_job_id = cj.id AND COALESCE(cr.remarks, '') = 'Process Loss'), 0)) as loss_returned
      FROM steel_erp.contractor_jobs cj
      GROUP BY cj.source_step_id
    ),
    StepData AS (
      SELECT ps.production_order_id,
        jsonb_agg(jsonb_build_object(
          'id', ps.id, 'step_no', ps.step_no, 'step_name', ps.step_name, 'status', ps.status, 'machine_id', ps.machine_id, 'machine_name', m.machine_name,
          'worker_mode', ps.worker_mode,
          'consumed_so_far', CASE 
             WHEN ps.worker_mode = 'CONTRACTOR' THEN COALESCE(cd.total_sent, 0)
             ELSE COALESCE((SELECT SUM(quantity_out) FROM steel_erp.stock_ledger WHERE reference_module = 'PRODUCTION' AND reference_id = po.id AND reference_line_id = ps.id AND movement_type = 'PRODUCTION_CONSUME'), 0)
          END,
          'yielded_so_far', CASE 
             WHEN ps.worker_mode = 'CONTRACTOR' THEN COALESCE(cd.physical_returned, 0)
             ELSE COALESCE((SELECT SUM(quantity_in) FROM steel_erp.stock_ledger WHERE reference_module = 'PRODUCTION' AND reference_id = po.id AND reference_line_id = ps.id AND movement_type = 'PRODUCTION_OUTPUT'), 0)
          END,
          'started_at', ps.started_at, 'completed_at', ps.completed_at, 'scrap_qty', ps.scrap_qty, 'is_final_step', ps.is_final_step, 
          'workers', COALESCE(wd.workers, '[]'::jsonb), 
          'inputs', COALESCE(ind.inputs, '[]'::jsonb),
          'outputs', COALESCE(od.outputs, '[]'::jsonb),
          'contractor_jobs', COALESCE(cd.contractor_jobs, '[]'::jsonb),
          'contractor_total_sent', COALESCE(cd.total_sent, 0),
          'contractor_total_returned', COALESCE(cd.total_returned, 0),
          'contractor_physical_returned', COALESCE(cd.physical_returned, 0),
          'contractor_loss_returned', COALESCE(cd.loss_returned, 0)
        ) ORDER BY ps.step_no ASC) as steps
      FROM steel_erp.production_steps ps
      JOIN steel_erp.production_orders po ON po.id = ps.production_order_id
      JOIN steel_erp.machines m ON m.id = ps.machine_id
      LEFT JOIN WorkerData wd ON wd.production_step_id = ps.id
      LEFT JOIN InputData ind ON ind.production_step_id = ps.id
      LEFT JOIN OutputData od ON od.production_step_id = ps.id
      LEFT JOIN ContractorData cd ON cd.source_step_id = ps.id
      WHERE ps.production_order_id = $1 GROUP BY ps.production_order_id
    )
    SELECT po.*, p.party_name, COALESCE(sd.steps, '[]'::jsonb) as steps
    FROM steel_erp.production_orders po
    LEFT JOIN steel_erp.parties p ON p.id = po.party_id LEFT JOIN StepData sd ON sd.production_order_id = po.id WHERE po.id = $1`,
    [id],
  );
  if (!res.rowCount) throw new ApiError(404, "Production Order not found.");
  return res.rows[0];
};

export const createProductionService = async (client, data, userId) => {
  await setAuditContext(client, userId);
  const { production_date, business_model, party_id, remarks, steps } = data;
  const batchRes = await client.query(
    `SELECT 'BATCH-' || LPAD(nextval('steel_erp.production_batch_seq')::text,5,'0') AS batch_no`,
  );
  const batchNo = batchRes.rows[0].batch_no;

  const orderRes = await client.query(
    `INSERT INTO steel_erp.production_orders (batch_no, production_date, business_model, party_id, status, remarks, created_by)
    VALUES ($1, $2, $3::steel_erp.business_model_enum, $4, 'DRAFT', $5, $6) RETURNING id, batch_no`,
    [
      batchNo,
      production_date,
      business_model,
      party_id || null,
      remarks,
      userId,
    ],
  );
  await _insertStepsHelper(client, orderRes.rows[0].id, steps);
  return { order_id: orderRes.rows[0].id, batch_no: batchNo };
};

export const updateProductionService = async (
  client,
  orderId,
  data,
  userId,
) => {
  await setAuditContext(client, userId);

  const orderCheck = await client.query(
    `SELECT status FROM steel_erp.production_orders WHERE id=$1 FOR UPDATE`,
    [orderId],
  );
  if (!orderCheck.rowCount) throw new ApiError(404, "Order not found");
  if (orderCheck.rows[0].status !== "DRAFT")
    throw new ApiError(400, "Can only edit routing map for DRAFT orders.");

  await client.query(
    `UPDATE steel_erp.production_orders SET production_date=$1, business_model=$2::steel_erp.business_model_enum, party_id=$3, remarks=$4 WHERE id=$5`,
    [
      data.production_date,
      data.business_model,
      data.party_id || null,
      data.remarks,
      orderId,
    ],
  );
  await client.query(
    `DELETE FROM steel_erp.production_steps WHERE production_order_id = $1`,
    [orderId],
  );
  await _insertStepsHelper(client, orderId, data.steps);
  return { message: "Production Routing Plan updated successfully." };
};

export const postProductionStepService = async (
  client,
  orderId,
  stepId,
  data,
  userId,
) => {
  await setAuditContext(client, userId);
  const { actual_inputs, scrap_qty, outputs, is_step_complete } = data;

  const orderRes = await client.query(
    `SELECT business_model, party_id FROM steel_erp.production_orders WHERE id=$1 FOR UPDATE`,
    [orderId],
  );
  const order = orderRes.rows[0];

  const stepRes = await client.query(
    `SELECT * FROM steel_erp.production_steps WHERE id=$1 AND production_order_id=$2 FOR UPDATE`,
    [stepId, orderId],
  );
  if (!stepRes.rowCount) throw new ApiError(404, "Step not found");
  const step = stepRes.rows[0];

  if (step.status === "COMPLETED")
    throw new ApiError(400, "This step is already fully completed.");

  const ownership = order.business_model === "JOB_WORK" ? "JOB_WORK" : "OWN";
  const ownerParty =
    order.business_model === "JOB_WORK" ? order.party_id : null;
  const scrapAmt = Number(scrap_qty) || 0;

  let autoScrapTypeId = null;
  if (scrapAmt > 0) {
    const scrapMasterRes = await client.query(
      `SELECT id FROM steel_erp.scrap_types WHERE is_active = true ORDER BY id ASC LIMIT 1`,
    );
    if (scrapMasterRes.rowCount === 0)
      throw new ApiError(400, "No Scrap Item found in the Database.");
    autoScrapTypeId = scrapMasterRes.rows[0].id;
  }

  const newStatus = is_step_complete ? "COMPLETED" : "IN_PROGRESS";

  // 1. CONSUME RAW MATERIALS FROM LEDGER
  if (actual_inputs && actual_inputs.length > 0) {
    for (const inp of actual_inputs) {
      const qtyToConsume = Number(inp.quantity) || 0;
      if (qtyToConsume <= 0) continue;

      if (inp.input_item_kind === "SEMI_FINISHED") {
        await drainProductionStockBuckets(
          client,
          ownership,
          ownerParty,
          inp.semi_finished_id,
          qtyToConsume,
          inp.uom || "KG",
          orderId,
          stepId,
          userId,
        );
      } else {
        await client.query(
          `INSERT INTO steel_erp.stock_ledger (movement_date, movement_type, ownership_type, owner_party_id, item_kind, raw_material_id, quantity_out, uom, reference_module, reference_id, reference_line_id, created_by)
          VALUES (CURRENT_DATE, 'PRODUCTION_CONSUME', $1::steel_erp.ownership_type_enum, $2, $3::steel_erp.item_kind_enum, $4, $5, $6::steel_erp.uom_enum, 'PRODUCTION', $7, $8, $9)`,
          [
            ownership,
            ownerParty,
            inp.input_item_kind,
            inp.raw_material_id,
            qtyToConsume,
            inp.uom || "KG",
            orderId,
            stepId,
            userId,
          ],
        );
      }
    }
  }

  for (const out of outputs) {
    let ledgerProductId = null;
    if (out.output_item_kind === "FINISHED") {
      ledgerProductId = out.product_id;
    } else if (out.output_item_kind === "SEMI_FINISHED") {
      ledgerProductId = await getIsolatedProxyProduct(
        client,
        out.semi_finished_id,
        out.uom || "KG",
      );
    }

    await client.query(
      `INSERT INTO steel_erp.stock_ledger (movement_date, movement_type, ownership_type, owner_party_id, item_kind, product_id, semi_finished_id, quantity_in, uom, reference_module, reference_id, reference_line_id, created_by)
      VALUES (CURRENT_DATE, 'PRODUCTION_OUTPUT', $1::steel_erp.ownership_type_enum, $2, $3::steel_erp.item_kind_enum, $4, $5, $6, $7::steel_erp.uom_enum, 'PRODUCTION', $8, $9, $10)`,
      [
        ownership,
        ownerParty,
        out.output_item_kind,
        ledgerProductId,
        out.semi_finished_id || null,
        out.quantity,
        out.uom || "KG",
        orderId,
        stepId,
        userId,
      ],
    );
  }

  if (scrapAmt > 0) {
    await client.query(
      `INSERT INTO steel_erp.stock_ledger (movement_date, movement_type, ownership_type, owner_party_id, item_kind, scrap_type_id, quantity_in, uom, reference_module, reference_id, reference_line_id, created_by)
      VALUES (CURRENT_DATE, 'PRODUCTION_SCRAP', 'OWN', NULL, 'SCRAP', $1, $2, 'KG'::steel_erp.uom_enum, 'PRODUCTION', $3, $4, $5)`,
      [autoScrapTypeId, scrapAmt, orderId, stepId, userId],
    );
  }

  await client.query(
    `UPDATE steel_erp.production_steps
    SET status = $1::steel_erp.step_status_enum, started_at = COALESCE(started_at, now()),
        completed_at = CASE WHEN $2::boolean THEN now() ELSE completed_at END,
        scrap_qty = scrap_qty + $3, scrap_type_id = COALESCE(scrap_type_id, $4)
    WHERE id = $5`,
    [newStatus, is_step_complete, scrapAmt, autoScrapTypeId, stepId],
  );

  if (is_step_complete) {
    const pendingSteps = await client.query(
      `SELECT 1 FROM steel_erp.production_steps WHERE production_order_id=$1 AND status != 'COMPLETED'`,
      [orderId],
    );
    if (pendingSteps.rowCount === 0)
      await client.query(
        `UPDATE steel_erp.production_orders SET status='COMPLETED' WHERE id=$1`,
        [orderId],
      );
  } else {
    await client.query(
      `UPDATE steel_erp.production_orders SET status='IN_PROGRESS' WHERE id=$1 AND status='DRAFT'`,
      [orderId],
    );
  }

  return {
    message: is_step_complete
      ? "Step Completed!"
      : "Partial Run Logged Successfully!",
  };
};

export const cancelProductionService = async (client, orderId, userId) => {
  await setAuditContext(client, userId);
  const orderCheck = await client.query(
    `SELECT status FROM steel_erp.production_orders WHERE id=$1 FOR UPDATE`,
    [orderId],
  );
  if (!orderCheck.rowCount) throw new ApiError(404, "Order not found");
  if (orderCheck.rows[0].status === "COMPLETED")
    throw new ApiError(
      400,
      "Cannot cancel a fully completed manufacturing batch.",
    );

  await client.query(
    `UPDATE steel_erp.production_orders SET status='CANCELLED', cancelled_at=now(), cancelled_by=$2 WHERE id=$1`,
    [orderId, userId],
  );
  await client.query(
    `UPDATE steel_erp.production_steps SET status='CANCELLED' WHERE production_order_id=$1 AND status != 'COMPLETED'`,
    [orderId],
  );
  return {
    message:
      "Batch Halted! All previously transformed stock remains safely recorded in the warehouse.",
  };
};

export const deleteProductionService = async (client, orderId, userId) => {
  await setAuditContext(client, userId);
  const orderCheck = await client.query(
    `SELECT id FROM steel_erp.production_orders WHERE id=$1 FOR UPDATE`,
    [orderId],
  );
  if (!orderCheck.rowCount)
    throw new ApiError(404, "Production Order not found");

  await client.query(
    `DELETE FROM steel_erp.stock_ledger WHERE reference_module = 'PRODUCTION' AND reference_id = $1`,
    [orderId],
  );
  await client.query(`DELETE FROM steel_erp.production_orders WHERE id = $1`, [
    orderId,
  ]);
  return {
    message:
      "Batch and all associated ledger tracking have been permanently erased.",
  };
};

const _insertStepsHelper = async (client, orderId, steps) => {
  const scrapRes = await client.query(
    `SELECT id FROM steel_erp.scrap_types WHERE is_active = true ORDER BY id ASC LIMIT 1`,
  );
  const safeScrapId = scrapRes.rowCount > 0 ? scrapRes.rows[0].id : null;

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const autoScrapTypeId = step.scrap_qty > 0 ? safeScrapId : null;

    const firstInput =
      step.inputs && step.inputs.length > 0 ? step.inputs[0] : step;

    const legacyKind = firstInput.input_item_kind || "RAW";
    const legacyQty = firstInput.quantity || step.input_qty || 0;
    const legacyUom = firstInput.uom || step.uom || "KG";

    const legacyRawId =
      legacyKind === "RAW"
        ? firstInput.raw_material_id || step.input_raw_material_id || null
        : null;
    const legacySemiId =
      legacyKind === "SEMI_FINISHED"
        ? firstInput.semi_finished_id || step.input_semi_finished_id || null
        : null;

    const stepRes = await client.query(
      `INSERT INTO steel_erp.production_steps (
        production_order_id, step_no, step_name, machine_id, worker_mode, 
        input_item_kind, input_qty, input_uom, input_raw_material_id, input_semi_finished_id,
        scrap_type_id, scrap_qty, is_final_step
      )
       VALUES ($1, $2, $3, $4, $5::steel_erp.worker_mode_enum, 
               $6::steel_erp.item_kind_enum, $7, $8::steel_erp.uom_enum, $9, $10,
               $11, $12, $13) RETURNING id`,
      [
        orderId,
        i + 1,
        step.step_name,
        step.machine_id,
        step.worker_mode,
        legacyKind,
        legacyQty,
        legacyUom,
        legacyRawId,
        legacySemiId,
        autoScrapTypeId,
        step.scrap_qty || 0,
        step.is_final_step,
      ],
    );

    const stepId = stepRes.rows[0].id;

    for (const workerId of step.workers) {
      await client.query(
        `INSERT INTO steel_erp.production_step_workers (production_step_id, personnel_id) VALUES ($1, $2)`,
        [stepId, workerId],
      );
    }

    const inputsToProcess =
      step.inputs && step.inputs.length > 0
        ? step.inputs
        : [
            {
              input_item_kind: legacyKind,
              raw_material_id: legacyRawId,
              semi_finished_id: legacySemiId,
              quantity: legacyQty,
              uom: legacyUom,
            },
          ];

    for (const inp of inputsToProcess) {
      if (Number(inp.quantity) > 0) {
        await client.query(
          `INSERT INTO steel_erp.production_step_inputs (production_step_id, input_item_kind, raw_material_id, semi_finished_id, quantity, uom) 
               VALUES ($1, $2::steel_erp.item_kind_enum, $3, $4, $5, $6::steel_erp.uom_enum)`,
          [
            stepId,
            inp.input_item_kind,
            inp.input_item_kind === "RAW" ? inp.raw_material_id || null : null,
            inp.input_item_kind === "SEMI_FINISHED"
              ? inp.semi_finished_id || null
              : null,
            inp.quantity,
            inp.uom || "KG",
          ],
        );
      }
    }

    if (step.outputs && Array.isArray(step.outputs)) {
      for (const out of step.outputs) {
        await client.query(
          `INSERT INTO steel_erp.production_step_outputs (production_step_id, output_item_kind, product_id, semi_finished_id, quantity, uom) VALUES ($1, $2::steel_erp.item_kind_enum, $3, $4, $5, $6::steel_erp.uom_enum)`,
          [
            stepId,
            out.output_item_kind,
            out.output_item_kind === "FINISHED" ? out.product_id : null,
            out.output_item_kind === "SEMI_FINISHED"
              ? out.semi_finished_id
              : null,
            out.quantity,
            out.uom || "KG",
          ],
        );
      }
    }
  }
};
