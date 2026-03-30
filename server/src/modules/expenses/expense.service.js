import { ApiError } from "../../utils/ApiError.js";

const setAuditContext = async (client, userId) => {
  if (userId) {
    await client.query(`SELECT set_config('app.user_id', $1::text, true)`, [
      userId,
    ]);
  }
};

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

const sanitizeSearch = (value) => {
  if (!value) return null;
  return `%${value.trim().toLowerCase()}%`;
};

export const createExpenseCategoryService = async (client, data, userId) => {
  await setAuditContext(client, userId);
  const { category_name, is_active = true } = data;

  const exists = await client.query(
    `SELECT id FROM steel_erp.expense_categories WHERE LOWER(category_name) = LOWER($1)`,
    [category_name],
  );

  if (exists.rowCount) throw new ApiError(400, "Category already exists");

  const res = await client.query(
    `INSERT INTO steel_erp.expense_categories (category_name, is_active) VALUES ($1, $2) RETURNING *`,
    [category_name.trim(), is_active],
  );
  return res.rows[0];
};

export const getExpenseCategoriesService = async (client, query) => {
  const { page, limit, offset } = normalizePagination(query);
  const search = sanitizeSearch(query.search);
  const conditions = [];
  const values = [];

  if (search) {
    values.push(search);
    conditions.push(`LOWER(category_name) LIKE $${values.length}`);
  }
  if (query.is_active !== undefined) {
    values.push(query.is_active === "true" || query.is_active === true);
    conditions.push(`is_active = $${values.length}`);
  }

  const where =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const sortDir = normalizeSort(query.sort);

  const countRes = await client.query(
    `SELECT COUNT(*)::int AS total FROM steel_erp.expense_categories ${where}`,
    values,
  );
  const total = countRes.rows[0].total;

  values.push(limit, offset);
  const res = await client.query(
    `SELECT id, category_name, is_active, created_at, updated_at 
     FROM steel_erp.expense_categories ${where} 
     ORDER BY category_name ${sortDir} LIMIT $${values.length - 1} OFFSET $${values.length}`,
    values,
  );

  return { total, page, limit, rows: res.rows };
};

export const getExpenseCategoryByIdService = async (client, id) => {
  const res = await client.query(
    `SELECT * FROM steel_erp.expense_categories WHERE id = $1`,
    [id],
  );
  if (!res.rowCount) throw new ApiError(404, "Category not found");
  return res.rows[0];
};
export const updateExpenseCategoryService = async (
  client,
  id,
  data,
  userId,
) => {
  await setAuditContext(client, userId);

  const { category_name, is_active } = data;

  if (category_name) {
    const exists = await client.query(
      `SELECT id FROM steel_erp.expense_categories WHERE LOWER(category_name) = LOWER($1) AND id <> $2`,
      [category_name, id],
    );
    if (exists.rowCount)
      throw new ApiError(400, "Another category with this name already exists");
  }

  const res = await client.query(
    `UPDATE steel_erp.expense_categories 
     SET category_name = COALESCE($1, category_name), is_active = COALESCE($2, is_active), updated_at = now()
     WHERE id = $3 RETURNING *`,
    [category_name?.trim(), is_active, id],
  );
  if (!res.rowCount) throw new ApiError(404, "Category not found");
  return res.rows[0];
};

export const deleteExpenseCategoryService = async (client, id, userId) => {
  await setAuditContext(client, userId);

  const used = await client.query(
    `SELECT id FROM steel_erp.expenses WHERE category_id = $1 LIMIT 1`,
    [id],
  );
  if (used.rowCount)
    throw new ApiError(
      400,
      "Cannot delete category: Expenses exist under this category.",
    );

  const res = await client.query(
    `DELETE FROM steel_erp.expense_categories WHERE id = $1 RETURNING id`,
    [id],
  );
  if (!res.rowCount) throw new ApiError(404, "Category not found");
  return { message: "Category deleted successfully" };
};

const buildExpenseFilters = (query) => {
  const { category_id, search, start_date, end_date, date_filter } = query;
  const conditions = [];
  const values = [];

  if (category_id) {
    values.push(category_id);
    conditions.push(`e.category_id = $${values.length}`);
  }

  if (search) {
    values.push(`%${search.trim()}%`);
    conditions.push(`LOWER(e.reason) LIKE LOWER($${values.length})`);
  }

  switch (date_filter) {
    case "today":
      conditions.push(`e.expense_date = CURRENT_DATE`);
      break;
    case "yesterday":
      conditions.push(`e.expense_date = CURRENT_DATE - INTERVAL '1 day'`);
      break;
    case "nextday":
      conditions.push(`e.expense_date = CURRENT_DATE + INTERVAL '1 day'`);
      break;
    case "week":
      conditions.push(
        `date_trunc('week', e.expense_date) = date_trunc('week', CURRENT_DATE)`,
      );
      break;
    case "month":
      conditions.push(
        `date_trunc('month', e.expense_date) = date_trunc('month', CURRENT_DATE)`,
      );
      break;
    case "custom":
    default:
      if (start_date) {
        values.push(start_date);
        conditions.push(`e.expense_date >= $${values.length}`);
      }
      if (end_date) {
        values.push(end_date);
        conditions.push(`e.expense_date <= $${values.length}`);
      }
      break;
  }

  const where =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  return { where, values };
};

export const createExpenseService = async (client, data, userId) => {
  await setAuditContext(client, userId);

  const { expense_date, category_id, amount, reason } = data;

  const category = await client.query(
    `SELECT id FROM steel_erp.expense_categories WHERE id = $1 AND is_active = true`,
    [category_id],
  );
  if (!category.rowCount)
    throw new ApiError(400, "Invalid or inactive category selected");

  const res = await client.query(
    `INSERT INTO steel_erp.expenses (expense_date, category_id, amount, reason, created_by) 
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [expense_date, category_id, amount, reason.trim(), userId],
  );
  return res.rows[0];
};

export const getExpensesService = async (client, query) => {
  const { page, limit, offset } = normalizePagination(query);
  const sort = normalizeSort(query.sort);
  const { where, values } = buildExpenseFilters(query);

  const countRes = await client.query(
    `SELECT COUNT(*)::int AS total FROM steel_erp.expenses e ${where}`,
    values,
  );
  const total = countRes.rows[0].total;

  values.push(limit, offset);
  const res = await client.query(
    `SELECT e.id, e.expense_date, e.amount, e.reason, e.created_at, c.id AS category_id, c.category_name 
     FROM steel_erp.expenses e 
     JOIN steel_erp.expense_categories c ON c.id = e.category_id 
     ${where} ORDER BY e.expense_date ${sort}, e.id DESC LIMIT $${values.length - 1} OFFSET $${values.length}`,
    values,
  );

  return { total, page, limit, rows: res.rows };
};

export const getExpenseByIdService = async (client, id) => {
  const res = await client.query(
    `SELECT e.*, c.category_name FROM steel_erp.expenses e 
     JOIN steel_erp.expense_categories c ON c.id = e.category_id WHERE e.id = $1`,
    [id],
  );
  if (!res.rowCount) throw new ApiError(404, "Expense not found");
  return res.rows[0];
};

export const updateExpenseService = async (client, id, data, userId) => {
  await setAuditContext(client, userId);

  const { expense_date, category_id, amount, reason } = data;

  if (category_id) {
    const category = await client.query(
      `SELECT id FROM steel_erp.expense_categories WHERE id = $1`,
      [category_id],
    );
    if (!category.rowCount)
      throw new ApiError(400, "Invalid category selected");
  }

  const res = await client.query(
    `UPDATE steel_erp.expenses 
     SET expense_date = COALESCE($1, expense_date), category_id = COALESCE($2, category_id), 
         amount = COALESCE($3, amount), reason = COALESCE($4, reason)
     WHERE id = $5 RETURNING *`,
    [expense_date, category_id, amount, reason?.trim(), id],
  );

  if (!res.rowCount) throw new ApiError(404, "Expense not found");
  return res.rows[0];
};

export const deleteExpenseService = async (client, id, userId) => {
  await setAuditContext(client, userId);

  const res = await client.query(
    `DELETE FROM steel_erp.expenses WHERE id = $1 RETURNING id`,
    [id],
  );
  if (!res.rowCount) throw new ApiError(404, "Expense not found");
  return { message: "Expense deleted successfully" };
};

export const getExpenseSummaryService = async (client, query = {}) => {
  const { category_id } = query;
  const conditions = [];
  const values = [];

  if (category_id) {
    values.push(category_id);
    conditions.push(`category_id = $${values.length}`);
  }

  const where =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const res = await client.query(
    `
    SELECT
      COALESCE(SUM(CASE WHEN expense_date = CURRENT_DATE THEN amount END), 0) AS today_total,
      COALESCE(SUM(CASE WHEN expense_date = CURRENT_DATE - INTERVAL '1 day' THEN amount END), 0) AS yesterday_total,
      COALESCE(SUM(CASE WHEN date_trunc('week', expense_date) = date_trunc('week', CURRENT_DATE) THEN amount END), 0) AS week_total,
      COALESCE(SUM(CASE WHEN date_trunc('month', expense_date) = date_trunc('month', CURRENT_DATE) THEN amount END), 0) AS month_total,
      COALESCE(SUM(CASE WHEN date_trunc('year', expense_date) = date_trunc('year', CURRENT_DATE) THEN amount END), 0) AS year_total
    FROM steel_erp.expenses
    ${where}
  `,
    values,
  );

  return res.rows[0];
};

export const getExpenseCategorySummaryService = async (client, query) => {
  const { where, values } = buildExpenseFilters(query);
  const res = await client.query(
    `SELECT c.id, c.category_name, COALESCE(SUM(e.amount), 0) AS total 
     FROM steel_erp.expense_categories c 
     LEFT JOIN steel_erp.expenses e ON e.category_id = c.id ${where} 
     GROUP BY c.id ORDER BY total DESC`,
    values,
  );
  return res.rows;
};
