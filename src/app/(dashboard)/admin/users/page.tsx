import { getUsers, type UserFilter } from "@/app/actions/user";
import { getBranches } from "@/app/actions/branch";
import { ALL_ROLES } from "@/lib/labels";
import type { RoleType } from "@prisma/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { UserFilters } from "@/components/admin/UserFilters";
import { UserTable } from "@/components/admin/UserTable";

export const dynamic = "force-dynamic";

export default async function UsersPage({
  searchParams,
}: {
  searchParams: { role?: string; branchId?: string; status?: string };
}) {
  const role =
    searchParams.role && ALL_ROLES.includes(searchParams.role as RoleType)
      ? (searchParams.role as RoleType)
      : undefined;
  const branchId = searchParams.branchId
    ? Number(searchParams.branchId)
    : undefined;

  const filter: UserFilter = {
    role,
    branchId: branchId && !Number.isNaN(branchId) ? branchId : undefined,
    status:
      searchParams.status === "active"
        ? "active"
        : searchParams.status === "inactive"
          ? "inactive"
          : undefined,
  };

  const [users, branches] = await Promise.all([
    getUsers(filter),
    getBranches(),
  ]);
  const branchOptions = branches.map((b) => ({ id: b.id, name: b.name }));

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Manajemen User"
        description="Kelola role dan status akun seluruh pengguna sistem."
      />

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <UserFilters branches={branchOptions} />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <UserTable users={users} />
      </div>
    </div>
  );
}
