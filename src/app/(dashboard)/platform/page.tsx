"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useState } from "react";
import {
  Plus,
  X,
  Globe,
  AlertTriangle,
  CheckCircle,
  Trash2,
  Edit3,
  ExternalLink,
  CircleDot,
} from "lucide-react";
import { Id } from "../../../../convex/_generated/dataModel";

export default function PlatformPage() {
  const dashData = useQuery(api.reviews.getDashboardData);
  const createWebsiteMutation = useMutation(api.reviews.createWebsite);
  const removeWebsiteMutation = useMutation(api.reviews.removeWebsite);
  const updateWebsiteMutation = useMutation(api.reviews.updateWebsite);
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

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Add form states
  const [newWebName, setNewWebName] = useState("");
  const [newWebLink, setNewWebLink] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newIcon, setNewIcon] = useState("fa-solid fa-globe");

  // Edit form states
  const [editId, setEditId] = useState<Id<"websites"> | null>(null);
  const [editActive, setEditActive] = useState(1);
  const [editSubject, setEditSubject] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editIcon, setEditIcon] = useState("");

  // UI states
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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

  const { platformSummary, quota, user } = dashData;
  const webQuota = quota?.webQuota ?? 0;

  const clearMessages = () => {
    setSuccessMsg(null);
    setErrorMsg(null);
  };

  const handleAddPlatform = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    if (!newWebName.trim()) {
      setErrorMsg("Platform name is required");
      return;
    }
    if (!newWebLink.trim()) {
      setErrorMsg("Platform link is required");
      return;
    }
    // URL validation
    const urlPattern = /^(https?:\/\/)?([\w\d]([a-z\d-]*[a-z\d])*\.?)+[a-z]{2,}(:\d+)?(\/[-a-z\d%_.~+]*)*(\\?[;&a-z\d%_.~+=-]*)?(#[-a-z\d_]*)?$/i;
    if (!urlPattern.test(newWebLink)) {
      setErrorMsg("Invalid web URL format");
      return;
    }

    setLoading(true);
    try {
      const res = await createWebsiteMutation({
        userId: user.id,
        formKey: user.formKey,
        webName: newWebName.trim(),
        webLink: newWebLink.trim(),
        subject: newSubject.trim(),
        description: newDescription.trim(),
        icon: newIcon,
      });

      if (res.success) {
        setSuccessMsg("Platform created successfully");
        setShowAddModal(false);
        setNewWebName("");
        setNewWebLink("");
        setNewSubject("");
        setNewDescription("");
        setNewIcon("fa-solid fa-globe");
      } else {
        setErrorMsg(res.error || "Failed to create platform");
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Error creating platform";
      setErrorMsg(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleRemovePlatform = async (webId: Id<"websites">, webName: string, webLink: string) => {
    if (!confirm(`Are you sure you want to remove "${webName}"?`)) return;
    clearMessages();

    try {
      await removeWebsiteMutation({
        userId: user.id,
        webId,
        webName,
        webLink,
      });
      setSuccessMsg("Platform removed successfully");
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Error removing platform";
      setErrorMsg(errorMessage);
    }
  };

  const handleOpenEdit = (p: typeof platformSummary[0]) => {
    setEditId(p.id as Id<"websites">);
    setEditActive(p.active);
    setEditSubject("");
    setEditDescription("");
    setEditIcon("fa-solid fa-globe");
    setShowEditModal(true);
    clearMessages();
  };

  const handleEditPlatform = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editId) return;
    clearMessages();
    setLoading(true);

    try {
      await updateWebsiteMutation({
        id: editId,
        active: editActive,
        subject: editSubject,
        description: editDescription,
        icon: editIcon,
      });
      setSuccessMsg("Platform updated successfully");
      setShowEditModal(false);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Error updating platform";
      setErrorMsg(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    clearMessages();
    if (webQuota <= 0) {
      setErrorMsg("Web quota limit reached. Contact support for more quota.");
      return;
    }
    setShowAddModal(true);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between bg-white p-6 rounded-xl border border-gray-200/80 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Platform Management</h1>
          <p className="text-gray-500 mt-1">Manage your review platforms and links.</p>
        </div>
        <div className="mt-4 md:mt-0 flex items-center space-x-3">
          <button
            disabled={isReadOnly}
            onClick={handleOpenAddModal}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-semibold rounded-lg text-white bg-[#294a63] hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#294a63] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4 mr-2" />
            {isReadOnly ? "Read-Only" : "Add Platform"}
          </button>
        </div>
      </div>

      {/* Company Quota Info */}
      <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-sm">
        {user.uname && (
          <div className="text-sm text-red-600 mb-2">
            For more quota, contact us at <a href="mailto:hr@nktech.in" className="text-blue-600 hover:underline">nktech.in</a> for your desired package.
          </div>
        )}
        <div className="text-center font-bold text-gray-700">
          Created <span className="text-[#294a63]">{platformSummary.length}</span> out of{" "}
          <span className="text-[#294a63]">{platformSummary.length + webQuota}</span>
        </div>
      </div>

      {/* Messages */}
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

      {/* Platforms Table */}
      <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase">
              <tr>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5">Platform Name</th>
                <th className="px-6 py-3.5">Link</th>
                <th className="px-6 py-3.5">Total Ratings</th>
                <th className="px-6 py-3.5">Avg Rating</th>
                <th className="px-6 py-3.5">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {platformSummary.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-400 font-medium">
                    No platforms configured yet. Click &quot;Add Platform&quot; to get started.
                  </td>
                </tr>
              ) : (
                platformSummary.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      {p.active === 1 ? (
                        <span title="Active"><CircleDot className="w-4 h-4 text-emerald-500" /></span>
                      ) : (
                        <span title="Inactive"><CircleDot className="w-4 h-4 text-gray-400" /></span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-semibold text-gray-800">{p.webName}</td>
                    <td className="px-6 py-4">
                      <a
                        href={p.webLink.startsWith("http") ? p.webLink : `https://${p.webLink}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline flex items-center space-x-1 text-xs"
                      >
                        <span className="truncate max-w-[200px]">{p.webLink}</span>
                        <ExternalLink className="w-3 h-3 flex-shrink-0" />
                      </a>
                    </td>
                    <td className="px-6 py-4">{p.totalRatings}</td>
                    <td className="px-6 py-4">{p.averageRating}</td>
                    <td className="px-6 py-4 flex items-center space-x-2">
                      <button
                        onClick={() => handleOpenEdit(p)}
                        disabled={isReadOnly}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Edit"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleRemovePlatform(p.id as Id<"websites">, p.webName, p.webLink)}
                        disabled={isReadOnly}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Remove"
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

      {/* Add Platform Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-20">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 relative animate-fade-in">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-gray-800 mb-4">Add New Platform</h3>

            <form onSubmit={handleAddPlatform} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Platform Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Google Reviews"
                  value={newWebName}
                  onChange={(e) => setNewWebName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-[#294a63] focus:border-[#294a63] text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Platform Link</label>
                <input
                  type="url"
                  required
                  placeholder="e.g. https://domainname.com"
                  value={newWebLink}
                  onChange={(e) => setNewWebLink(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-[#294a63] focus:border-[#294a63] text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Subject <span className="text-xs text-gray-400">(optional)</span></label>
                <input
                  type="text"
                  placeholder="Subject"
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-[#294a63] focus:border-[#294a63] text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Description <span className="text-xs text-gray-400">(optional)</span></label>
                <textarea
                  rows={3}
                  placeholder="Description"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-[#294a63] focus:border-[#294a63] text-sm"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-[#294a63] text-white text-sm font-semibold rounded-lg hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {loading ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Platform Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-20">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 relative animate-fade-in">
            <button
              onClick={() => setShowEditModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-gray-800 mb-4">Edit Platform</h3>

            <form onSubmit={handleEditPlatform} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Status</label>
                <select
                  value={editActive}
                  onChange={(e) => setEditActive(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-[#294a63] focus:border-[#294a63] text-sm"
                >
                  <option value={1}>Active</option>
                  <option value={0}>Inactive</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Subject</label>
                <input
                  type="text"
                  value={editSubject}
                  onChange={(e) => setEditSubject(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-[#294a63] focus:border-[#294a63] text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-[#294a63] focus:border-[#294a63] text-sm"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-[#294a63] text-white text-sm font-semibold rounded-lg hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {loading ? "Updating..." : "Update"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
