export const createRoleService = async (client, data) => {
  const result = await client.query(
    `INSERT INTO roles (role_name) VALUES ($1) RETURNING *`,
    [data.role_name],
  );
  return result.rows[0];
};

export const updateRoleService = async (client, roleId, data) => {
  const result = await client.query(
    `UPDATE roles SET role_name = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
    [data.role_name, roleId],
  );
  return result.rows[0];
};

export const deleteRoleService = async (client, roleId) => {
  const result = await client.query(
    `DELETE FROM roles WHERE id = $1 RETURNING id`,
    [roleId],
  );
  return result.rowCount > 0;
};

export const getRolesService = async (
  client,
  { page, limit, search, startDate, endDate },
) => {
  const offset = (page - 1) * limit;
  const values = [];
  let queryStr = `SELECT * FROM roles WHERE 1=1`;
  let countStr = `SELECT COUNT(*) FROM roles WHERE 1=1`;

  if (search) {
    values.push(`%${search}%`);
    const searchFilter = ` AND role_name ILIKE $${values.length}`;
    queryStr += searchFilter;
    countStr += searchFilter;
  }

  if (startDate && endDate) {
    values.push(startDate, endDate);
    const dateFilter = ` AND created_at BETWEEN $${values.length - 1} AND $${values.length}`;
    queryStr += dateFilter;
    countStr += dateFilter;
  }

  const countResult = await client.query(countStr, values);
  const total = parseInt(countResult.rows[0].count, 10);

  values.push(limit, offset);
  queryStr += ` ORDER BY id DESC LIMIT $${values.length - 1} OFFSET $${values.length}`;

  const result = await client.query(queryStr, values);

  return {
    data: result.rows,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
};

export const getModulesService = async (client) => {
  const result = await client.query(
    `SELECT module_code, module_name FROM modules ORDER BY module_name`,
  );
  return result.rows;
};

export const assignPermissionsToRoleService = async (
  client,
  roleId,
  permissions,
) => {
  await client.query(`DELETE FROM role_module_permissions WHERE role_id = $1`, [
    roleId,
  ]);

  if (permissions.length === 0) return { message: "Role permissions cleared" };

  const moduleCodes = permissions.map((p) => p.module_code);
  const canAdds = permissions.map((p) => p.can_add);
  const canEdits = permissions.map((p) => p.can_edit);
  const canDeletes = permissions.map((p) => p.can_delete);
  const canViews = permissions.map((p) => p.can_view);

  await client.query(
    `
    INSERT INTO role_module_permissions (role_id, module_code, can_add, can_edit, can_delete, can_view)
    SELECT $1, * FROM UNNEST($2::text[], $3::boolean[], $4::boolean[], $5::boolean[], $6::boolean[])
    `,
    [roleId, moduleCodes, canAdds, canEdits, canDeletes, canViews],
  );

  return { message: "Role permissions updated successfully" };
};

export const getRolePermissionsService = async (client, roleId) => {
  const result = await client.query(
    `
    SELECT rmp.module_code, m.module_name, rmp.can_add, rmp.can_edit, rmp.can_delete, rmp.can_view
    FROM role_module_permissions rmp
    JOIN modules m ON m.module_code = rmp.module_code
    WHERE rmp.role_id = $1
    `,
    [roleId],
  );
  return result.rows;
};

export const assignRolesToUserService = async (client, userId, roleIds) => {
  await client.query(`DELETE FROM user_roles WHERE user_id = $1`, [userId]);

  if (roleIds.length > 0) {
    await client.query(
      `INSERT INTO user_roles (user_id, role_id) SELECT $1, * FROM UNNEST($2::int[])`,
      [userId, roleIds], // Change int[] to uuid[] if your role IDs are UUIDs
    );
  }

  return { message: "Roles assigned to user successfully" };
};

export const getUsersWithRolesService = async (
  client,
  { page, limit, search },
) => {
  const offset = (page - 1) * limit;
  const values = [];
  let queryStr = `
    SELECT u.id as user_id, u.username, u.email,
           COALESCE(
             json_agg(json_build_object('role_id', r.id, 'role_name', r.role_name)) FILTER (WHERE r.id IS NOT NULL), 
             '[]'
           ) as assigned_roles
    FROM users u
    LEFT JOIN user_roles ur ON u.id = ur.user_id
    LEFT JOIN roles r ON ur.role_id = r.id
  `;

  if (search) {
    values.push(`%${search}%`);
    queryStr += ` WHERE u.username ILIKE $${values.length} OR u.email ILIKE $${values.length}`;
  }

  queryStr += ` GROUP BY u.id ORDER BY u.created_at DESC`;

  values.push(limit, offset);
  queryStr += ` LIMIT $${values.length - 1} OFFSET $${values.length}`;

  const result = await client.query(queryStr, values);
  return result.rows;
};
