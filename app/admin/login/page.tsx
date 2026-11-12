import AdminLoginForm from "@/components/Admin/AdminLoginForm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function AdminLoginPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session) {
    redirect("/admin");
  }

  return (
    <main className="flex min-h-[70vh] items-center justify-center p-6">
      <section className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-neutral-950 dark:text-neutral-100">
            管理员登录
          </h1>
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
            使用管理员邮箱和密码登录
          </p>
        </div>

        <div className="mt-6">
          <AdminLoginForm />
        </div>
      </section>
    </main>
  );
}
