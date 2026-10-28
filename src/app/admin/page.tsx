import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { AdminPanel } from "@/components/admin-panel";
import { Skeleton } from "@/components/ui/skeleton";
import { Wordmark } from "@/components/wordmark";
import { isAdmin } from "@/lib/admin-auth";
import { getAdminData } from "@/lib/admin-data";

async function Content() {
  if (!(await isAdmin())) redirect("/");
  const data = await getAdminData();
  if (!data) {
    return <p className="py-20 text-center text-muted-foreground">تعذّر التحميل</p>;
  }
  return <AdminPanel data={data} />;
}

export default function AdminPage() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-4">
      <header className="grid h-20 grid-cols-3 items-center">
        <Link href="/" aria-label="الرئيسية" className="flex size-11 items-center justify-center rounded-full bg-secondary">
          <ArrowRight className="size-5" />
        </Link>
        <Wordmark className="justify-self-center text-3xl text-primary" />
      </header>
      <main className="flex-1 pb-10 pt-2">
        <Suspense fallback={<Skeleton className="h-72 rounded-3xl" />}>
          <Content />
        </Suspense>
      </main>
    </div>
  );
}
