"use client";

import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

type SignOutButtonProps = {
  variant?: "default" | "sidebar";
};

export default function SignOutButton({
  variant = "default",
}: SignOutButtonProps) {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSignOut() {
    setLoading(true);
    setError("");

    try {
      const result = await authClient.signOut();

      if (result.error) {
        setError(result.error.message ?? "退出登录失败");
        return;
      }

      router.replace("/admin/login");
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "退出登录失败");
    } finally {
      setLoading(false);
    }
  }

  const isSidebar = variant === "sidebar";

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={loading}
        onClick={handleSignOut}
        className={cn(
          "disabled:cursor-not-allowed disabled:opacity-50",
          isSidebar
            ? "flex w-full items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-700 transition-colors hover:bg-neutral-100 dark:border-white/10 dark:bg-white/5 dark:text-neutral-300 dark:hover:bg-white/10"
            : "rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-900",
        )}
      >
        {isSidebar && <LogOut className="size-4" aria-hidden="true" />}
        {loading ? "正在退出..." : "退出登录"}
      </button>

      {error && (
        <p
          role="alert"
          className={cn(
            "text-sm",
            isSidebar ? "text-rose-400" : "text-red-500",
          )}
        >
          {error}
        </p>
      )}
    </div>
  );
}
