"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useState } from "react";
import { Star, Download, Filter, Search } from "lucide-react";

export default function ReportPage() {
  const dashData = useQuery(api.reviews.getDashboardData);
  const formKey = dashData?.user?.formKey ?? "";
  const allRatings = useQuery(
    api.reviews.getUserRatings,
    formKey ? { formKey } : "skip"
  );

  const [starFilter, setStarFilter] = useState<number | "all">("all");
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  if (dashData === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#294a63]"></div>
      </div>
    );
  }

  if (dashData === null) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500 font-semibold">Failed to load session.</p>
      </div>
    );
  }

  const { platformSummary, totalReviews, averageRating } = dashData;
  const ratings = allRatings ?? [];

  // Apply filters
  const filteredRatings = ratings.filter((r) => {
    if (starFilter !== "all" && r.star !== starFilter) return false;
    if (platformFilter !== "all" && r.webName !== platformFilter) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      if (
        !r.name.toLowerCase().includes(term) &&
        !r.mobile.includes(term) &&
        !(r.review || "").toLowerCase().includes(term) &&
        !r.webName.toLowerCase().includes(term)
      ) {
        return false;
      }
    }
    return true;
  });

  // Sort by creation time desc
  const sortedRatings = [...filteredRatings].sort(
    (a, b) => b._creationTime - a._creationTime
  );

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ["Name", "Mobile", "Star", "Platform", "Review", "Date"];
    const rows = sortedRatings.map((r) => [
      r.name,
      r.mobile,
      r.star.toString(),
      r.webName,
      (r.review || "").replace(/,/g, ";"),
      new Date(r._creationTime).toLocaleDateString(),
    ]);

    const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bizorm_reviews_report.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between bg-white p-6 rounded-xl border border-gray-200/80 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Report</h1>
          <p className="text-gray-500 mt-1">View and export all review data.</p>
        </div>
        <div className="mt-4 md:mt-0">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-semibold rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-all"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-200/80 shadow-sm text-center">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Reviews</p>
          <p className="text-3xl font-bold text-gray-800 mt-1">{totalReviews}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-200/80 shadow-sm text-center">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Average Rating</p>
          <div className="flex items-center justify-center space-x-2 mt-1">
            <p className="text-3xl font-bold text-gray-800">{averageRating}</p>
            <Star className="w-6 h-6 text-amber-400 fill-current" />
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-200/80 shadow-sm text-center">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Filtered Results</p>
          <p className="text-3xl font-bold text-gray-800 mt-1">{sortedRatings.length}</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-sm flex flex-col md:flex-row gap-3">
        <div className="flex items-center space-x-2 flex-1">
          <Search className="w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search name, mobile, review..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#294a63]"
          />
        </div>
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={starFilter === "all" ? "all" : starFilter.toString()}
            onChange={(e) => setStarFilter(e.target.value === "all" ? "all" : Number(e.target.value))}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#294a63]"
          >
            <option value="all">All Stars</option>
            <option value="5">5 Star</option>
            <option value="4">4 Star</option>
            <option value="3">3 Star</option>
            <option value="2">2 Star</option>
            <option value="1">1 Star</option>
          </select>
          <select
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#294a63]"
          >
            <option value="all">All Platforms</option>
            {platformSummary.map((p) => (
              <option key={p.id} value={p.webName}>
                {p.webName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Review Table */}
      <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase">
              <tr>
                <th className="px-6 py-3.5">#</th>
                <th className="px-6 py-3.5">Name</th>
                <th className="px-6 py-3.5">Mobile</th>
                <th className="px-6 py-3.5">Rating</th>
                <th className="px-6 py-3.5">Platform</th>
                <th className="px-6 py-3.5">Review</th>
                <th className="px-6 py-3.5">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {sortedRatings.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-400 font-medium">
                    No reviews found matching the filters.
                  </td>
                </tr>
              ) : (
                sortedRatings.map((r, idx) => (
                  <tr key={r._id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 text-gray-400">{idx + 1}</td>
                    <td className="px-6 py-4 font-semibold text-gray-800">{r.name}</td>
                    <td className="px-6 py-4">{r.mobile}</td>
                    <td className="px-6 py-4">
                      <div className="flex text-amber-400">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3.5 h-3.5 ${i < r.star ? "fill-current" : "text-gray-200"}`}
                          />
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs font-semibold">{r.webName}</td>
                    <td className="px-6 py-4 text-gray-500 max-w-xs truncate" title={r.review || ""}>
                      {r.review || <span className="italic text-gray-300">No comment</span>}
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-400">
                      {new Date(r._creationTime).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
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
