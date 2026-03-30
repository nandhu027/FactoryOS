export const performGlobalSearchService = async (client, query, userId) => {
  const searchTerm = "%" + query.trim().split(/\s+/).join("%") + "%";
  const results = [];
  const searchTasks = [
    client.query(
      `
      SELECT id, full_name as label, personnel_type || ' • ' || COALESCE(phone, 'No Phone') as sublabel, full_name as search_ref 
      FROM steel_erp.personnel 
      WHERE CONCAT_WS(' ', full_name, phone, address, personnel_type) ILIKE $1 AND is_active = true LIMIT 5`,
      [searchTerm],
    ),
    client.query(
      `
      SELECT id, party_name as label, 'Party • ' || COALESCE(phone, 'No Phone') as sublabel, party_name as search_ref 
      FROM steel_erp.parties 
      WHERE CONCAT_WS(' ', party_name, phone, address) ILIKE $1 AND is_active = true LIMIT 5`,
      [searchTerm],
    ),
    client.query(
      `
      SELECT id, machine_name as label, 'Machine • ' || status as sublabel, machine_name as search_ref 
      FROM steel_erp.machines 
      WHERE CONCAT_WS(' ', machine_name, status) ILIKE $1 AND is_active = true LIMIT 5`,
      [searchTerm],
    ),
    client.query(
      `
      SELECT id, product_name as label, 'Code: ' || product_code as sublabel, product_name as search_ref 
      FROM steel_erp.products 
      WHERE CONCAT_WS(' ', product_name, product_code) ILIKE $1 AND is_active = true LIMIT 5`,
      [searchTerm],
    ),
    client.query(
      `
      SELECT id, item_name as label, 'WIP Code: ' || item_code as sublabel, item_name as search_ref 
      FROM steel_erp.semi_finished_items 
      WHERE CONCAT_WS(' ', item_name, item_code) ILIKE $1 AND is_active = true LIMIT 5`,
      [searchTerm],
    ),
    client.query(
      `
      SELECT id, material_name as label, 'Raw Material' as sublabel, material_name as search_ref 
      FROM steel_erp.raw_materials 
      WHERE material_name ILIKE $1 AND is_active = true LIMIT 5`,
      [searchTerm],
    ),
    client.query(
      `
      SELECT id, scrap_name as label, 'Scrap Type' as sublabel, scrap_name as search_ref 
      FROM steel_erp.scrap_types 
      WHERE scrap_name ILIKE $1 AND is_active = true LIMIT 5`,
      [searchTerm],
    ),

    client.query(
      `
      SELECT po.id, po.batch_no as label, 'Status: ' || po.status || ' • ' || COALESCE(p.party_name, 'Own Mfg') as sublabel 
      FROM steel_erp.production_orders po
      LEFT JOIN steel_erp.parties p ON p.id = po.party_id
      WHERE CONCAT_WS(' ', po.batch_no, po.status, po.remarks, p.party_name) ILIKE $1 ORDER BY po.created_at DESC LIMIT 5`,
      [searchTerm],
    ),
    client.query(
      `
      SELECT cj.id, cj.job_no as label, 'With: ' || per.full_name || ' • ' || cj.status as sublabel 
      FROM steel_erp.contractor_jobs cj
      LEFT JOIN steel_erp.personnel per ON per.id = cj.contractor_id
      LEFT JOIN steel_erp.semi_finished_items sfi ON sfi.id = cj.semi_finished_id
      WHERE CONCAT_WS(' ', cj.job_no, cj.status, cj.remarks, per.full_name, sfi.item_name) ILIKE $1 ORDER BY cj.created_at DESC LIMIT 5`,
      [searchTerm],
    ),
    client.query(
      `
      SELECT dh.id, dh.dispatch_no as label, dh.dispatch_type || ' • To: ' || p.party_name as sublabel 
      FROM steel_erp.dispatch_headers dh
      LEFT JOIN steel_erp.parties p ON p.id = dh.party_id
      WHERE CONCAT_WS(' ', dh.dispatch_no, dh.dispatch_type, dh.remarks, p.party_name) ILIKE $1 ORDER BY dh.created_at DESC LIMIT 5`,
      [searchTerm],
    ),
    client.query(
      `
      SELECT ri.id, ri.inward_no as label, 'From: ' || p.party_name || ' • Challan: ' || COALESCE(ri.challan_no, 'N/A') as sublabel 
      FROM steel_erp.raw_inward_headers ri
      LEFT JOIN steel_erp.parties p ON p.id = ri.party_id
      WHERE CONCAT_WS(' ', ri.inward_no, ri.challan_no, ri.remarks, p.party_name) ILIKE $1 ORDER BY ri.created_at DESC LIMIT 5`,
      [searchTerm],
    ),
    client.query(
      `
      SELECT e.id, '₹' || e.amount || ' - ' || c.category_name as label, e.reason as sublabel 
      FROM steel_erp.expenses e
      LEFT JOIN steel_erp.expense_categories c ON c.id = e.category_id
      WHERE CONCAT_WS(' ', e.reason, e.amount::text, c.category_name) ILIKE $1 ORDER BY e.expense_date DESC LIMIT 5`,
      [searchTerm],
    ),
    client.query(
      `
      SELECT pp.id, '₹' || pp.amount || ' to ' || per.full_name as label, pp.reason as sublabel 
      FROM steel_erp.personnel_payments pp
      LEFT JOIN steel_erp.personnel per ON per.id = pp.personnel_id
      WHERE CONCAT_WS(' ', pp.reason, pp.amount::text, per.full_name) ILIKE $1 ORDER BY pp.payment_date DESC LIMIT 5`,
      [searchTerm],
    ),
  ];

  const taskResults = await Promise.allSettled(searchTasks);

  const categoryMap = [
    { type: "Personnel", icon: "Users", path: "/staff", isMaster: true },
    { type: "Party", icon: "Building", path: "/parties", isMaster: true },
    { type: "Machine", icon: "Cpu", path: "/machines", isMaster: true },
    { type: "Product", icon: "Package", path: "/products", isMaster: true },
    {
      type: "WIP / Semi-Finished",
      icon: "Layers",
      path: "/products?tab=wip",
      isMaster: true,
    },
    {
      type: "Raw Material",
      icon: "Boxes",
      path: "/raw-materials",
      isMaster: true,
    },
    { type: "Scrap Type", icon: "Database", path: "/stock", isMaster: true },
    {
      type: "Production Batch",
      icon: "Factory",
      path: "/production",
      isMaster: false,
    },
    {
      type: "Contractor Job",
      icon: "Truck",
      path: "/contractor",
      isMaster: false,
    },
    {
      type: "Dispatch",
      icon: "SendToBack",
      path: "/dispatch",
      isMaster: false,
    }, // Assuming SendToBack/Truck icon in UI
    {
      type: "Raw Inward",
      icon: "Download",
      path: "/raw-inward",
      isMaster: false,
    },
    { type: "Expense", icon: "Receipt", path: "/expenses", isMaster: true }, // Using list filter
    { type: "Payment", icon: "Banknote", path: "/payments", isMaster: true }, // Using list filter
  ];

  taskResults.forEach((res, index) => {
    if (res.status === "fulfilled") {
      res.value.rows.forEach((row) => {
        const meta = categoryMap[index];

        let targetPath = meta.path;
        if (meta.isMaster) {
          targetPath = `${meta.path}?search=${encodeURIComponent(row.search_ref || row.label)}`;
        } else {
          targetPath = `${meta.path}/${row.id}`;
        }

        results.push({
          id: row.id,
          label: row.label,
          sublabel: row.sublabel,
          type: meta.type,
          icon: meta.icon,
          path: targetPath,
        });
      });
    }
  });

  const rawQuery = query.toLowerCase().trim();
  results.sort((a, b) => {
    const aStarts = a.label.toLowerCase().startsWith(rawQuery);
    const bStarts = b.label.toLowerCase().startsWith(rawQuery);
    if (aStarts && !bStarts) return -1;
    if (!aStarts && bStarts) return 1;
    return 0;
  });

  return results;
};
