"use client";

import { logger } from "@/utils/logger";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useEffect, useState, useRef } from "react";
import { 
  Star, 
  MessageSquare, 
  Smartphone, 
  Mail, 
  Share2, 
  Globe, 
  CheckCircle, 
  AlertTriangle,
  Code,
  Copy,
  QrCode,
  Download,
  ChevronLeft,
  ChevronRight,
  X,
  Building,
  CreditCard,
  User,
  Calendar,
  Clock,
  ArrowRight
} from "lucide-react";
import QRCode from "qrcode";
import { Id } from "../../../../convex/_generated/dataModel";

export default function DashboardPage() {
  const data = useQuery(api.reviews.getDashboardData);
  const generateFrameMutation = useMutation(api.reviews.generateFrame);
  const currentUser = useQuery(api.users.currentUser);

  const normalizeRole = (role: string | undefined, sadmin?: number, admin?: number) => {
    if (role === "SUPER_ADMIN" || role === "sadmin" || sadmin === 1) {
      return "SUPER_ADMIN";
    }
    if (role === "BRANCH_ADMIN" || role === "admin" || admin === 1) {
      return "BRANCH_ADMIN";
    }
    return "BRANCH_USER";
  };

  const currentRole = currentUser ? normalizeRole(currentUser.role, currentUser.sadmin, currentUser.admin) : "BRANCH_USER";
  const isReadOnly = currentRole === "BRANCH_USER";

  const branchSummary = useQuery(
    api.branches.getBranchDashboardSummary,
    currentRole === "SUPER_ADMIN" ? {} : "skip"
  );

  // States for widgets
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [frameCode, setFrameCode] = useState<string>("");
  const [qrUrl, setQrUrl] = useState<string>("");
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedFrame, setCopiedFrame] = useState(false);
  const [generatingFrame, setGeneratingFrame] = useState(false);

  // Super Admin Branch states
  const [selectedBranchId, setSelectedBranchId] = useState<Id<"branches"> | null>(null);
  const branchSliderRef = useRef<HTMLDivElement>(null);

  const scrollLeft = () => {
    branchSliderRef.current?.scrollBy({ left: -300, behavior: "smooth" });
  };
  const scrollRight = () => {
    branchSliderRef.current?.scrollBy({ left: 300, behavior: "smooth" });
  };
  // Generate QR Code once user info is loaded
  useEffect(() => {
    if (data?.user?.formKey) {
      const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
      const reviewUrl = `${baseUrl}/wtr/${data.user.formKey}`;
      QRCode.toDataURL(reviewUrl, { width: 300, margin: 2 })
        .then((url) => setQrUrl(url))
        .catch((err) => console.error("Error generating QR code:", err));
    }
  }, [data]);

  if (data === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#294a63]"></div>
      </div>
    );
  }

  if (data === null) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500 font-semibold">Failed to load session or unauthorized.</p>
      </div>
    );
  }

  const {
    totalReviews,
    averageRating,
    starDistribution,
    platformSummary,
    recentReviews,
    quota,
    user,
    monthlyRatings,
  } = data;

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const reviewLink = `${baseUrl}/wtr/${user.formKey}`;

  // Handle Copy Link
  const handleCopyLink = () => {
    navigator.clipboard.writeText(reviewLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Handle Download QR Code
  const handleDownloadQr = () => {
    if (!qrUrl) return;
    const a = document.createElement("a");
    a.href = qrUrl;
    a.download = `${user.formKey}_qr.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Handle frame generation
  const handleGenerateFrame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedPlatforms.length === 0) return;

    setGeneratingFrame(true);
    try {
      const res = await generateFrameMutation({
        userId: user.id,
        formKey: user.formKey,
        platforms: selectedPlatforms as any[],
      });
      if (res.success && res.frameId) {
        const frameLink = `${baseUrl}/pf/${res.frameId}`;
        const code = `<iframe width="100%" height="100" src="${frameLink}" frameborder="0" allowfullscreen></iframe>`;
        setFrameCode(code);
      }
    } catch (err) {
      console.error("Error generating iframe frame:", err);
    } finally {
      setGeneratingFrame(false);
    }
  };

  const handleCopyFrame = () => {
    navigator.clipboard.writeText(frameCode);
    setCopiedFrame(true);
    setTimeout(() => setCopiedFrame(false), 2000);
  };

  // Calculate SVG charts
  const maxMonthlyCount = Math.max(...monthlyRatings.map((m) => m.count), 1);
  const chartPoints = monthlyRatings
    .map((m, index) => {
      const x = (index / 11) * 380 + 40;
      const y = 160 - (m.count / maxMonthlyCount) * 110;
      return `${x},${y}`;
    })
    .join(" ");

  const distributionTotal = Object.values(starDistribution).reduce((a, b) => a + b, 0) || 1;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between bg-white p-6 rounded-xl border border-gray-200/80 shadow-sm transition-all duration-300">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Welcome back, {user.uname}</h1>
          <p className="text-gray-500 mt-1">Manage your review platforms and monitor overall customer feedback.</p>
        </div>
        <div className="mt-4 md:mt-0 flex items-center space-x-3">
          {user.sub === 1 ? (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle className="w-3.5 h-3.5 mr-1" />
              Active Subscription
            </span>
          ) : (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
              <AlertTriangle className="w-3.5 h-3.5 mr-1" />
              Inactive Subscription
            </span>
          )}
        </div>
      </div>

      {/* Super Admin Branch Overview Bar */}
      {currentRole === "SUPER_ADMIN" && branchSummary && branchSummary.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-base font-bold text-gray-800 flex items-center space-x-2">
            <span>Branch Summaries</span>
            <span className="text-xs text-gray-400 font-normal">({branchSummary.length} active branches)</span>
          </h2>
          <div className="relative flex items-center group">
            {/* Left navigation arrow */}
            <button
              onClick={scrollLeft}
              className="absolute -left-4 bg-white p-2 border border-gray-200 rounded-full shadow-md hover:bg-gray-50 z-10 focus:outline-none opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronLeft className="w-4 h-4 text-gray-655" />
            </button>

            {/* Horizontally scrollable list */}
            <div
              ref={branchSliderRef}
              className="flex-1 flex gap-5 overflow-x-auto scrollbar-hide py-2 px-1 scroll-smooth"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {branchSummary.map((b) => (
                <div
                  key={b.branchId}
                  onClick={() => setSelectedBranchId(b.branchId)}
                  className="bg-white min-w-[280px] p-5 rounded-xl border border-gray-200/80 shadow-sm hover:shadow-md hover:border-gray-300 transition-all cursor-pointer flex flex-col justify-between space-y-4 animate-fade-in"
                >
                  <div className="flex items-start justify-between">
                    <h3 className="font-bold text-gray-850 text-sm truncate max-w-[170px]" title={b.branchName}>
                      {b.branchName}
                    </h3>
                    <span className="text-[10px] font-mono font-bold text-[#294a63] bg-blue-50/80 px-2 py-0.5 rounded border border-blue-100/50 uppercase">
                      {b.branchCode}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="block text-gray-450 text-[10px] uppercase font-semibold">Reviews</span>
                      <strong className="text-gray-750 text-sm">{b.totalReviews}</strong>
                    </div>
                    <div>
                      <span className="block text-gray-450 text-[10px] uppercase font-semibold">Avg Rating</span>
                      <div className="flex items-center text-amber-500 space-x-0.5">
                        <strong className="text-gray-750 text-sm mr-1">{b.averageRating}</strong>
                        <Star className="w-3 h-3 fill-current" />
                      </div>
                    </div>
                    <div>
                      <span className="block text-gray-450 text-[10px] uppercase font-semibold">Platforms</span>
                      <strong className="text-gray-750 text-sm">{b.activePlatforms} active</strong>
                    </div>
                    <div>
                      <span className="block text-gray-450 text-[10px] uppercase font-semibold">Users</span>
                      <strong className="text-gray-750 text-sm">{b.totalUsers}</strong>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-gray-50">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        b.status === "Active"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                          : "bg-gray-50 text-gray-500 border-gray-250"
                      }`}
                    >
                      {b.status}
                    </span>
                    <span className="text-[10px] text-[#294a63] font-semibold flex items-center hover:underline">
                      Drill-down <ArrowRight className="w-3 h-3 ml-0.5" />
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Right navigation arrow */}
            <button
              onClick={scrollRight}
              className="absolute -right-4 bg-white p-2 border border-gray-200 rounded-full shadow-md hover:bg-gray-50 z-10 focus:outline-none opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronRight className="w-4 h-4 text-gray-655" />
            </button>
          </div>
        </div>
      )}

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200/80 shadow-sm flex items-center space-x-5 hover:shadow-md transition-shadow">
          <div className="p-3.5 bg-blue-50 text-[#294a63] rounded-lg">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-400 uppercase tracking-wider">Total Reviews</p>
            <h3 className="text-2xl font-bold text-gray-800 mt-0.5">{totalReviews}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200/80 shadow-sm flex items-center space-x-5 hover:shadow-md transition-shadow">
          <div className="p-3.5 bg-amber-50 text-amber-500 rounded-lg">
            <Star className="w-6 h-6 fill-current" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-400 uppercase tracking-wider">Average Rating</p>
            <div className="flex items-center space-x-2 mt-0.5">
              <h3 className="text-2xl font-bold text-gray-800">{averageRating}</h3>
              <div className="flex text-amber-400">
                {[...Array(5)].map((_, i) => (
                  <Star 
                    key={i} 
                    className={`w-4 h-4 ${i < Math.round(averageRating) ? "fill-current" : "text-gray-300"}`} 
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200/80 shadow-sm flex items-center space-x-5 hover:shadow-md transition-shadow">
          <div className="p-3.5 bg-purple-50 text-purple-600 rounded-lg">
            <Globe className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-400 uppercase tracking-wider">Active Platforms</p>
            <h3 className="text-2xl font-bold text-gray-800 mt-0.5">{platformSummary.length}</h3>
          </div>
        </div>
      </div>

      {/* Quota Summary Section */}
      <div className="bg-white p-6 rounded-xl border border-gray-200/80 shadow-sm">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Remaining Quota Summary</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-gray-50/70 border border-gray-150 rounded-lg text-center">
            <Smartphone className="w-5 h-5 mx-auto text-sky-600 mb-2" />
            <p className="text-xs text-gray-400 font-medium">SMS Quota</p>
            <p className="text-lg font-bold text-gray-700 mt-1">{quota?.smsQuota ?? 0}</p>
          </div>
          <div className="p-4 bg-gray-50/70 border border-gray-150 rounded-lg text-center">
            <Mail className="w-5 h-5 mx-auto text-emerald-600 mb-2" />
            <p className="text-xs text-gray-400 font-medium">Email Quota</p>
            <p className="text-lg font-bold text-gray-700 mt-1">{quota?.emailQuota ?? 0}</p>
          </div>
          <div className="p-4 bg-gray-50/70 border border-gray-150 rounded-lg text-center">
            <Share2 className="w-5 h-5 mx-auto text-green-600 mb-2" />
            <p className="text-xs text-gray-400 font-medium">WhatsApp Quota</p>
            <p className="text-lg font-bold text-gray-700 mt-1">{quota?.whatsappQuota ?? 0}</p>
          </div>
          <div className="p-4 bg-gray-50/70 border border-gray-150 rounded-lg text-center">
            <Globe className="w-5 h-5 mx-auto text-indigo-600 mb-2" />
            <p className="text-xs text-gray-400 font-medium">Web platforms</p>
            <p className="text-lg font-bold text-gray-700 mt-1">{quota?.webQuota ?? 0}</p>
          </div>
        </div>
      </div>

      {/* Analytics Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Star distribution */}
        <div className="bg-white p-6 rounded-xl border border-gray-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-800">Star Rating Distribution</h2>
            <p className="text-xs text-gray-400 mt-0.5">Breakdown of customer rating volume.</p>
          </div>
          <div className="space-y-3 mt-6">
            {([5, 4, 3, 2, 1] as const).map((stars) => {
              const count = starDistribution[stars] || 0;
              const percentage = Math.round((count / distributionTotal) * 100);
              return (
                <div key={stars} className="flex items-center text-sm">
                  <span className="w-12 text-gray-500 font-medium">{stars} Star</span>
                  <div className="flex-1 mx-4 bg-gray-100 rounded-full h-2.5 overflow-hidden">
                    <div 
                      className="bg-amber-400 h-2.5 rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                  <span className="w-8 text-right text-gray-600 font-semibold">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Monthly volume area chart */}
        <div className="bg-white p-6 rounded-xl border border-gray-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-800">Monthly Rating Trend</h2>
            <p className="text-xs text-gray-400 mt-0.5">Rating activity volume over the months.</p>
          </div>
          <div className="mt-6 flex justify-center items-center">
            <svg viewBox="0 0 450 200" className="w-full h-auto">
              <defs>
                <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#294a63" stopOpacity="0.4"/>
                  <stop offset="100%" stopColor="#294a63" stopOpacity="0.0"/>
                </linearGradient>
              </defs>
              {/* Grid Lines */}
              <line x1="40" y1="50" x2="420" y2="50" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="40" y1="105" x2="420" y2="105" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="40" y1="160" x2="420" y2="160" stroke="#e2e8f0" strokeWidth="1" />

              {/* Area Path under line */}
              <path
                d={`M 40,160 L ${chartPoints} L 420,160 Z`}
                fill="url(#areaGradient)"
              />

              {/* Line path */}
              <polyline
                fill="none"
                stroke="#294a63"
                strokeWidth="2.5"
                points={chartPoints}
              />

              {/* Data points */}
              {monthlyRatings.map((m, idx) => {
                const x = (idx / 11) * 380 + 40;
                const y = 160 - (m.count / maxMonthlyCount) * 110;
                return (
                  <circle
                    key={idx}
                    cx={x}
                    cy={y}
                    r="3.5"
                    className="fill-white stroke-[#294a63] stroke-2 hover:r-5 cursor-pointer transition-all"
                  />
                );
              })}

              {/* X Axis Labels */}
              {monthlyRatings.map((m, idx) => {
                const x = (idx / 11) * 380 + 40;
                return (
                  <text
                    key={idx}
                    x={x}
                    y="180"
                    textAnchor="middle"
                    className="text-[10px] fill-gray-400 font-medium font-sans"
                  >
                    {m.month}
                  </text>
                );
              })}
            </svg>
          </div>
        </div>
      </div>

      {/* Widgets & Platforms Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column (Widgets: QR Code & Frame) */}
        <div className="lg:col-span-1 space-y-6">
          {/* Share widget */}
          <div className="bg-white p-6 rounded-xl border border-gray-200/80 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-gray-800">Your Share Link</h2>
            <div className="flex space-x-2">
              <input
                type="text"
                readOnly
                value={reviewLink}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-600 focus:outline-none"
              />
              <button 
                onClick={handleCopyLink}
                className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-500 hover:text-gray-700 relative transition-colors"
                title="Copy Link"
              >
                <Copy className="w-5 h-5" />
                {copiedLink && (
                  <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-[10px] py-1 px-1.5 rounded shadow">
                    Copied!
                  </span>
                )}
              </button>
            </div>
            {qrUrl && (
              <div className="flex flex-col items-center pt-2 space-y-3">
                <div className="p-2 bg-gray-50 rounded-xl border border-gray-100">
                  <img src={qrUrl} alt="Review QR Code" className="w-36 h-36" />
                </div>
                <button
                  onClick={handleDownloadQr}
                  className="flex items-center text-xs font-semibold text-[#294a63] hover:text-blue-900 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Download className="w-3.5 h-3.5 mr-1" />
                  Download QR Code
                </button>
              </div>
            )}
          </div>

          {/* Iframe widget */}
          <div className="bg-white p-6 rounded-xl border border-gray-200/80 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-gray-800">Iframe Frame Code</h2>
            <form onSubmit={handleGenerateFrame} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                  Select Platforms
                </label>
                {platformSummary.length === 0 ? (
                  <p className="text-sm text-gray-500">No platforms created yet.</p>
                ) : (
                  <div className="max-h-36 overflow-y-auto space-y-2 border border-gray-150 p-2 rounded-lg bg-gray-50/50">
                    {platformSummary.map((p) => (
                      <label key={p.id} className="flex items-center space-x-2 text-sm text-gray-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedPlatforms.includes(p.id)}
                          disabled={isReadOnly}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedPlatforms([...selectedPlatforms, p.id]);
                            } else {
                              setSelectedPlatforms(selectedPlatforms.filter((id) => id !== p.id));
                            }
                          }}
                          className="rounded text-[#294a63] focus:ring-[#294a63]"
                        />
                        <span>{p.webName}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              <button
                type="submit"
                disabled={generatingFrame || selectedPlatforms.length === 0 || isReadOnly}
                className="w-full bg-[#294a63] text-white py-2 rounded-lg hover:bg-opacity-95 text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isReadOnly ? "Read-Only Access" : generatingFrame ? "Generating..." : "Generate Code"}
              </button>
            </form>

            {frameCode && (
              <div className="pt-2 space-y-2">
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Paste this code in your site
                </label>
                <div className="flex space-x-2">
                  <textarea
                    readOnly
                    rows={2}
                    value={frameCode}
                    className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs bg-gray-50 text-gray-600 focus:outline-none font-mono"
                  />
                  <button 
                    onClick={handleCopyFrame}
                    className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-500 hover:text-gray-700 relative self-start transition-colors"
                    title="Copy Frame Code"
                  >
                    <Copy className="w-5 h-5" />
                    {copiedFrame && (
                      <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-[10px] py-1 px-1.5 rounded shadow">
                        Copied!
                      </span>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right columns (Platform list & recent reviews) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Platform Summary Table */}
          <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-800">Platform Summaries</h2>
                <p className="text-xs text-gray-400 mt-0.5">Performances by review website channels.</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase">
                  <tr>
                    <th className="px-6 py-3.5">Platform</th>
                    <th className="px-6 py-3.5">Reviews</th>
                    <th className="px-6 py-3.5">Avg Rating</th>
                    <th className="px-6 py-3.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700">
                  {platformSummary.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-gray-400 font-medium">
                        No platforms configured yet. Add some platform links!
                      </td>
                    </tr>
                  ) : (
                    platformSummary.map((p) => (
                      <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4 font-semibold text-gray-800">{p.webName}</td>
                        <td className="px-6 py-4">{p.totalRatings}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-1">
                            <span className="font-semibold">{p.averageRating}</span>
                            <Star className="w-3.5 h-3.5 text-amber-400 fill-current" />
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {p.active === 1 ? (
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded border border-emerald-100">
                              Active
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-gray-50 text-gray-500 text-xs font-semibold rounded border border-gray-200">
                              Disabled
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Reviews Table */}
          <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-800">Recent Customer Reviews</h2>
              <p className="text-xs text-gray-400 mt-0.5">Latest feedback submissions received.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase">
                  <tr>
                    <th className="px-6 py-3.5">Reviewer</th>
                    <th className="px-6 py-3.5">Rating</th>
                    <th className="px-6 py-3.5">Platform</th>
                    <th className="px-6 py-3.5">Comments</th>
                    <th className="px-6 py-3.5">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700">
                  {recentReviews.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-400 font-medium">
                        No reviews submitted yet.
                      </td>
                    </tr>
                  ) : (
                    recentReviews.map((r) => (
                      <tr key={r._id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-semibold text-gray-800">{r.name}</div>
                          <div className="text-xs text-gray-400">{r.mobile}</div>
                        </td>
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
                        <td className="px-6 py-4 text-xs font-semibold text-gray-600">{r.webName}</td>
                        <td className="px-6 py-4 text-gray-500 max-w-xs truncate" title={r.review}>
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
      </div>
      {/* Detail Drawer overlay */}
      {selectedBranchId && (
        <BranchDetailDrawer
          branchId={selectedBranchId}
          onClose={() => setSelectedBranchId(null)}
        />
      )}
    </div>
  );
}

// ==========================================
// Branch Detail Drill-Down Drawer Component
// ==========================================
interface BranchDetailDrawerProps {
  branchId: Id<"branches">;
  onClose: () => void;
}

type BranchTab =
  | "overview"
  | "analytics"
  | "platforms"
  | "users"
  | "campaigns"
  | "reviews"
  | "logs";

function BranchDetailDrawer({ branchId, onClose }: BranchDetailDrawerProps) {
  const details = useQuery(api.branches.getBranchFullDetails, { branchId });
  const [activeTab, setActiveTab] = useState<BranchTab>("overview");

  if (details === undefined) {
    return (
      <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-end">
        <div className="bg-white w-full max-w-4xl h-full shadow-2xl flex items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#294a63]"></div>
        </div>
      </div>
    );
  }

  if (details === null) {
    return (
      <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-end">
        <div className="bg-white w-full max-w-4xl h-full shadow-2xl p-6 flex flex-col justify-between">
          <div className="text-center text-red-500 py-12">Branch details could not be found.</div>
          <button onClick={onClose} className="px-4 py-2 bg-gray-105 rounded">Close</button>
        </div>
      </div>
    );
  }

  const { overview, analytics, platforms, users, campaigns, reviews, logs, quota } = details;

  const tabList: { key: BranchTab; label: string; icon: any }[] = [
    { key: "overview", label: "Overview & Quota", icon: Building },
    { key: "analytics", label: "Analytics Stats", icon: Star },
    { key: "platforms", label: "Platforms", icon: Globe },
    { key: "users", label: "Branch Users", icon: User },
    { key: "campaigns", label: "Campaign Invite Logs", icon: Share2 },
    { key: "reviews", label: "Recent Reviews", icon: MessageSquare },
    { key: "logs", label: "Audit Trails", icon: Clock },
  ];

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-end animate-fade-in">
      <div className="bg-white w-full max-w-4xl h-full shadow-2xl flex flex-col justify-between overflow-hidden animate-slide-in">
        {/* Header */}
        <div className="bg-[#294a63] text-white p-5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold flex items-center space-x-2">
              <span>Branch Drill-Down: {overview.name}</span>
            </h2>
            <p className="text-xs text-blue-100/80 mt-0.5">Admin branch control panel</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tab & Content container */}
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar Tabs */}
          <div className="w-56 bg-gray-50 border-r border-gray-150 flex flex-col py-4">
            {tabList.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`w-full text-left px-5 py-3 text-xs font-semibold flex items-center space-x-2.5 border-l-4 transition-all ${
                    isActive
                      ? "bg-white border-[#294a63] text-[#294a63]"
                      : "border-transparent text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          <div className="flex-1 p-6 overflow-y-auto bg-white">
            {/* OVERVIEW & QUOTA */}
            {activeTab === "overview" && (
              <div className="space-y-6">
                {/* SECTION 1: Overview */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-gray-800 border-b pb-2">Branch Overview</h3>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <span className="block text-gray-400 font-medium">Branch Name</span>
                      <strong className="text-gray-800 text-sm">{overview.name}</strong>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <span className="block text-gray-400 font-medium">Branch Code</span>
                      <strong className="text-[#294a63] text-sm font-mono">{overview.code}</strong>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <span className="block text-gray-400 font-medium">Created Date</span>
                      <strong className="text-gray-800 text-sm">
                        {new Date(overview.createdTime).toLocaleDateString(undefined, {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </strong>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <span className="block text-gray-400 font-medium">Active Status</span>
                      <span
                        className={`inline-block mt-1 px-2.5 py-0.5 rounded text-xs font-semibold border ${
                          overview.active
                            ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                            : "bg-gray-50 text-gray-500 border-gray-250"
                        }`}
                      >
                        {overview.active ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg col-span-2">
                      <span className="block text-gray-400 font-medium">Company Branding Name</span>
                      <strong className="text-gray-800 text-sm">{overview.cmpyName || "—"}</strong>
                    </div>
                  </div>
                </div>

                {/* SECTION 8: Quotas */}
                <div className="space-y-4 pt-2">
                  <h3 className="text-sm font-bold text-gray-800 border-b pb-2 font-bold">Remaining Quotas Balance</h3>
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div className="p-4 bg-gray-50/50 border border-gray-150 rounded-lg">
                      <Smartphone className="w-5 h-5 mx-auto text-sky-600 mb-2" />
                      <p className="text-xs text-gray-450 font-semibold uppercase">SMS Balance</p>
                      <p className="text-lg font-bold text-gray-700 mt-1">{quota.smsQuota}</p>
                    </div>
                    <div className="p-4 bg-gray-50/50 border border-gray-150 rounded-lg">
                      <Mail className="w-5 h-5 mx-auto text-emerald-600 mb-2" />
                      <p className="text-xs text-gray-455 font-semibold uppercase">Email Balance</p>
                      <p className="text-lg font-bold text-gray-700 mt-1">{quota.emailQuota}</p>
                    </div>
                    <div className="p-4 bg-gray-50/50 border border-gray-150 rounded-lg">
                      <Share2 className="w-5 h-5 mx-auto text-green-600 mb-2" />
                      <p className="text-xs text-gray-455 font-semibold uppercase">WhatsApp Balance</p>
                      <p className="text-lg font-bold text-gray-700 mt-1">{quota.whatsappQuota}</p>
                    </div>
                    <div className="p-4 bg-gray-50/50 border border-gray-150 rounded-lg">
                      <Globe className="w-5 h-5 mx-auto text-indigo-600 mb-2" />
                      <p className="text-xs text-gray-455 font-semibold uppercase">Web Balance</p>
                      <p className="text-lg font-bold text-gray-700 mt-1">{quota.webQuota}</p>
                    </div>
                  </div>
                  {quota.balance > 0 && (
                    <div className="p-3 bg-amber-50 rounded-lg border border-amber-250 text-center">
                      <span className="text-xs font-semibold text-amber-700">
                        Pending Due Balance: ₹{quota.balance}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ANALYTICS STATS */}
            {activeTab === "analytics" && (
              <div className="space-y-6">
                {/* SECTION 2: Analytics */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-gray-800 border-b pb-2">Rating Performance</h3>
                  <div className="grid grid-cols-2 gap-4 text-center mb-6">
                    <div className="bg-[#294a63]/5 p-4 rounded-xl border border-[#294a63]/10">
                      <MessageSquare className="w-5 h-5 mx-auto text-[#294a63] mb-1.5" />
                      <span className="block text-xs text-gray-400 font-medium">Total Reviews</span>
                      <strong className="text-2xl font-bold text-gray-850">{analytics.totalReviews}</strong>
                    </div>
                    <div className="bg-amber-500/5 p-4 rounded-xl border border-amber-500/10">
                      <Star className="w-5 h-5 mx-auto text-amber-500 fill-current mb-1.5" />
                      <span className="block text-xs text-gray-400 font-medium">Average Rating</span>
                      <strong className="text-2xl font-bold text-gray-855">{analytics.averageRating}</strong>
                    </div>
                  </div>

                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Rating Volume Distribution</h4>
                  <div className="space-y-3.5">
                    {([5, 4, 3, 2, 1] as const).map((star) => {
                      const count = analytics.starCounts[star] || 0;
                      const total = analytics.totalReviews || 1;
                      const pct = Math.round((count / total) * 100);
                      return (
                        <div key={star} className="flex items-center text-xs">
                          <span className="w-12 text-gray-500 font-semibold">{star} Star</span>
                          <div className="flex-1 mx-4 bg-gray-100 rounded-full h-2.5 overflow-hidden">
                            <div
                              className="bg-amber-400 h-2.5 rounded-full transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            ></div>
                          </div>
                          <span className="w-8 text-right text-gray-650 font-bold">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* PLATFORMS */}
            {activeTab === "platforms" && (
              <div className="space-y-4">
                {/* SECTION 3: Platforms */}
                <h3 className="text-sm font-bold text-gray-800 border-b pb-2">Configured Review Channels</h3>
                {platforms.length === 0 ? (
                  <p className="text-xs text-gray-450 italic">No platforms configured for this branch.</p>
                ) : (
                  <div className="border border-gray-150 rounded-lg overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-55 text-gray-500 font-semibold uppercase">
                        <tr>
                          <th className="p-3">Platform</th>
                          <th className="p-3">Average Rating</th>
                          <th className="p-3">Reviews</th>
                          <th className="p-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y text-gray-700">
                        {platforms.map((p) => (
                          <tr key={p.id} className="hover:bg-gray-55/30">
                            <td className="p-3">
                              <span className="font-semibold block text-gray-800">{p.name}</span>
                              <a
                                href={p.link}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[10px] text-[#294a63] hover:underline font-mono truncate max-w-[200px] block"
                              >
                                {p.link}
                              </a>
                            </td>
                            <td className="p-3">
                              <div className="flex items-center text-amber-500 font-semibold">
                                <span className="mr-0.5">{p.totalRatings > 0 ? (p.starRating / p.totalRatings).toFixed(1) : "0"}</span>
                                <Star className="w-3 h-3 fill-current" />
                              </div>
                            </td>
                            <td className="p-3">{p.totalRatings}</td>
                            <td className="p-3">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                  p.active
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                    : "bg-gray-50 text-gray-500 border-gray-200"
                                }`}
                              >
                                {p.active ? "Active" : "Disabled"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* USERS */}
            {activeTab === "users" && (
              <div className="space-y-4">
                {/* SECTION 4: Users */}
                <h3 className="text-sm font-bold text-gray-800 border-b pb-2">Branch Staff Accounts</h3>
                {users.length === 0 ? (
                  <p className="text-xs text-gray-455 italic">No users registered inside this branch.</p>
                ) : (
                  <div className="border border-gray-150 rounded-lg overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-55 text-gray-500 font-semibold uppercase">
                        <tr>
                          <th className="p-3">Staff Name</th>
                          <th className="p-3">Email / Phone</th>
                          <th className="p-3">Role</th>
                          <th className="p-3">Status</th>
                          <th className="p-3">Last Active</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y text-gray-700">
                        {users.map((u) => (
                          <tr key={u.id} className="hover:bg-gray-55/30">
                            <td className="p-3">
                              <span className="font-semibold block text-gray-800">
                                {u.fname || u.lname ? `${u.fname} ${u.lname}`.trim() : "—"}
                              </span>
                              <span className="text-[10px] text-gray-400 font-mono">@{u.uname}</span>
                            </td>
                            <td className="p-3">
                              <div>{u.email}</div>
                              <div className="text-gray-400 text-[10px]">{u.mobile}</div>
                            </td>
                            <td className="p-3 font-semibold text-[#294a63] capitalize">
                              {u.role.replace(/_/g, " ").toLowerCase()}
                            </td>
                            <td className="p-3">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                  u.active === 1
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                    : u.active === 2
                                    ? "bg-red-50 text-red-700 border-red-100"
                                    : "bg-gray-50 text-gray-500 border-gray-200"
                                }`}
                              >
                                {u.active === 1 ? "Active" : u.active === 2 ? "Suspended" : "Unverified"}
                              </span>
                            </td>
                            <td className="p-3 text-[10px] text-gray-455">
                              {u.latestActivity || "Never logged in"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* CAMPAIGNS */}
            {activeTab === "campaigns" && (
              <div className="space-y-6">
                {/* SECTION 5: Campaigns */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-gray-800 border-b pb-2">Campaign Invite Statistics</h3>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="p-3 bg-gray-50/70 border border-gray-150 rounded-lg">
                      <span className="block text-[10px] text-gray-400 font-semibold uppercase">Total Campaigns</span>
                      <strong className="text-lg font-bold text-gray-700 mt-1">{campaigns.total}</strong>
                    </div>
                    <div className="p-3 bg-gray-50/70 border border-gray-150 rounded-lg">
                      <span className="block text-[10px] text-gray-400 font-semibold uppercase">Email Invites</span>
                      <strong className="text-lg font-bold text-gray-700 mt-1">{campaigns.emailCount}</strong>
                    </div>
                    <div className="p-3 bg-gray-50/70 border border-gray-150 rounded-lg">
                      <span className="block text-[10px] text-gray-400 font-semibold uppercase">SMS Invites</span>
                      <strong className="text-lg font-bold text-gray-700 mt-1">{campaigns.smsCount}</strong>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Sent Invite Logs</h4>
                  {campaigns.list.length === 0 ? (
                    <p className="text-xs text-gray-455 italic">No campaigns sent by this branch yet.</p>
                  ) : (
                    <div className="border border-gray-150 rounded-lg overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-gray-55 text-gray-500 font-semibold uppercase">
                          <tr>
                            <th className="p-3">Type</th>
                            <th className="p-3">Recipient</th>
                            <th className="p-3">Subject / Campaign</th>
                            <th className="p-3">Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y text-gray-700">
                          {campaigns.list.map((c) => (
                            <tr key={c.id} className="hover:bg-gray-55/30">
                              <td className="p-3 capitalize font-bold text-[#294a63]">{c.type}</td>
                              <td className="p-3">{c.sentTo}</td>
                              <td className="p-3 max-w-[150px] truncate" title={c.subject || c.body}>
                                {c.subject || c.body}
                              </td>
                              <td className="p-3 text-[10px] text-gray-455">
                                {new Date(c.creationTime).toLocaleDateString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* RECENT REVIEWS */}
            {activeTab === "reviews" && (
              <div className="space-y-4">
                {/* SECTION 6: Recent Reviews */}
                <h3 className="text-sm font-bold text-gray-800 border-b pb-2">Customer Feedback Reviews</h3>
                {reviews.length === 0 ? (
                  <p className="text-xs text-gray-455 italic">No customer reviews received yet.</p>
                ) : (
                  <div className="space-y-3.5">
                    {reviews.map((r) => (
                      <div key={r.id} className="border border-gray-200 rounded-lg p-3 text-xs space-y-2 hover:bg-gray-50/30">
                        <div className="flex items-center justify-between">
                          <strong className="text-gray-855 text-sm">{r.name}</strong>
                          <div className="flex items-center text-amber-500 space-x-0.5">
                            {Array.from({ length: 5 }).map((_, idx) => (
                              <Star
                                key={idx}
                                className={`w-3.5 h-3.5 ${idx < r.star ? "fill-amber-400 text-amber-400" : "text-gray-200"}`}
                              />
                            ))}
                          </div>
                        </div>
                        <p className="text-gray-655 font-medium italic bg-gray-50/50 p-2.5 rounded border border-gray-100">
                          &quot;{r.review || "No review content provided."}&quot;
                        </p>
                        <div className="flex items-center justify-between text-[10px] text-gray-400">
                          <span>Channel: <strong className="text-[#294a63]">{r.webName}</strong></span>
                          <span>
                            {new Date(r.creationTime).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* AUDIT LOGS */}
            {activeTab === "logs" && (
              <div className="space-y-4">
                {/* SECTION 7: Activity Logs */}
                <h3 className="text-sm font-bold text-gray-800 border-b pb-2">Branch Audit Logs</h3>
                {logs.length === 0 ? (
                  <p className="text-xs text-gray-455 italic">No activity logs recorded inside this branch.</p>
                ) : (
                  <div className="border border-gray-150 rounded-lg overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-55 text-gray-500 font-semibold uppercase">
                        <tr>
                          <th className="p-3">Action Type</th>
                          <th className="p-3">Details Message</th>
                          <th className="p-3">Timestamp</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y text-gray-700">
                        {logs.map((l) => (
                          <tr key={l.id} className="hover:bg-gray-55/35">
                            <td className="p-3 font-semibold text-[#294a63]">{l.actionType}</td>
                            <td className="p-3 text-gray-655 font-medium">{l.msg}</td>
                            <td className="p-3 text-[10px] text-gray-455 whitespace-nowrap">
                              {l.actTime || new Date(l.creationTime).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 p-4 border-t flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-white border border-gray-250 text-xs font-semibold text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Close Detail Panel
          </button>
        </div>
      </div>
    </div>
  );
}
