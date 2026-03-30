import { ApiError } from "../../utils/ApiError.js";

const setAuditContext = async (client, userId) => {
  if (userId)
    await client.query(`SELECT set_config('app.user_id', $1::text, true)`, [
      userId,
    ]);
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

const drainStockBuckets = async (
  client,
  out_date,
  ownership_type,
  ownerParty,
  semi_finished_id,
  qty_sent,
  uom,
  reference_module,
  reference_id,
  userId,
  notes,
) => {
  let remainingQty = Number(qty_sent);

  const bucketsRes = await client.query(
    `SELECT product_id, SUM(quantity_in - quantity_out) as balance 
     FROM steel_erp.stock_ledger 
     WHERE item_kind = 'SEMI_FINISHED' 
       AND semi_finished_id = $1 
       AND ownership_type = $2 
       AND owner_party_id IS NOT DISTINCT FROM $3
     GROUP BY product_id
     HAVING SUM(quantity_in - quantity_out) > 0
     ORDER BY balance DESC`,
    [semi_finished_id, ownership_type, ownerParty],
  );

  for (const bucket of bucketsRes.rows) {
    if (remainingQty <= 0) break;
    const bucketBalance = Number(bucket.balance);
    const deductQty = Math.min(bucketBalance, remainingQty);

    await client.query(
      `INSERT INTO steel_erp.stock_ledger 
        (movement_date, movement_type, ownership_type, owner_party_id, item_kind, semi_finished_id, product_id, quantity_out, quantity_in, uom, reference_module, reference_id, created_by, notes)
       VALUES ($1, 'CONTRACTOR_OUT', $2, $3, 'SEMI_FINISHED', $4, $5, $6, 0, $7, $8, $9, $10, $11)`,
      [
        out_date,
        ownership_type,
        ownerParty,
        semi_finished_id,
        bucket.product_id,
        deductQty,
        uom,
        reference_module,
        reference_id,
        userId,
        notes,
      ],
    );
    remainingQty -= deductQty;
  }

  if (remainingQty > 0.005) {
    throw new ApiError(
      400,
      `Insufficient stock. You need ${remainingQty.toFixed(2)} ${uom} more of this item in the factory to send it out.`,
    );
  }
};

export const getContractorJobsService = async (client, queryParams) => {
  const {
    page = 1,
    limit = 50,
    search,
    status,
    contractor_id,
    date_filter,
    custom_start,
    custom_end,
  } = queryParams || {};
  const offset = (page - 1) * limit;
  const values = [];
  let whereClauses = ["1=1"];

  if (status && status !== "ALL") {
    values.push(status);
    whereClauses.push(`cj.status = $${values.length}`);
  }
  if (contractor_id) {
    values.push(contractor_id);
    whereClauses.push(`cj.contractor_id = $${values.length}`);
  }
  if (date_filter) {
    switch (date_filter) {
      case "TODAY":
        whereClauses.push(`cj.out_date = CURRENT_DATE`);
        break;
      case "YESTERDAY":
        whereClauses.push(`cj.out_date = CURRENT_DATE - INTERVAL '1 day'`);
        break;
      case "WEEK":
        whereClauses.push(
          `date_trunc('week', cj.out_date) = date_trunc('week', CURRENT_DATE)`,
        );
        break;
      case "MONTH":
        whereClauses.push(
          `date_trunc('month', cj.out_date) = date_trunc('month', CURRENT_DATE)`,
        );
        break;
      case "CUSTOM":
        values.push(custom_start, custom_end);
        whereClauses.push(
          `cj.out_date BETWEEN $${values.length - 1} AND $${values.length}`,
        );
        break;
    }
  }
  if (search) {
    values.push(`%${search}%`);
    whereClauses.push(
      `(cj.job_no ILIKE $${values.length} OR per.full_name ILIKE $${values.length})`,
    );
  }

  const whereString = whereClauses.join(" AND ");

  const result = await client.query(
    `SELECT 
      cj.*, p.party_name, per.full_name AS contractor_name, sfi.item_name as semi_finished_name,
      COALESCE((SELECT SUM(quantity) FROM steel_erp.contractor_job_returns cr WHERE cr.contractor_job_id = cj.id AND COALESCE(cr.remarks, '') != 'Process Loss'), 0) AS returned_qty,
      GREATEST(0, (cj.qty_sent - COALESCE((SELECT SUM(quantity) FROM steel_erp.contractor_job_returns cr WHERE cr.contractor_job_id = cj.id), 0))) AS pending_qty,
      (SELECT sl.semi_finished_id FROM steel_erp.stock_ledger sl WHERE sl.reference_module = 'CONTRACTOR' AND sl.reference_id = cj.id AND sl.movement_type = 'CONTRACTOR_RETURN' AND sl.semi_finished_id IS NOT NULL LIMIT 1) AS locked_return_item_id,
      (SELECT json_agg(json_build_object('output_item_kind', pso.output_item_kind, 'product_id', pso.product_id, 'semi_finished_id', pso.semi_finished_id))
       FROM steel_erp.production_step_outputs pso
       WHERE pso.production_step_id = cj.source_step_id) as planned_outputs
    FROM steel_erp.contractor_jobs cj
    LEFT JOIN steel_erp.parties p ON cj.owner_party_id = p.id
    LEFT JOIN steel_erp.personnel per ON cj.contractor_id = per.id
    LEFT JOIN steel_erp.semi_finished_items sfi ON cj.semi_finished_id = sfi.id
    WHERE ${whereString}
    ORDER BY cj.status DESC, cj.out_date DESC, cj.id DESC
    LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
    [...values, limit, offset],
  );

  const countRes = await client.query(
    `SELECT count(cj.id)::int as total FROM steel_erp.contractor_jobs cj LEFT JOIN steel_erp.personnel per ON cj.contractor_id = per.id WHERE ${whereString}`,
    values,
  );

  return {
    data: result.rows,
    meta: {
      total: countRes.rows[0].total,
      page: Number(page),
      limit: Number(limit),
      total_pages: Math.ceil(countRes.rows[0].total / limit),
    },
  };
};

export const getContractorJobByIdService = async (client, id) => {
  const result = await client.query(
    `SELECT cj.*, p.party_name, per.full_name AS contractor_name, sfi.item_name as semi_finished_name,
      COALESCE((SELECT SUM(quantity) FROM steel_erp.contractor_job_returns cr WHERE cr.contractor_job_id = cj.id AND COALESCE(cr.remarks, '') != 'Process Loss'), 0) AS returned_qty,
      COALESCE((
        SELECT json_agg(json_build_object('id', cr.id, 'return_date', cr.return_date, 'quantity', cr.quantity, 'remarks', cr.remarks) ORDER BY cr.return_date DESC)
        FROM steel_erp.contractor_job_returns cr WHERE cr.contractor_job_id = cj.id
      ), '[]'::json) as returns_history,
      COALESCE((
        SELECT json_agg(json_build_object('id', sl.id, 'out_date', sl.movement_date, 'quantity', sl.quantity_out, 'remarks', sl.notes) ORDER BY sl.movement_ts ASC)
        FROM steel_erp.stock_ledger sl WHERE sl.reference_module = 'CONTRACTOR' AND sl.reference_id = cj.id AND sl.movement_type = 'CONTRACTOR_OUT' AND sl.is_reversal = false
      ), '[]'::json) as outwards_history,
      (SELECT json_agg(json_build_object('output_item_kind', pso.output_item_kind, 'product_id', pso.product_id, 'semi_finished_id', pso.semi_finished_id))
       FROM steel_erp.production_step_outputs pso
       WHERE pso.production_step_id = cj.source_step_id) as planned_outputs
    FROM steel_erp.contractor_jobs cj
    LEFT JOIN steel_erp.parties p ON cj.owner_party_id = p.id
    LEFT JOIN steel_erp.personnel per ON cj.contractor_id = per.id
    LEFT JOIN steel_erp.semi_finished_items sfi ON cj.semi_finished_id = sfi.id
    WHERE cj.id = $1`,
    [id],
  );
  if (!result.rowCount) throw new ApiError(404, "Contractor Job not found");
  return result.rows[0];
};

export const getAvailableSemiStockService = async (client) => {
  const result = await client.query(`
    SELECT sl.semi_finished_id, sfi.item_name as display_name, sl.ownership_type, sl.owner_party_id, p.party_name, sl.uom, SUM(sl.quantity_in - sl.quantity_out)::numeric(18,3) AS balance
    FROM steel_erp.stock_ledger sl 
    JOIN steel_erp.semi_finished_items sfi ON sl.semi_finished_id = sfi.id 
    LEFT JOIN steel_erp.parties p ON sl.owner_party_id = p.id
    WHERE sl.item_kind = 'SEMI_FINISHED' 
    GROUP BY sl.semi_finished_id, sfi.item_name, sl.ownership_type, sl.owner_party_id, p.party_name, sl.uom
    HAVING SUM(sl.quantity_in - sl.quantity_out) > 0 
    ORDER BY sl.ownership_type ASC, sfi.item_name ASC
  `);
  return result.rows;
};

export const createContractorJobService = async (client, data, userId) => {
  await setAuditContext(client, userId);
  const {
    job_no,
    contractor_id,
    out_date,
    ownership_type,
    owner_party_id,
    semi_finished_id,
    qty_sent,
    uom,
    remarks,
    production_order_id,
    source_step_id,
  } = data;
  const ownerParty = ownership_type === "JOB_WORK" ? owner_party_id : null;
  const proxyId = await getIsolatedProxyProduct(client, semi_finished_id, uom);

  const existingOpenJob = await client.query(
    `SELECT id, job_no FROM steel_erp.contractor_jobs WHERE contractor_id = $1 AND semi_finished_id = $2 AND ownership_type = $3 AND owner_party_id IS NOT DISTINCT FROM $4 AND status = 'OPEN'`,
    [contractor_id, semi_finished_id, ownership_type, ownerParty],
  );

  let jobId;
  let isMerged = false;
  let activeJobNo = job_no;

  if (existingOpenJob.rowCount > 0) {
    jobId = existingOpenJob.rows[0].id;
    activeJobNo = existingOpenJob.rows[0].job_no;
    isMerged = true;
    await client.query(
      `UPDATE steel_erp.contractor_jobs SET qty_sent = qty_sent + $1, updated_at = now() WHERE id = $2`,
      [qty_sent, jobId],
    );
  } else {
    const jobRes = await client.query(
      `INSERT INTO steel_erp.contractor_jobs (job_no, production_order_id, source_step_id, contractor_id, out_date, ownership_type, owner_party_id, semi_finished_id, product_id, qty_sent, uom, remarks, created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id`,
      [
        job_no,
        production_order_id || null,
        source_step_id || null,
        contractor_id,
        out_date,
        ownership_type,
        ownerParty,
        semi_finished_id,
        proxyId,
        qty_sent,
        uom,
        remarks,
        userId,
      ],
    );
    jobId = jobRes.rows[0].id;
  }

  await drainStockBuckets(
    client,
    out_date,
    ownership_type,
    ownerParty,
    semi_finished_id,
    qty_sent,
    uom,
    "CONTRACTOR",
    jobId,
    userId,
    isMerged ? "Appended to existing active job" : remarks,
  );

  return { id: jobId, merged: isMerged, job_no: activeJobNo };
};

export const createContractorReturnService = async (client, data, userId) => {
  await setAuditContext(client, userId);
  const {
    contractor_job_id,
    return_date,
    quantity,
    uom,
    remarks,
    return_item_kind,
    return_item_id,
    loss_qty,
  } = data;

  const jobRes = await client.query(
    `SELECT * FROM steel_erp.contractor_jobs WHERE id = $1 FOR UPDATE`,
    [contractor_job_id],
  );
  if (!jobRes.rowCount) throw new ApiError(404, "Job not found");
  const job = jobRes.rows[0];

  if (job.status === "CLOSED") throw new ApiError(400, "Job is already closed");

  if (Number(quantity) > 0) {
    const insert = await client.query(
      `INSERT INTO steel_erp.contractor_job_returns (contractor_job_id, return_date, quantity, uom, remarks, created_by) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
      [contractor_job_id, return_date, quantity, uom, remarks, userId],
    );

    const itemKind = return_item_kind || "SEMI_FINISHED";
    let sfId = null,
      pId = null,
      scrapId = null;

    if (itemKind === "FINISHED") pId = return_item_id;
    else if (itemKind === "SCRAP") scrapId = return_item_id;
    else {
      sfId = return_item_id || job.semi_finished_id;
      pId = job.product_id;
    }

    await client.query(
      `INSERT INTO steel_erp.stock_ledger (movement_date, movement_type, ownership_type, owner_party_id, item_kind, semi_finished_id, product_id, scrap_type_id, quantity_in, quantity_out, uom, reference_module, reference_id, reference_line_id, created_by, notes)
      VALUES ($1, 'CONTRACTOR_RETURN', $2, $3, $4, $5, $6, $7, $8, 0, $9, 'CONTRACTOR', $10, $11, $12, $13)`,
      [
        return_date,
        job.ownership_type,
        job.owner_party_id,
        itemKind,
        sfId,
        pId,
        scrapId,
        quantity,
        uom,
        job.id,
        insert.rows[0].id,
        userId,
        remarks,
      ],
    );
  }

  if (loss_qty && Number(loss_qty) > 0) {
    await client.query(
      `INSERT INTO steel_erp.contractor_job_returns (contractor_job_id, return_date, quantity, uom, remarks, created_by) VALUES ($1,$2,$3,$4,$5,$6)`,
      [contractor_job_id, return_date, loss_qty, uom, `Process Loss`, userId],
    );
  }

  const returnedRes = await client.query(
    `SELECT COALESCE(SUM(quantity),0) AS total FROM steel_erp.contractor_job_returns WHERE contractor_job_id = $1`,
    [contractor_job_id],
  );

  if (Number(returnedRes.rows[0].total) >= Number(job.qty_sent) - 0.001) {
    await client.query(
      `UPDATE steel_erp.contractor_jobs SET status = 'CLOSED', updated_at = now() WHERE id = $1`,
      [contractor_job_id],
    );

    if (job.source_step_id) {
      await client.query(
        `UPDATE steel_erp.production_steps 
         SET status = 'COMPLETED', completed_at = now() 
         WHERE id = $1`,
        [job.source_step_id],
      );

      const pendingSteps = await client.query(
        `SELECT 1 FROM steel_erp.production_steps WHERE production_order_id = $1 AND status != 'COMPLETED'`,
        [job.production_order_id],
      );
      if (pendingSteps.rowCount === 0) {
        await client.query(
          `UPDATE steel_erp.production_orders SET status = 'COMPLETED' WHERE id = $1`,
          [job.production_order_id],
        );
      }
    }
  }

  return { message: "Return recorded successfully." };
};

export const cancelContractorJobService = async (client, id, userId) => {
  await setAuditContext(client, userId);
  const returnCheck = await client.query(
    `SELECT 1 FROM steel_erp.contractor_job_returns WHERE contractor_job_id = $1 LIMIT 1`,
    [id],
  );
  if (returnCheck.rowCount > 0)
    throw new ApiError(400, "Cannot cancel job. Returns exist.");

  await client.query(
    `SELECT steel_erp.fn_reverse_stock_by_reference('CONTRACTOR', $1, $2)`,
    [id, userId],
  );
  await client.query(
    `UPDATE steel_erp.contractor_jobs SET status = 'CANCELLED', updated_at = now() WHERE id = $1`,
    [id],
  );
  return { message: "Job cancelled and stock reverted to the factory." };
};

export const createMultiDispatchService = async (client, data, userId) => {
  await setAuditContext(client, userId);
  const { contractor_id, out_date, remarks, items } = data;
  const dispatchBatchId = `GT-${Date.now().toString().slice(-6)}`;
  const createdJobs = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const jobNo = `${dispatchBatchId}-${i + 1}`;
    const ownerParty =
      item.ownership_type === "JOB_WORK" ? item.owner_party_id : null;
    const proxyId = await getIsolatedProxyProduct(
      client,
      item.source_semi_finished_id,
      item.uom,
    );

    const jobRes = await client.query(
      `INSERT INTO steel_erp.contractor_jobs (job_no, contractor_id, out_date, ownership_type, owner_party_id, semi_finished_id, product_id, qty_sent, uom, remarks, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
      [
        jobNo,
        contractor_id,
        out_date,
        item.ownership_type,
        ownerParty,
        item.source_semi_finished_id,
        proxyId,
        item.qty_sent,
        item.uom,
        remarks || "General Take Batch",
        userId,
      ],
    );
    const jobId = jobRes.rows[0].id;
    createdJobs.push({ job_id: jobId, job_no: jobNo });

    await drainStockBuckets(
      client,
      out_date,
      item.ownership_type,
      ownerParty,
      item.source_semi_finished_id,
      item.qty_sent,
      item.uom,
      "CONTRACTOR",
      jobId,
      userId,
      `General Take Dispatch: ${jobNo}`,
    );
  }

  return { batch_id: dispatchBatchId, jobs: createdJobs };
};

export const createMultiReturnService = async (client, data, userId) => {
  await setAuditContext(client, userId);
  const { return_date, remarks, returns } = data;
  const returnBatchId = `GR-${Date.now().toString().slice(-6)}`;
  const processedReturns = [];

  for (let i = 0; i < returns.length; i++) {
    const ret = returns[i];

    const jobRes = await client.query(
      `SELECT * FROM steel_erp.contractor_jobs WHERE id = $1 FOR UPDATE`,
      [ret.contractor_job_id],
    );
    if (!jobRes.rowCount)
      throw new ApiError(404, `Job ID ${ret.contractor_job_id} not found`);
    const job = jobRes.rows[0];

    if (job.status === "CLOSED")
      throw new ApiError(400, `Job ${job.job_no} is already closed`);

    if (Number(ret.qty_returned) > 0) {
      const insertRes = await client.query(
        `INSERT INTO steel_erp.contractor_job_returns (contractor_job_id, return_date, quantity, uom, remarks, created_by) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [
          job.id,
          return_date,
          ret.qty_returned,
          ret.uom,
          remarks || "General Return Batch",
          userId,
        ],
      );
      const returnId = insertRes.rows[0].id;

      let semiFinishedId = null;
      let productId = null;

      if (ret.return_item_kind === "SEMI_FINISHED") {
        semiFinishedId = ret.return_item_id;
        productId = await getIsolatedProxyProduct(
          client,
          ret.return_item_id,
          ret.uom,
        );
      } else {
        semiFinishedId = null;
        productId = ret.return_item_id;
      }

      await client.query(
        `INSERT INTO steel_erp.stock_ledger (movement_date, movement_type, ownership_type, owner_party_id, item_kind, semi_finished_id, product_id, quantity_in, quantity_out, uom, reference_module, reference_id, reference_line_id, created_by, notes)
         VALUES ($1, 'CONTRACTOR_RETURN', $2, $3, $4, $5, $6, $7, 0, $8, 'CONTRACTOR', $9, $10, $11, $12)`,
        [
          return_date,
          job.ownership_type,
          job.owner_party_id,
          ret.return_item_kind,
          semiFinishedId,
          productId,
          ret.qty_returned,
          ret.uom,
          job.id,
          returnId,
          userId,
          `General Return for ${job.job_no}`,
        ],
      );
    }

    if (ret.loss_qty && Number(ret.loss_qty) > 0) {
      await client.query(
        `INSERT INTO steel_erp.contractor_job_returns (contractor_job_id, return_date, quantity, uom, remarks, created_by) VALUES ($1,$2,$3,$4,$5,$6)`,
        [job.id, return_date, ret.loss_qty, ret.uom, `Process Loss`, userId],
      );
    }

    const totalReturnedRes = await client.query(
      `SELECT COALESCE(SUM(quantity), 0) AS total FROM steel_erp.contractor_job_returns WHERE contractor_job_id = $1`,
      [job.id],
    );
    if (
      Number(totalReturnedRes.rows[0].total) >=
      Number(job.qty_sent) - 0.001
    ) {
      await client.query(
        `UPDATE steel_erp.contractor_jobs SET status = 'CLOSED', updated_at = now() WHERE id = $1`,
        [job.id],
      );

      if (job.source_step_id) {
        await client.query(
          `UPDATE steel_erp.production_steps 
           SET status = 'COMPLETED', completed_at = now() 
           WHERE id = $1`,
          [job.source_step_id],
        );

        const pendingSteps = await client.query(
          `SELECT 1 FROM steel_erp.production_steps WHERE production_order_id = $1 AND status != 'COMPLETED'`,
          [job.production_order_id],
        );
        if (pendingSteps.rowCount === 0) {
          await client.query(
            `UPDATE steel_erp.production_orders SET status = 'COMPLETED' WHERE id = $1`,
            [job.production_order_id],
          );
        }
      }
    }

    processedReturns.push({ job_no: job.job_no, qty: ret.qty_returned });
  }

  return { batch_id: returnBatchId, processed: processedReturns };
};

export const reverseContractorReturnService = async (
  client,
  returnId,
  userId,
) => {
  await setAuditContext(client, userId);

  const returnRes = await client.query(
    `SELECT cr.*, cj.status as job_status, cj.qty_sent, cj.source_step_id, cj.production_order_id
     FROM steel_erp.contractor_job_returns cr
     JOIN steel_erp.contractor_jobs cj ON cr.contractor_job_id = cj.id
     WHERE cr.id = $1`,
    [returnId],
  );

  if (!returnRes.rowCount) throw new ApiError(404, "Return record not found");
  const returnRecord = returnRes.rows[0];

  const stockLedgerRes = await client.query(
    `SELECT id FROM steel_erp.stock_ledger 
     WHERE reference_module = 'CONTRACTOR' 
       AND reference_line_id = $1 
       AND movement_type = 'CONTRACTOR_RETURN'
       AND is_reversal = false`,
    [returnId],
  );

  if (stockLedgerRes.rowCount > 0) {
    const ledgerId = stockLedgerRes.rows[0].id;
    const movements = await client.query(
      `SELECT * FROM steel_erp.stock_ledger WHERE id = $1`,
      [ledgerId],
    );

    for (const row of movements.rows) {
      await client.query(
        `INSERT INTO steel_erp.stock_ledger
          (movement_ts, movement_type, ownership_type, owner_party_id, item_kind, raw_material_id, semi_finished_id, product_id, scrap_type_id, quantity_in, quantity_out, uom, reference_module, reference_id, reference_line_id, is_reversal, reversal_of_ledger_id, created_by, notes)
          VALUES (now(), 'REVERSAL', $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, true, $14, $15, 'System Auto-Reversal')`,
        [
          row.ownership_type,
          row.owner_party_id,
          row.item_kind,
          row.raw_material_id,
          row.semi_finished_id,
          row.product_id,
          row.scrap_type_id,
          row.quantity_out,
          row.quantity_in,
          row.uom,
          row.reference_module,
          row.reference_id,
          row.reference_line_id,
          row.id,
          userId || null,
        ],
      );
      await client.query(
        `UPDATE steel_erp.stock_ledger SET is_reversal = true WHERE id = $1`,
        [ledgerId],
      );
    }
  }

  await client.query(
    `UPDATE steel_erp.contractor_job_returns 
     SET quantity = 0, remarks = CONCAT(remarks, ' [REVERSED]')
     WHERE id = $1`,
    [returnId],
  );

  if (returnRecord.job_status === "CLOSED") {
    const totalReturnedRes = await client.query(
      `SELECT COALESCE(SUM(quantity), 0) AS total FROM steel_erp.contractor_job_returns WHERE contractor_job_id = $1`,
      [returnRecord.contractor_job_id],
    );

    if (
      Number(totalReturnedRes.rows[0].total) <
      Number(returnRecord.qty_sent) - 0.001
    ) {
      await client.query(
        `UPDATE steel_erp.contractor_jobs SET status = 'OPEN', updated_at = now() WHERE id = $1`,
        [returnRecord.contractor_job_id],
      );

      if (returnRecord.source_step_id) {
        await client.query(
          `UPDATE steel_erp.production_steps SET status = 'IN_PROGRESS' WHERE id = $1`,
          [returnRecord.source_step_id],
        );
        await client.query(
          `UPDATE steel_erp.production_orders SET status = 'IN_PROGRESS' WHERE id = $1`,
          [returnRecord.production_order_id],
        );
      }
    }
  }

  return { message: "Return successfully reversed." };
};
