import { notFound, redirect } from "next/navigation";

import { getUser } from "@/app/actions/user";
import { PROTECTED_ADMIN_EMAIL } from "@/lib/constants";
import { PageHeader } from "@/components/shared/PageHeader";
import { UserForm } from "@/components/admin/UserForm";

export const dynamic = "force-dynamic";

export default async function EditUserPage({
  params,
}: {
  params: { id: string };
}) {
  const id = Number(params.id);
  if (Number.isNaN(id)) notFound();

  const user = await getUser(id);
  if (!user) notFound();

  // Akun admin utama tidak dapat diedit.
  if (user.email === PROTECTED_ADMIN_EMAIL) {
    redirect("/admin/users");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Edit User"
        description="Ubah role dan status akun pengguna."
      />

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <UserForm
          user={{
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            isActive: user.isActive,
          }}
        />
      </div>
    </div>
  );
}
