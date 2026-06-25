import Link from "next/link";
import { getServerSession } from "next-auth";
import { ShieldAlert } from "lucide-react";

import { authOptions } from "@/lib/auth";
import { getDashboardUrl } from "@/lib/getDashboardUrl";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default async function UnauthorizedPage() {
  const session = await getServerSession(authOptions);
  const dashboardUrl = session?.user?.role
    ? getDashboardUrl(session.user.role)
    : "/login";

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md rounded-xl shadow-sm">
        <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <ShieldAlert className="h-6 w-6 text-destructive" />
          </div>
          <div className="space-y-1">
            <h1 className="text-lg font-semibold text-foreground">
              Akses Ditolak
            </h1>
            <p className="text-sm text-muted-foreground">
              Anda tidak memiliki akses ke halaman ini.
            </p>
          </div>
          <Button asChild className="w-full">
            <Link href={dashboardUrl}>Kembali ke Dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
