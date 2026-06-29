import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { roles } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-auth";
import {
  BUILTIN_ROLE_COLORS,
  BUILTIN_ROLE_NAMES,
  getBuiltinRolePermissionsMap,
  isBuiltinRole,
  normalizePermissions,
  PERMISSION_DEFS,
  saveBuiltinRolePermissions,
  type BuiltinRoleName,
} from "@/lib/permissions";
import { eq } from "drizzle-orm";

function builtinRoleRow(name: BuiltinRoleName, permissions: string[]) {
  return {
    id: `__${name}`,
    name,
    color: BUILTIN_ROLE_COLORS[name],
    permissions,
    builtin: true,
  };
}

export async function GET(req: Request) {
  if (!(await requireAdmin(req))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const db = getDb();
  const [builtinPerms, customRows] = await Promise.all([
    getBuiltinRolePermissionsMap(db),
    db.select().from(roles).orderBy(roles.name),
  ]);

  const builtinRoles = BUILTIN_ROLE_NAMES.map((name) =>
    builtinRoleRow(name, builtinPerms[name]),
  );

  const customRoles = customRows
    .filter((r) => !BUILTIN_ROLE_NAMES.includes(r.name as BuiltinRoleName))
    .map((r) => ({
      id: r.id,
      name: r.name,
      color: r.color,
      permissions: normalizePermissions(r.permissions),
      builtin: false,
    }));

  return NextResponse.json({
    permissionDefs: PERMISSION_DEFS,
    roles: [...builtinRoles, ...customRoles],
  });
}

export async function POST(req: Request) {
  if (!(await requireAdmin(req))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const color = typeof body.color === "string" ? body.color : "#ffffff";
  const permissions = normalizePermissions(body.permissions);

  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });
  if (isBuiltinRole(name)) {
    return NextResponse.json({ error: "Cannot create a built-in role name" }, { status: 400 });
  }

  const db = getDb();
  const [row] = await db
    .insert(roles)
    .values({ name, color, permissions })
    .returning();
  return NextResponse.json({ ...row, permissions, builtin: false }, { status: 201 });
}

export async function PATCH(req: Request) {
  if (!(await requireAdmin(req))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const db = getDb();

  if (typeof body.roleName === "string" && isBuiltinRole(body.roleName)) {
    const roleName: BuiltinRoleName = body.roleName;
    if (body.permissions !== undefined) {
      await saveBuiltinRolePermissions(db, roleName, normalizePermissions(body.permissions));
    }
    const builtin = await getBuiltinRolePermissionsMap(db);
    return NextResponse.json(builtinRoleRow(roleName, builtin[roleName]));
  }

  const { id } = body;
  if (!id) return NextResponse.json({ error: "id or roleName required" }, { status: 400 });

  const [existing] = await db.select().from(roles).where(eq(roles.id, id)).limit(1);
  if (!existing) return NextResponse.json({ error: "Role not found" }, { status: 404 });
  if (isBuiltinRole(existing.name)) {
    return NextResponse.json({ error: "Built-in roles cannot be edited here" }, { status: 400 });
  }

  const [row] = await db
    .update(roles)
    .set({
      ...(typeof body.name === "string" ? { name: body.name.trim() } : {}),
      ...(typeof body.color === "string" ? { color: body.color } : {}),
      ...(body.permissions !== undefined
        ? { permissions: normalizePermissions(body.permissions) }
        : {}),
    })
    .where(eq(roles.id, id))
    .returning();

  return NextResponse.json({ ...row, permissions: normalizePermissions(row.permissions), builtin: false });
}

export async function DELETE(req: Request) {
  if (!(await requireAdmin(req))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const db = getDb();
  await db.delete(roles).where(eq(roles.id, id));
  return NextResponse.json({ ok: true });
}
