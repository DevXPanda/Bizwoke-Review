"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuthActions } from "@convex-dev/auth/react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import {
  Home,
  Send,
  Users,
  User,
  BarChart,
  FileText,
  ClipboardList,
  HelpCircle,
  Settings,
  LogOut,
  AlertTriangle,
  Globe,
  CreditCard,
} from "lucide-react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { signOut } = useAuthActions();

  const user = useQuery(api.users.currentUser);

  useEffect(() => {
    if (user === null) {
      router.push("/login");
    }
  }, [user, router]);

  if (user === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#294a63]"></div>
      </div>
    );
  }

  if (user === null) {
    return null;
  }

  const handleLogout = async () => {
    await signOut();
    router.push("/login");
  };

  const normalizeRole = (role: string | undefined, sadmin?: number, admin?: number) => {
    if (role === "SUPER_ADMIN" || role === "sadmin" || sadmin === 1) {
      return "SUPER_ADMIN";
    }
    if (role === "BRANCH_ADMIN" || role === "admin" || admin === 1) {
      return "BRANCH_ADMIN";
    }
    return "BRANCH_USER";
  };

  const currentRole = normalizeRole(user.role, user.sadmin, user.admin);

  const navItems = [];
  if (currentRole === "SUPER_ADMIN") {
    navItems.push(
      { name: "Dashboard", href: "/dashboard", icon: Home },
      { name: "Platforms", href: "/platform", icon: Globe },
      { name: "Send Link", href: "/share", icon: Send },
      { name: "Manage Users", href: "/admin/users", icon: Users },
      { name: "Branch Management", href: "/admin/branches", icon: ClipboardList },
      { name: "My Account", href: "/account", icon: User },
      { name: "Report", href: "/report", icon: BarChart },
      { name: "Plans", href: "/admin/plans", icon: FileText },
      { name: "Pricing Management", href: "/admin/pricing", icon: CreditCard },
      { name: "Logs", href: "/admin/logs", icon: ClipboardList },
      { name: "Support", href: "/support", icon: HelpCircle },
      { name: "Settings", href: "/admin/settings", icon: Settings }
    );
  } else if (currentRole === "BRANCH_ADMIN") {
    navItems.push(
      { name: "Dashboard", href: "/dashboard", icon: Home },
      { name: "Platforms", href: "/platform", icon: Globe },
      { name: "Send Link", href: "/share", icon: Send },
      { name: "Manage Users", href: "/admin/users", icon: Users },
      { name: "My Account", href: "/account", icon: User },
      { name: "Report", href: "/report", icon: BarChart },
      { name: "Support", href: "/support", icon: HelpCircle }
    );
  } else if (currentRole === "BRANCH_USER") {
    navItems.push(
      { name: "Dashboard", href: "/dashboard", icon: Home },
      { name: "Report", href: "/report", icon: BarChart },
      { name: "Support", href: "/support", icon: HelpCircle }
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Top Navbar */}
      <header className="bg-[#294a63] text-white h-16 fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-4 shadow-md">
        <div className="flex items-center space-x-3">
          <Link href="/">
            <span className="text-xl font-extrabold tracking-wide">Bizorm Reviews</span>
          </Link>
        </div>

        <div className="flex items-center space-x-4">
          {user.sub === 0 && (
            <div className="flex items-center text-red-400 text-sm font-semibold space-x-1">
              <AlertTriangle className="h-4 w-4" />
              <span>Inactive subscription</span>
            </div>
          )}
          <Link href="/account" className="uppercase font-bold text-sm tracking-wider hover:underline">
            {user.uname}
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex flex-1 pt-16">
        {/* Sidebar */}
        <aside className="w-64 bg-[#294a63] text-white fixed top-16 bottom-0 left-0 z-20 border-t border-blue-900 shadow-lg">
          <nav className="mt-6 space-y-1 px-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`group flex items-center px-4 py-3 text-sm font-semibold rounded transition-colors ${
                    isActive
                      ? "bg-white text-[#294a63]"
                      : "text-blue-100 hover:bg-blue-900/40 hover:text-white"
                  }`}
                >
                  <Icon
                    className={`mr-3 h-5 w-5 ${
                      isActive ? "text-[#294a63]" : "text-blue-200 group-hover:text-white"
                    }`}
                  />
                  {item.name}
                </Link>
              );
            })}
            <button
              onClick={handleLogout}
              className="w-full group flex items-center px-4 py-3 text-sm font-semibold rounded text-red-300 hover:bg-red-900/20 hover:text-red-100 transition-colors mt-4"
            >
              <LogOut className="mr-3 h-5 w-5 text-red-400 group-hover:text-red-200" />
              Logout
            </button>
          </nav>
        </aside>

        {/* Content Area */}
        <main className="flex-1 pl-64 min-h-screen">
          <div className="py-6 px-8 max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
