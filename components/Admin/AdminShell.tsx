"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  FilePlus2,
  FolderTree,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import SignOutButton from "./SignOutButton";

type AdminShellUser = {
  name: string;
  email: string;
  image?: string | null;
};

type AdminShellProps = {
  user: AdminShellUser;
  children: ReactNode;
};

const navigation = [
  {
    href: "/admin/analytics",
    label: "访问分析",
    icon: BarChart3,
  },
  {
    href: "/admin/articles",
    label: "文章管理",
    icon: FilePlus2,
  },
  {
    href: "/admin/comments",
    label: "评论审核",
    icon: MessageSquare,
  },
  {
    href: "/admin/categories",
    label: "文章分类",
    icon: FolderTree,
  },
] as const;

export default function AdminShell({ user, children }: AdminShellProps) {
  const pathname = usePathname();
  const avatarText = user.name.trim().charAt(0).toUpperCase() || "A";

  return (
    <div className="flex min-h-full w-full flex-col bg-neutral-100 dark:bg-neutral-950 lg:flex-row">
      <aside className="flex w-full shrink-0 flex-col border-r border-neutral-200 bg-white text-neutral-500 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-400 lg:sticky lg:top-0 lg:h-[calc(100dvh-3.5rem)] lg:w-64 lg:self-start">
        <div className="flex h-20 shrink-0 items-center gap-3 px-6">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-neutral-950 text-sm font-bold text-white dark:bg-white dark:text-neutral-950">
            W
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-neutral-950 dark:text-white">
              管理中心
            </p>
            <p className="truncate text-[11px] text-neutral-500 dark:text-neutral-500">
              xuexiswmz blog
            </p>
          </div>
        </div>

        <nav className="scrollbar-hide flex gap-1 overflow-x-auto px-3 pb-4 lg:min-h-0 lg:flex-1 lg:flex-col lg:overflow-y-auto lg:overflow-x-visible">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-neutral-950 text-white shadow-sm dark:bg-white dark:text-neutral-950"
                    : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-950 dark:text-neutral-400 dark:hover:bg-white/10 dark:hover:text-white",
                )}
              >
                <Icon className="size-4 shrink-0" aria-hidden="true" />
                <span className="whitespace-nowrap">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="shrink-0 border-t border-neutral-200 p-4 dark:border-white/10">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-sm font-semibold text-neutral-700 dark:bg-neutral-800 dark:text-white">
              {avatarText}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-neutral-950 dark:text-white">
                {user.name}
              </p>
              <p className="truncate text-xs text-neutral-500 dark:text-neutral-500">{user.email}</p>
            </div>
          </div>

          <SignOutButton variant="sidebar" />
        </div>
      </aside>

      <div className="min-w-0 flex-1 p-5 sm:p-6 lg:p-8">
        {children}
      </div>
    </div>
  );
}
