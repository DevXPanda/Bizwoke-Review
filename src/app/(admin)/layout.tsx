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
  AlertTriangle
} from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { signOut } = useAuthActions();

  const user = useQuery(api.users.currentUser);

  useEffect(() => {
    if (user === null) {
      router.push("/login");
    } else if (user) {
      const isBothAdmin = user.sadmin === 1 || user.admin === 1;
      if (!isBothAdmin) {
        router.push("/dashboard");
        return;
      }

      // Check strict sadmin routes
      const isSadminRoute =
        pathname.startsWith("/admin/plans") ||
        pathname.startsWith("/admin/logs") ||
        pathname.startsWith("/admin/settings");

      if (isSadminRoute && user.sadmin !== 1) {
        router.push("/admin/users");
      }
    }
  }, [user, pathname, router]);

  if (user === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#294a63]"></div>
      </div>
    );
  }

  if (user === null || (user.sadmin !== 1 && user.admin !== 1)) {
    return null;
  }

  const handleLogout = async () => {
    await signOut();
    router.push("/login");
  };

  const showManageUsers = user.sadmin === 1 || user.admin === 1;
  const showPlans = user.sadmin === 1;
  const showLogs = user.sadmin === 1;
  const showSettings = user.sadmin === 1;

  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: Home },
    { name: "Send Link", href: "/share", icon: Send },
    ...(showManageUsers ? [{ name: "Manage Users", href: "/admin/users", icon: Users }] : []),
    { name: "My Account", href: "/account", icon: User },
    { name: "Report", href: "/report", icon: BarChart },
    ...(showPlans ? [{ name: "Plans", href: "/admin/plans", icon: FileText }] : []),
    ...(showLogs ? [{ name: "Logs", href: "/admin/logs", icon: ClipboardList }] : []),
    { name: "Support", href: "/support", icon: HelpCircle },
    ...(showSettings ? [{ name: "Settings", href: "/admin/settings", icon: Settings }] : []),
  ];

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Top Navbar */}
      <header className="bg-[#294a63] text-white h-16 fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-4 shadow-md">
        <div className="flex items-center space-x-3">
          <Link href="/">
            <span className="text-xl font-extrabold tracking-wide">Bizorm Reviews (Admin Panel)</span>
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
