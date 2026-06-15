"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { useState } from "react";
import {
  CheckCircle,
  AlertTriangle,
  Search,
  Plus,
  Edit2,
  Trash2,
  X,
  Save,
  CreditCard,
  Check,
} from "lucide-react";
import { Id } from "../../../../../convex/_generated/dataModel";

export default function AdminPricingPage() {
  const user = useQuery(api.users.currentUser);
  const packages = useQuery(api.pricing.getPricingPackages);
  const createPackage = useMutation(api.pricing.createPricingPackage);
  const updatePackage = useMutation(api.pricing.updatePricingPackage);
  const deletePackage = useMutation(api.pricing.deletePricingPackage);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterBillingType, setFilterBillingType] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form states
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<Id<"pricing"> | null>(null);
  const [packageName, setPackageName] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState(0);
  const [billingType, setBillingType] = useState("Monthly");
  const [featuresList, setFeaturesList] = useState<string[]>([]);
  const [featureInput, setFeatureInput] = useState("");
  const [displayOrder, setDisplayOrder] = useState(0);
  const [popularBadge, setPopularBadge] = useState(false);
  const [status, setStatus] = useState("active");
  const [maxUsers, setMaxUsers] = useState(10);

  if (user === undefined || packages === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#294a63]"></div>
      </div>
    );
  }

  // Access validation: SUPER_ADMIN only
  const isSuperAdmin = user && (user.role === "SUPER_ADMIN" || user.role === "sadmin" || user.sadmin === 1);
  if (!isSuperAdmin) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500 font-semibold">Access Denied. Super Admin only.</p>
      </div>
    );
  }

  // Get unique categories for filters
  const categories = Array.from(new Set((packages ?? []).map((p: any) => p.category))) as string[];

  // Filter and Search logic
  const filtered = (packages ?? []).filter((p: any) => {
    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchesName = p.packageName.toLowerCase().includes(term);
      const matchesCategory = p.category.toLowerCase().includes(term);
      const matchesFeatures = p.featuresList.some((f: string) => f.toLowerCase().includes(term));
      if (!matchesName && !matchesCategory && !matchesFeatures) {
        return false;
      }
    }

    // Billing type filter
    if (filterBillingType !== "all" && p.billingType !== filterBillingType) {
      return false;
    }

    // Category filter
    if (filterCategory !== "all" && p.category !== filterCategory) {
      return false;
    }

    // Status filter
    if (filterStatus !== "all" && p.status !== filterStatus) {
      return false;
    }

    return true;
  });

  // Sort by display order
  const sorted = [...filtered].sort((a, b) => a.displayOrder - b.displayOrder);

  // Pagination logic
  const totalPages = Math.ceil(sorted.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedItems = sorted.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Form manipulation
  const resetForm = () => {
    setPackageName("");
    setCategory("");
    setPrice(0);
    setBillingType("Monthly");
    setFeaturesList([]);
    setFeatureInput("");
    setDisplayOrder(0);
    setPopularBadge(false);
    setStatus("active");
    setMaxUsers(10);
    setEditingId(null);
    setIsOpen(false);
  };

  const handleAddFeature = () => {
    if (featureInput.trim()) {
      setFeaturesList([...featuresList, featureInput.trim()]);
      setFeatureInput("");
    }
  };

  const handleRemoveFeature = (index: number) => {
    setFeaturesList(featuresList.filter((_: string, i: number) => i !== index));
  };

  const handleEdit = (pkg: any) => {
    setEditingId(pkg._id);
    setPackageName(pkg.packageName);
    setCategory(pkg.category);
    setPrice(pkg.price);
    setBillingType(pkg.billingType);
    setFeaturesList(pkg.featuresList);
    setDisplayOrder(pkg.displayOrder);
    setPopularBadge(pkg.popularBadge);
    setStatus(pkg.status);
    setMaxUsers(pkg.maxUsers ?? 10);
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg(null);
    setErrorMsg(null);

    if (!packageName || !category || price < 0) {
      setErrorMsg("Please fill in all required fields and verify pricing.");
      return;
    }

    try {
      if (editingId) {
        await updatePackage({
          id: editingId,
          packageName,
          category,
          price: Number(price),
          billingType,
          featuresList,
          displayOrder: Number(displayOrder),
          popularBadge,
          status,
          maxUsers: Number(maxUsers),
        });
        setSuccessMsg("Pricing package updated successfully.");
      } else {
        await createPackage({
          packageName,
          category,
          price: Number(price),
          billingType,
          featuresList,
          displayOrder: Number(displayOrder),
          popularBadge,
          status,
          maxUsers: Number(maxUsers),
        });
        setSuccessMsg("Pricing package created successfully.");
      }
      resetForm();
      setCurrentPage(1);
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred.");
    }
  };

  const handleDelete = async (id: Id<"pricing">) => {
    if (!confirm("Are you sure you want to delete this package? This action is permanent.")) {
      return;
    }
    setSuccessMsg(null);
    setErrorMsg(null);
    try {
      await deletePackage({ id });
      setSuccessMsg("Pricing package deleted successfully.");
      setCurrentPage(1);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to delete pricing package.");
    }
  };

  // Metrics calculation
  const totalCount = packages.length;
  const activeCount = packages.filter((p) => p.status === "active").length;
  const inactiveCount = packages.filter((p) => p.status === "inactive").length;
  const distinctCategories = Array.from(new Set(packages.map((p: any) => p.category))).length;

  return (
    <div className="space-y-6 animate-fade-in relative">
      {/* Top Header Card */}
      <div className="bg-white p-6 rounded-xl border border-gray-200/80 shadow-sm flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center space-x-2">
            <CreditCard className="w-7 h-7 text-[#294a63]" />
            <span>Pricing Management</span>
          </h1>
          <p className="text-gray-500 mt-1">Configure pricing plans, billing packages, features, and subscriptions.</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setIsOpen(true);
          }}
          className="bg-[#294a63] hover:bg-[#1f374a] text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center space-x-1.5 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Add Package</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-5 rounded-xl border border-gray-200/80 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Packages</span>
          <strong className="text-2xl font-bold text-gray-800 mt-1">{totalCount}</strong>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-200/80 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Active</span>
          <strong className="text-2xl font-bold text-emerald-700 mt-1">{activeCount}</strong>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-200/80 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Inactive</span>
          <strong className="text-2xl font-bold text-gray-650 mt-1">{inactiveCount}</strong>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-200/80 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Categories</span>
          <strong className="text-2xl font-bold text-blue-700 mt-1">{distinctCategories}</strong>
        </div>
      </div>

      {successMsg && (
        <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded text-sm text-emerald-700 flex items-center space-x-2">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded text-sm text-red-700 flex items-center space-x-2">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Search and Filters Bar */}
      <div className="bg-white p-5 rounded-xl border border-gray-200/80 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* Search */}
        <div className="relative flex-1 w-full flex items-center">
          <Search className="w-4 h-4 text-gray-400 absolute left-3" />
          <input
            type="text"
            placeholder="Search by package name, category, or features..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#294a63]"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap w-full md:w-auto gap-3 items-center">
          <div>
            <select
              value={filterBillingType}
              onChange={(e) => {
                setFilterBillingType(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#294a63] bg-white text-gray-700 font-semibold"
            >
              <option value="all">All Billing Types</option>
              <option value="Monthly">Monthly</option>
              <option value="Yearly">Yearly</option>
              <option value="Lifetime">Lifetime</option>
            </select>
          </div>

          <div>
            <select
              value={filterCategory}
              onChange={(e) => {
                setFilterCategory(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#294a63] bg-white text-gray-700 font-semibold"
            >
              <option value="all">All Categories</option>
              {categories.map((c: string) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#294a63] bg-white text-gray-700 font-semibold"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase">
              <tr>
                <th className="px-6 py-3.5 w-16">Order</th>
                <th className="px-6 py-3.5">Package</th>
                <th className="px-6 py-3.5">Category</th>
                <th className="px-6 py-3.5">Price / Billing</th>
                <th className="px-6 py-3.5">Max Users</th>
                <th className="px-6 py-3.5">Features</th>
                <th className="px-6 py-3.5">Badge</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-400">
                    No pricing packages found.
                  </td>
                </tr>
              ) : (
                paginatedItems.map((pkg) => (
                  <tr key={pkg._id} className="hover:bg-gray-55/20 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-gray-400">{pkg.displayOrder}</td>
                    <td className="px-6 py-4">
                      <strong className="text-gray-800 text-sm block">{pkg.packageName}</strong>
                    </td>
                    <td className="px-6 py-4">
                      <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs font-semibold capitalize">
                        {pkg.category}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-800 text-sm">₹{pkg.price}</div>
                      <div className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">{pkg.billingType}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-850 text-xs">{pkg.maxUsers} user(s)</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1 max-w-[250px]">
                        {pkg.featuresList.slice(0, 3).map((f: string, i: number) => (
                          <span
                            key={i}
                            className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-[10px] font-medium border border-blue-100/50"
                          >
                            {f}
                          </span>
                        ))}
                        {pkg.featuresList.length > 3 && (
                          <span className="text-gray-400 text-[10px] font-semibold self-center ml-1">
                            +{pkg.featuresList.length - 3} more
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {pkg.popularBadge ? (
                        <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded text-[10px] font-extrabold uppercase">
                          Popular
                        </span>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                          pkg.status === "active"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-gray-50 text-gray-500 border border-gray-200"
                        }`}
                      >
                        {pkg.status === "active" ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2.5">
                        <button
                          onClick={() => handleEdit(pkg)}
                          className="text-gray-500 hover:text-[#294a63] p-1 rounded hover:bg-gray-50 transition-colors"
                          title="Edit Package"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(pkg._id)}
                          className="text-gray-500 hover:text-red-650 p-1 rounded hover:bg-gray-50 transition-colors"
                          title="Delete Package"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="bg-gray-50/70 border-t border-gray-100 px-6 py-4 flex items-center justify-between">
            <span className="text-xs text-gray-500">
              Showing <strong className="text-gray-700">{startIndex + 1}</strong> to{" "}
              <strong className="text-gray-700">
                {Math.min(startIndex + itemsPerPage, sorted.length)}
              </strong>{" "}
              of <strong className="text-gray-700">{sorted.length}</strong> plans
            </span>
            <div className="flex items-center space-x-1">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs bg-white hover:bg-gray-50 text-gray-650 transition-colors disabled:opacity-50"
              >
                Previous
              </button>
              {Array.from({ length: totalPages }).map((_, i) => {
                const pageNum = i + 1;
                const isCurrent = currentPage === pageNum;
                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`px-3 py-1.5 border text-xs rounded-lg transition-colors font-semibold ${
                      isCurrent
                        ? "bg-[#294a63] text-white border-[#294a63]"
                        : "bg-white text-gray-650 border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs bg-white hover:bg-gray-50 text-gray-650 transition-colors disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CRUD Form Modal Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-xl shadow-xl border border-gray-200 overflow-hidden transform transition-all animate-scale-in">
            {/* Modal Header */}
            <div className="bg-[#294a63] px-6 py-4 flex justify-between items-center text-white">
              <h3 className="font-bold text-lg">
                {editingId ? "Edit Pricing Package" : "Add New Pricing Package"}
              </h3>
              <button
                onClick={resetForm}
                className="text-blue-100 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                    Package Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Starter Plan"
                    value={packageName}
                    onChange={(e) => setPackageName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#294a63]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                    Category *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Standard"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#294a63]"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                    Price (INR) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 499"
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#294a63]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                    Billing Type
                  </label>
                  <select
                    value={billingType}
                    onChange={(e) => setBillingType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#294a63] bg-white"
                  >
                    <option value="Monthly">Monthly</option>
                    <option value="Yearly">Yearly</option>
                    <option value="Lifetime">Lifetime</option>
                  </select>
                </div>
              </div>



              {/* Dynamic Feature List */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                  Features List
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    placeholder="Type a feature (e.g. 1000 SMS / month)"
                    value={featureInput}
                    onChange={(e) => setFeatureInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddFeature();
                      }
                    }}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#294a63]"
                  />
                  <button
                    type="button"
                    onClick={handleAddFeature}
                    className="bg-[#294a63] hover:bg-[#1f374a] text-white px-3 py-2 rounded-lg text-sm font-semibold transition-colors"
                  >
                    Add
                  </button>
                </div>

                <div className="border border-gray-150 rounded-lg p-3 bg-gray-50/50 space-y-1.5 max-h-36 overflow-y-auto">
                  {featuresList.length === 0 ? (
                    <span className="text-xs text-gray-400 italic block text-center py-2">
                      No features added yet.
                    </span>
                  ) : (
                    featuresList.map((f: string, idx: number) => (
                      <div
                        key={idx}
                        className="flex justify-between items-center bg-white border border-gray-200 rounded-lg px-2.5 py-1 text-xs text-gray-700 shadow-sm"
                      >
                        <span className="flex items-center space-x-1.5">
                          <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                          <span className="truncate max-w-[320px]">{f}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveFeature(idx)}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                    Display Order
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 1"
                    value={displayOrder}
                    onChange={(e) => setDisplayOrder(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#294a63]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                    Max Users Limit *
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 5"
                    value={maxUsers}
                    onChange={(e) => setMaxUsers(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#294a63]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#294a63] bg-white"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="flex items-center space-x-2 text-sm text-gray-700 cursor-pointer py-1.5">
                  <input
                    type="checkbox"
                    checked={popularBadge}
                    onChange={(e) => setPopularBadge(e.target.checked)}
                    className="rounded text-[#294a63] focus:ring-[#294a63]"
                  />
                  <span className="font-semibold text-xs text-gray-600 uppercase">
                    Mark as Popular Package (Badge)
                  </span>
                </label>
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-50 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#294a63] hover:bg-[#1f374a] text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center space-x-1.5 transition-colors shadow-sm"
                >
                  <Save className="w-4 h-4" />
                  <span>Save</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
