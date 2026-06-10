"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { useState } from "react";
import { ClipboardList, Search } from "lucide-react";

export default function AdminLogsPage() {
  const user = useQuery(api.users.currentUser);
  const logs = useQuery(api.activity.getActivityLogs);

  const [searchTerm, setSearchTerm] = useState("");

  if (user === undefined || logs === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#294a63]"></div>
      </div>
    );
  }

  if (!user || user.sadmin !== 1) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500 font-semibold">Access Denied. Super Admin only.</p>
      </div>
    );
  }

  const filtered = (logs ?? []).filter((l) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (l.actionType || "").toLowerCase().includes(term) ||
      l.msg.toLowerCase().includes(term) ||
      l.actTime.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white p-6 rounded-xl border border-gray-200/80 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center space-x-2">
          <ClipboardList className="w-7 h-7 text-[#294a63]" />
          <span>Activity Logs</span>
        </h1>
        <p className="text-gray-500 mt-1">System-wide activity and audit log.</p>
      </div>

      <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-sm flex items-center space-x-2">
        <Search className="w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search logs..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#294a63]"
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase">
              <tr>
                <th className="px-6 py-3.5">#</th>
                <th className="px-6 py-3.5">Type</th>
                <th className="px-6 py-3.5">Message</th>
                <th className="px-6 py-3.5">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-400">
                    No logs found.
                  </td>
                </tr>
              ) : (
                filtered.map((log, idx) => (
                  <tr key={log._id} className="hover:bg-gray-50/50">
                    <td className="px-6 py-4 text-gray-400">{idx + 1}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 text-xs font-semibold rounded ${
                        (log.actionType || "").includes("SUCCESS") || (log.actionType || "").includes("CREATE") 
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                          : (log.actionType || "").includes("FAILED") || (log.actionType || "").includes("DELETE")
                          ? "bg-red-50 text-red-700 border border-red-100" 
                          : (log.actionType || "").includes("WARNING")
                          ? "bg-amber-50 text-amber-700 border border-amber-100" 
                          : "bg-blue-50 text-blue-700 border border-blue-100"
                      }`}>
                        {log.actionType || "INFO"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600 max-w-lg truncate" title={log.msg}>
                      {log.msg}
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-400 whitespace-nowrap">
                      {log.actTime}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
