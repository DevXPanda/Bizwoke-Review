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
  Grid,
} from "lucide-react";
import { Id } from "../../../../../convex/_generated/dataModel";

export default function AdminBranchesPage() {
  const user = useQuery(api.users.currentUser);
  const branches = useQuery(api.branches.getBranches);
  const createBranch = useMutation(api.branches.createBranch);
  const updateBranch = useMutation(api.branches.updateBranch);
  const deleteBranch = useMutation(api.branches.deleteBranch);
  const packages = useQuery(api.pricing.getPricingPackages);

  const [searchTerm, setSearchTerm] = useState("");
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form states
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<Id<"branches"> | null>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [active, setActive] = useState(1);
  const [cmpyName, setCmpyName] = useState("");
  const [pricingPackageId, setPricingPackageId] = useState<string>("");

  if (user === undefined || branches === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#294a63]"></div>
      </div>
    );
  }

  // Double check SUPER_ADMIN access on frontend
  const isSuperAdmin = user && (user.role === "SUPER_ADMIN" || user.role === "sadmin" || user.sadmin === 1);
  if (!isSuperAdmin) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500 font-semibold">Access Denied. Super Admin only.</p>
      </div>
    );
  }

  const filtered = (branches ?? []).filter((b) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      b.name.toLowerCase().includes(term) ||
      b.code.toLowerCase().includes(term) ||
      (b.cmpyName || "").toLowerCase().includes(term)
    );
  });

  const resetForm = () => {
    setName("");
    setCode("");
    setActive(1);
    setCmpyName("");
    setPricingPackageId("");
    setEditingId(null);
    setIsOpen(false);
  };

  const handleEdit = (branch: any) => {
    setEditingId(branch._id);
    setName(branch.name);
    setCode(branch.code);
    setActive(branch.active);
    setCmpyName(branch.cmpyName || "");
    setPricingPackageId(branch.pricingPackageId || "");
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg(null);
    setErrorMsg(null);

    if (!name || !code) {
      setErrorMsg("Name and Code are required");
      return;
    }

    try {
      if (editingId) {
        await updateBranch({
          id: editingId,
          name,
          code,
          active,
          cmpyName: cmpyName || undefined,
          pricingPackageId: pricingPackageId === "" ? undefined : (pricingPackageId as any),
        });
        setSuccessMsg("Branch updated successfully");
      } else {
        await createBranch({
          name,
          code,
          active,
          cmpyName: cmpyName || undefined,
          pricingPackageId: pricingPackageId === "" ? undefined : (pricingPackageId as any),
        });
        setSuccessMsg("Branch created successfully");
      }
      resetForm();
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred");
    }
  };

  const handleDelete = async (id: Id<"branches">) => {
    if (!confirm("Are you sure you want to delete this branch? This is a soft-delete and can be restored by recreating the branch with the same code.")) {
      return;
    }
    setSuccessMsg(null);
    setErrorMsg(null);
    try {
      await deleteBranch({ id });
      setSuccessMsg("Branch deleted successfully");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to delete branch");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in relative">
      <div className="bg-white p-6 rounded-xl border border-gray-200/80 shadow-sm flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center space-x-2">
            <Grid className="w-7 h-7 text-[#294a63]" />
            <span>Branch Management</span>
          </h1>
          <p className="text-gray-500 mt-1">Create, update, and manage company branches.</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setIsOpen(true);
          }}
          className="bg-[#294a63] hover:bg-[#1f374a] text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center space-x-1.5 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Add Branch</span>
        </button>
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

      {/* Search */}
      <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-sm flex items-center space-x-2">
        <Search className="w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search by branch name, code, branding..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#294a63]"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-55 text-xs font-semibold text-gray-500 uppercase">
              <tr>
                <th className="px-6 py-3.5">Branch Name</th>
                <th className="px-6 py-3.5">Branch Code</th>
                <th className="px-6 py-3.5">Company Branding</th>
                <th className="px-6 py-3.5">Pricing Plan</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
               {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                    No branches found.
                  </td>
                </tr>
              ) : (
                filtered.map((b) => (
                  <tr key={b._id} className="hover:bg-gray-50/50">
                    <td className="px-6 py-4 font-semibold text-gray-800">{b.name}</td>
                    <td className="px-6 py-4 text-gray-600 font-mono text-xs">{b.code}</td>
                    <td className="px-6 py-4 text-gray-500">{b.cmpyName || "Default Branding"}</td>
                    <td className="px-6 py-4 text-xs">
                      {(() => {
                        const pkg = packages?.find((p) => p._id === b.pricingPackageId);
                        return pkg ? (
                          <div>
                            <strong className="text-gray-800 block">{pkg.packageName}</strong>
                            <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
                              Max {pkg.maxUsers} Users
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">No Plan</span>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          b.active === 1
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}
                      >
                        {b.active === 1 ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4 flex items-center space-x-3">
                      <button
                        onClick={() => handleEdit(b)}
                        className="text-gray-500 hover:text-[#294a63] p-1 rounded hover:bg-gray-100 transition-colors"
                        title="Edit Branch"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(b._id)}
                        className="text-gray-500 hover:text-red-600 p-1 rounded hover:bg-gray-100 transition-colors"
                        title="Delete Branch"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide-out Panel / Dialog Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-xl shadow-xl border border-gray-200 overflow-hidden transform transition-all animate-scale-in">
            <div className="bg-[#294a63] px-6 py-4 flex justify-between items-center text-white">
              <h3 className="font-bold text-lg">
                {editingId ? "Edit Branch" : "Add New Branch"}
              </h3>
              <button
                onClick={resetForm}
                className="text-blue-100 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                  Branch Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Mumbai Office"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#294a63]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                  Branch Code (Unique)
                </label>
                <input
                  type="text"
                  placeholder="e.g. MUMBAI01"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  disabled={!!editingId}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-1 focus:ring-[#294a63] disabled:bg-gray-50 disabled:text-gray-400"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                  Company Branding Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Bizorm Mumbai"
                  value={cmpyName}
                  onChange={(e) => setCmpyName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#294a63]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                  Pricing Package Plan
                </label>
                <select
                  value={pricingPackageId}
                  onChange={(e) => setPricingPackageId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#294a63] bg-white text-gray-700"
                >
                  <option value="">No Assigned Plan (Unlimited Users)</option>
                  {(packages ?? [])
                    .filter((p: any) => p.status === "active")
                    .map((p: any) => (
                      <option key={p._id} value={p._id}>
                        {p.packageName} (₹{p.price} / {p.billingType} - Max {p.maxUsers} Users)
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                  Status
                </label>
                <select
                  value={active}
                  onChange={(e) => setActive(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#294a63]"
                >
                  <option value={1}>Active</option>
                  <option value={0}>Inactive</option>
                </select>
              </div>

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
