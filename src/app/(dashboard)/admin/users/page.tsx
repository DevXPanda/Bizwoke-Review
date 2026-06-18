"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { useState, useEffect } from "react";
import {
  Users,
  CheckCircle,
  AlertTriangle,
  UserX,
  UserCheck,
  Search,
  Eye,
  X,
  Building,
  CreditCard,
  Globe,
  Star,
  Share2,
  Key,
  User,
  Save,
  Plus,
  Edit,
  Lock,
} from "lucide-react";
import { Id } from "../../../../../convex/_generated/dataModel";

export default function AdminUsersPage() {
  const user = useQuery(api.users.currentUser);
  const allUsers = useQuery(
    api.users.getAllUsers,
    user ? { currentUserId: user._id } : "skip"
  );
  const activateMutation = useMutation(api.users.activateAccount);
  const deactivateMutation = useMutation(api.users.deactivateAccount);
  const branches = useQuery(api.branches.getBranches);

  const [searchTerm, setSearchTerm] = useState("");
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Inspector Drawer state
  const [selectedUserId, setSelectedUserId] = useState<Id<"users"> | null>(null);

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editUserId, setEditUserId] = useState<Id<"users"> | null>(null);
  const [resetUserId, setResetUserId] = useState<Id<"users"> | null>(null);
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);

  const handleSavedNotify = (msg: string) => {
    setSuccessMsg(msg);
    setErrorMsg(null);
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

  const currentRole = user ? normalizeRole(user.role, user.sadmin, user.admin) : "BRANCH_USER";

  if (user === undefined || allUsers === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#294a63]"></div>
      </div>
    );
  }

  if (!user || (currentRole !== "SUPER_ADMIN" && currentRole !== "BRANCH_ADMIN")) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500 font-semibold">Access Denied. Admins only.</p>
      </div>
    );
  }

  const filtered = (allUsers ?? []).filter((u) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      u.uname.toLowerCase().includes(term) ||
      u.email.toLowerCase().includes(term) ||
      u.mobile.includes(term) ||
      (u.cmpy || "").toLowerCase().includes(term)
    );
  });

  const handleActivate = async (userId: Id<"users">) => {
    setSuccessMsg(null);
    setErrorMsg(null);
    try {
      await activateMutation({ userId });
      setSuccessMsg("User activated");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error";
      setErrorMsg(msg);
      if (msg.includes("UserLimitExceeded")) {
        setIsUpgradeOpen(true);
      }
    }
  };

  const handleDeactivate = async (userId: Id<"users">) => {
    setSuccessMsg(null);
    setErrorMsg(null);
    try {
      await deactivateMutation({ userId });
      setSuccessMsg("User deactivated");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Error");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in relative">
      <div className="bg-white p-6 rounded-xl border border-gray-200/80 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center space-x-2">
            <Users className="w-7 h-7 text-[#294a63]" />
            <span>Manage Users</span>
          </h1>
          <p className="text-gray-500 mt-1">View and manage all registered users.</p>
        </div>
        {(currentRole === "SUPER_ADMIN" || currentRole === "BRANCH_ADMIN") && (
          <button
            onClick={() => setIsAddOpen(true)}
            className="bg-[#294a63] hover:bg-[#1e3547] text-white px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center space-x-2 transition-all shadow-sm self-start md:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add User</span>
          </button>
        )}
      </div>

      {successMsg && (
        <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded text-sm text-emerald-700 flex items-center space-x-2">
          <CheckCircle className="w-5 h-5 flex-shrink-0" /><span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded text-sm text-red-700 flex items-center space-x-2">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" /><span>{errorMsg}</span>
        </div>
      )}

      {/* Search */}
      <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-sm flex items-center space-x-2">
        <Search className="w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search by username, email, mobile..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#294a63]"
        />
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase">
              <tr>
                <th className="px-6 py-3.5">Username</th>
                <th className="px-6 py-3.5">Email</th>
                <th className="px-6 py-3.5">Mobile</th>
                <th className="px-6 py-3.5">Company</th>
                <th className="px-6 py-3.5">Branch</th>
                <th className="px-6 py-3.5">Role</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-400">
                    No users found.
                  </td>
                </tr>
              ) : (
                filtered.map((u) => (
                  <tr key={u._id} className="hover:bg-gray-50/50">
                    <td className="px-6 py-4 font-semibold">{u.uname}</td>
                    <td className="px-6 py-4">{u.email}</td>
                    <td className="px-6 py-4">{u.mobile}</td>
                    <td className="px-6 py-4">{u.cmpy || "—"}</td>
                    <td className="px-6 py-4">{branches?.find((b) => b._id === u.branchId)?.name || "—"}</td>
                    <td className="px-6 py-4 font-medium">{u.role.replace(/_/g, " ").toLowerCase()}</td>
                    <td className="px-6 py-4">
                      {u.active === 1 ? (
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded border border-emerald-100">Active</span>
                      ) : u.active === 2 ? (
                        <span className="px-2 py-0.5 bg-red-50 text-red-700 text-xs font-semibold rounded border border-red-100">Suspended</span>
                      ) : (
                        <span className="px-2 py-0.5 bg-gray-50 text-gray-500 text-xs font-semibold rounded border border-gray-200">Unverified</span>
                      )}
                    </td>
                    <td className="px-6 py-4 flex items-center space-x-2">
                      <button
                        onClick={() => setSelectedUserId(u._id)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Inspect User"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setEditUserId(u._id)}
                        className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                        title="Edit User"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setResetUserId(u._id)}
                        className="p-1.5 text-indigo-650 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Reset Password"
                      >
                        <Lock className="w-4 h-4" />
                      </button>
                      {u.active === 1 ? (
                        <button
                          onClick={() => handleDeactivate(u._id)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Suspend"
                        >
                          <UserX className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleActivate(u._id)}
                          className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="Activate"
                        >
                          <UserCheck className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Drawer overlay */}
      {selectedUserId && (
        <UserDetailDrawer
          userId={selectedUserId}
          onClose={() => setSelectedUserId(null)}
        />
      )}

      {/* Add User Modal overlay */}
      <AddUserModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        callerRole={currentRole}
        callerBranchId={user?.branchId}
        branches={branches}
        onSaved={handleSavedNotify}
        onLimitExceeded={() => setIsUpgradeOpen(true)}
      />

      {/* Edit User Modal overlay */}
      <EditUserModal
        userId={editUserId}
        isOpen={editUserId !== null}
        onClose={() => setEditUserId(null)}
        callerRole={currentRole}
        callerBranchId={user?.branchId}
        branches={branches}
        onSaved={handleSavedNotify}
        onLimitExceeded={() => setIsUpgradeOpen(true)}
      />

      {/* Upgrade Subscription Modal overlay */}
      <UpgradeSubscriptionModal
        isOpen={isUpgradeOpen}
        onClose={() => setIsUpgradeOpen(false)}
        onUpgraded={() => {
          handleSavedNotify("Subscription upgraded successfully!");
          setIsUpgradeOpen(false);
        }}
      />

      {/* Reset Password Modal overlay */}
      <ResetPasswordModal
        userId={resetUserId}
        isOpen={resetUserId !== null}
        onClose={() => setResetUserId(null)}
        onSaved={handleSavedNotify}
      />
    </div>
  );
}

// 7-Tab Inspection Drawer Component
interface UserDetailDrawerProps {
  userId: Id<"users">;
  onClose: () => void;
}

type DetailTab =
  | "profile"
  | "company"
  | "subusers"
  | "quota"
  | "platforms"
  | "reviews"
  | "sentlinks"
  | "account";

function UserDetailDrawer({ userId, onClose }: UserDetailDrawerProps) {
  const details = useQuery(api.users.getAdminUserDetail, { userId });
  const updateQuotaMutation = useMutation(api.users.updateUserQuotaAdmin);
  const updateSubscriptionMutation = useMutation(api.users.updateUserSubscriptionAdmin);

  const [activeTab, setActiveTab] = useState<DetailTab>("profile");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [branchId, setBranchId] = useState<string>("none");
  const branches = useQuery(api.branches.getBranches);
  const caller = useQuery(api.users.currentUser);
  const callerIsSuperAdmin = caller && (caller.role === "SUPER_ADMIN" || caller.role === "sadmin" || caller.sadmin === 1);

  // Quota states
  const [smsQuota, setSmsQuota] = useState(0);
  const [emailQuota, setEmailQuota] = useState(0);
  const [whatsappQuota, setWhatsappQuota] = useState(0);
  const [webQuota, setWebQuota] = useState(0);
  const [amount, setAmount] = useState(0);
  const [balance, setBalance] = useState(0);

  // Subscription states
  const [sub, setSub] = useState(0);
  const [active, setActive] = useState(0);
  const [role, setRole] = useState("user");

  useEffect(() => {
    if (details?.quota) {
      setSmsQuota(details.quota.smsQuota);
      setEmailQuota(details.quota.emailQuota);
      setWhatsappQuota(details.quota.whatsappQuota);
      setWebQuota(details.quota.webQuota);
      setAmount(details.quota.amount || 0);
      setBalance(details.quota.balance || 0);
    } else {
      setSmsQuota(0);
      setEmailQuota(0);
      setWhatsappQuota(0);
      setWebQuota(0);
      setAmount(0);
      setBalance(0);
    }
    if (details?.profile) {
      setSub(details.profile.sub);
      setActive(details.profile.active);
      setRole(details.profile.role);
      setBranchId(details.profile.branchId || "none");
    }
  }, [details]);

  if (details === undefined) {
    return (
      <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-end">
        <div className="bg-white w-full max-w-3xl h-full shadow-2xl flex items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#294a63]"></div>
        </div>
      </div>
    );
  }

  if (details === null) {
    return (
      <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-end">
        <div className="bg-white w-full max-w-3xl h-full shadow-2xl p-6 flex flex-col justify-between">
          <div className="text-center text-red-500 py-12">User details could not be found.</div>
          <button onClick={onClose} className="px-4 py-2 bg-gray-100 rounded">Close</button>
        </div>
      </div>
    );
  }

  const { profile, company, subUsers, quota, platforms, feedbacks, sentLinks } = details;

  const handleSaveQuota = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(null);
    setError(null);
    try {
      await updateQuotaMutation({
        userId,
        smsQuota,
        emailQuota,
        whatsappQuota,
        webQuota,
        amount,
        balance,
      });
      setSuccess("Quotas updated successfully!");
    } catch (err: any) {
      setError(err.message || "Failed to update quota");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(null);
    setError(null);
    try {
      await updateSubscriptionMutation({
        userId,
        sub,
        active,
        role,
        branchId: branchId === "none" ? undefined : branchId as any,
      });
      setSuccess("Account status updated successfully!");
    } catch (err: any) {
      setError(err.message || "Failed to update account status");
    } finally {
      setLoading(false);
    }
  };

  const tabList: { key: DetailTab; label: string; icon: any }[] = [
    { key: "profile", label: "Profile", icon: User },
    { key: "company", label: "Company", icon: Building },
    { key: "subusers", label: "Sub-users", icon: Users },
    { key: "quota", label: "Quota", icon: CreditCard },
    { key: "platforms", label: "Platforms", icon: Globe },
    { key: "reviews", label: "Reviews", icon: Star },
    { key: "sentlinks", label: "Sent Campaigns", icon: Share2 },
    { key: "account", label: "Subscription", icon: Key },
  ];

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-end animate-fade-in">
      <div className="bg-white w-full max-w-4xl h-full shadow-2xl flex flex-col justify-between overflow-hidden animate-slide-in">
        {/* Drawer Header */}
        <div className="bg-[#294a63] text-white p-5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">{profile.uname}&apos;s Workspace Details</h2>
            <p className="text-xs text-blue-100/80 mt-0.5">Admin inspection panel</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Inner Tabs and Content wrapper */}
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar Tabs */}
          <div className="w-56 bg-gray-50 border-r border-gray-150 flex flex-col py-4">
            {tabList.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => {
                    setActiveTab(tab.key);
                    setSuccess(null);
                    setError(null);
                  }}
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

          {/* Main Content Area */}
          <div className="flex-1 p-6 overflow-y-auto bg-white">
            {success && (
              <div className="bg-emerald-50 border-l-4 border-emerald-500 p-3 rounded text-xs text-emerald-700 flex items-center space-x-2 mb-4">
                <CheckCircle className="w-4 h-4" />
                <span>{success}</span>
              </div>
            )}
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded text-xs text-red-700 flex items-center space-x-2 mb-4">
                <AlertTriangle className="w-4 h-4" />
                <span>{error}</span>
              </div>
            )}

            {/* TAB CONTENT: PROFILE */}
            {activeTab === "profile" && (
              <div className="space-y-4">
                <h3 className="text-base font-bold text-gray-800 border-b pb-2">Profile Overview</h3>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <span className="block text-gray-400 font-medium">Username</span>
                    <strong className="text-gray-800 text-sm">{profile.uname}</strong>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <span className="block text-gray-400 font-medium">Email</span>
                    <strong className="text-gray-800 text-sm">{profile.email}</strong>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <span className="block text-gray-400 font-medium">First Name</span>
                    <strong className="text-gray-800 text-sm">{profile.fname || "—"}</strong>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <span className="block text-gray-400 font-medium">Last Name</span>
                    <strong className="text-gray-800 text-sm">{profile.lname || "—"}</strong>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <span className="block text-gray-400 font-medium">Mobile</span>
                    <strong className="text-gray-800 text-sm">{profile.mobile}</strong>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <span className="block text-gray-400 font-medium">Gender</span>
                    <strong className="text-gray-800 text-sm capitalize">{profile.gender || "—"}</strong>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg col-span-2">
                    <span className="block text-gray-400 font-medium">Form rating key</span>
                    <code className="text-[#294a63] font-mono break-all text-xs">{profile.formKey}</code>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg col-span-2">
                    <span className="block text-gray-400 font-medium">Latest Activity Logged</span>
                    <strong className="text-gray-700 font-medium">{profile.latestActivity || "No recorded login yet"}</strong>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: COMPANY */}
            {activeTab === "company" && (
              <div className="space-y-4">
                <h3 className="text-base font-bold text-gray-800 border-b pb-2">Company Configuration</h3>
                {!company ? (
                  <p className="text-xs text-gray-450 italic">No company details configured for this profile yet.</p>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center space-x-4">
                      {company.cmpyLogo ? (
                        <img
                          src={company.cmpyLogo}
                          alt="Logo"
                          className="w-16 h-16 rounded-lg object-contain border p-1"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400">
                          <Building className="w-8 h-8" />
                        </div>
                      )}
                      <div>
                        <strong className="text-gray-800 block text-base">{company.cmpyName}</strong>
                        <span className="text-xs text-gray-400">Company Brand Profile</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-xs mt-2">
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <span className="block text-gray-400 font-medium">Company Contact Mobile</span>
                        <strong className="text-gray-800">{company.cmpyMobile || "—"}</strong>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <span className="block text-gray-400 font-medium">Company Billing Email</span>
                        <strong className="text-gray-800">{company.cmpyEmail || "—"}</strong>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: SUBUSERS */}
            {activeTab === "subusers" && (
              <div className="space-y-4">
                <h3 className="text-base font-bold text-gray-800 border-b pb-2">Sub-users Account Linkages</h3>
                {subUsers.length === 0 ? (
                  <p className="text-xs text-gray-450 italic">No linked sub-user accounts under this admin.</p>
                ) : (
                  <div className="border border-gray-150 rounded-lg overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-50 font-semibold text-gray-500 uppercase">
                        <tr>
                          <th className="p-3">Username</th>
                          <th className="p-3">Email</th>
                          <th className="p-3">Mobile</th>
                          <th className="p-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y text-gray-700">
                        {subUsers.map((su) => (
                          <tr key={su._id} className="hover:bg-gray-55">
                            <td className="p-3 font-semibold">{su.uname}</td>
                            <td className="p-3">{su.email}</td>
                            <td className="p-3">{su.mobile}</td>
                            <td className="p-3">
                              {su.active === 1 ? (
                                <span className="text-emerald-700 font-medium">Active</span>
                              ) : su.active === 2 ? (
                                <span className="text-red-650 font-medium">Suspended</span>
                              ) : (
                                <span className="text-gray-500">Unverified</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: QUOTA EDIT */}
            {activeTab === "quota" && (
              <form onSubmit={handleSaveQuota} className="space-y-4">
                <h3 className="text-base font-bold text-gray-800 border-b pb-2">Modify Quota Credits</h3>
                
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-gray-500 font-semibold mb-1">Email Send Quota</label>
                    <input
                      type="number"
                      required
                      value={emailQuota}
                      onChange={(e) => setEmailQuota(Number(e.target.value))}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-[#294a63]"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-500 font-semibold mb-1">SMS Send Quota</label>
                    <input
                      type="number"
                      required
                      value={smsQuota}
                      onChange={(e) => setSmsQuota(Number(e.target.value))}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-[#294a63]"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-500 font-semibold mb-1">WhatsApp Invite Quota</label>
                    <input
                      type="number"
                      required
                      value={whatsappQuota}
                      onChange={(e) => setWhatsappQuota(Number(e.target.value))}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-[#294a63]"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-500 font-semibold mb-1">Website Register Quota</label>
                    <input
                      type="number"
                      required
                      value={webQuota}
                      onChange={(e) => setWebQuota(Number(e.target.value))}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-[#294a63]"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-500 font-semibold mb-1">Plan Price / Amount (INR)</label>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(Number(e.target.value))}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-[#294a63]"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-500 font-semibold mb-1">Pending Balance / Due (INR)</label>
                    <input
                      type="number"
                      value={balance}
                      onChange={(e) => setBalance(Number(e.target.value))}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-[#294a63]"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2 border-t">
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-[#294a63] text-white text-xs font-semibold rounded-lg hover:bg-opacity-95 flex items-center space-x-1.5"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Quotas</span>
                  </button>
                </div>
              </form>
            )}

            {/* TAB CONTENT: PLATFORMS */}
            {activeTab === "platforms" && (
              <div className="space-y-4">
                <h3 className="text-base font-bold text-gray-800 border-b pb-2">Configured Review Platforms</h3>
                {platforms.length === 0 ? (
                  <p className="text-xs text-gray-450 italic">No platforms configured by this user.</p>
                ) : (
                  <div className="border border-gray-150 rounded-lg overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-50 font-semibold text-gray-500 uppercase">
                        <tr>
                          <th className="p-3">Platform Name</th>
                          <th className="p-3">Platform Link</th>
                          <th className="p-3">Rating Score</th>
                          <th className="p-3">Review Count</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y text-gray-700">
                        {platforms.map((p) => (
                          <tr key={p._id} className="hover:bg-gray-55">
                            <td className="p-3 font-semibold">{p.webName}</td>
                            <td className="p-3 font-mono break-all">{p.webLink}</td>
                            <td className="p-3">{p.totalRatings > 0 ? (p.starRating / p.totalRatings).toFixed(1) : "—"}</td>
                            <td className="p-3">{p.totalRatings}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: REVIEWS */}
            {activeTab === "reviews" && (
              <div className="space-y-4">
                <h3 className="text-base font-bold text-gray-800 border-b pb-2">Customer Feedback / Reviews</h3>
                {feedbacks.length === 0 ? (
                  <p className="text-xs text-gray-450 italic">No feedback received yet.</p>
                ) : (
                  <div className="space-y-3">
                    {feedbacks.map((f) => (
                      <div key={f._id} className="border border-gray-200 rounded-lg p-3 text-xs space-y-1.5 hover:bg-gray-50/50">
                        <div className="flex items-center justify-between">
                          <strong className="text-gray-800 text-sm">{f.name} ({f.mobile})</strong>
                          <div className="flex items-center text-amber-500 space-x-0.5">
                            {Array.from({ length: f.star }).map((_, idx) => (
                              <Star key={idx} className="w-3.5 h-3.5 fill-amber-400" />
                            ))}
                          </div>
                        </div>
                        <p className="text-gray-600 font-medium italic bg-gray-50 p-2 rounded">&quot;{f.review || "No review content provided."}&quot;</p>
                        <div className="flex items-center justify-between text-[10px] text-gray-450 mt-1">
                          <span>Channel: <strong>{f.webName}</strong></span>
                          <span>IP logged: <strong>{f.userIp}</strong></span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: SENT LINKS */}
            {activeTab === "sentlinks" && (
              <div className="space-y-4">
                <h3 className="text-base font-bold text-gray-800 border-b pb-2">Sent Invite Logs</h3>
                {sentLinks.length === 0 ? (
                  <p className="text-xs text-gray-450 italic">No campaigns sent yet.</p>
                ) : (
                  <div className="border border-gray-150 rounded-lg overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-50 font-semibold text-gray-500 uppercase">
                        <tr>
                          <th className="p-3">Type</th>
                          <th className="p-3">Recipient</th>
                          <th className="p-3">Subject / Campaign</th>
                          <th className="p-3">Message Body</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y text-gray-700">
                        {sentLinks.map((sl) => (
                          <tr key={sl._id} className="hover:bg-gray-55">
                            <td className="p-3 capitalize font-semibold text-[#294a63]">{sl.linkFor}</td>
                            <td className="p-3">{sl.sentToEmail || sl.sentToSms || "—"}</td>
                            <td className="p-3 max-w-[150px] truncate">{sl.subj || "—"}</td>
                            <td className="p-3 max-w-[200px] truncate" title={sl.body}>{sl.body}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: SUBSCRIPTION & ACTIVE STATUS MANAGEMENT */}
            {activeTab === "account" && (
              <form onSubmit={handleSaveAccount} className="space-y-4">
                <h3 className="text-base font-bold text-gray-800 border-b pb-2">Manage Workspace Status</h3>
                
                <div className="space-y-3.5 text-xs">
                  <div>
                    <label className="block text-gray-500 font-semibold mb-1">Subscription Plan Active Status</label>
                    <select
                      value={sub}
                      onChange={(e) => setSub(Number(e.target.value))}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-[#294a63] bg-white text-sm"
                    >
                      <option value={1}>Active Subscription (Plan Active)</option>
                      <option value={0}>Inactive Subscription (No active plan)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-500 font-semibold mb-1">User Status</label>
                    <select
                      value={active}
                      onChange={(e) => setActive(Number(e.target.value))}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-[#294a63] bg-white text-sm"
                    >
                      <option value={1}>Active & Verified</option>
                      <option value={0}>Pending Verification (Unverified)</option>
                      <option value={2}>Suspended (Access Terminated)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-500 font-semibold mb-1">Authorization Privilege Role</label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-[#294a63] bg-white text-sm animate-fade-in"
                    >
                      {callerIsSuperAdmin ? (
                        <>
                          <option value="SUPER_ADMIN">Super Admin</option>
                          <option value="BRANCH_ADMIN">Branch Admin</option>
                          <option value="BRANCH_USER">Branch User</option>
                          <option value="sadmin">sadmin (Legacy Super Admin)</option>
                          <option value="admin">admin (Legacy Company Admin)</option>
                          <option value="user">user (Legacy User)</option>
                        </>
                      ) : (
                        <option value="BRANCH_USER">Branch User</option>
                      )}
                    </select>
                  </div>

                  {callerIsSuperAdmin && (
                    <div>
                      <label className="block text-gray-500 font-semibold mb-1">Assigned Branch</label>
                      <select
                        value={branchId}
                        onChange={(e) => setBranchId(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-[#294a63] bg-white text-sm"
                      >
                        <option value="none">No Branch (Unassigned)</option>
                        {branches?.map((b) => (
                          <option key={b._id} value={b._id}>
                            {b.name} ({b.code})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="flex justify-end pt-2 border-t mt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-[#294a63] text-white text-xs font-semibold rounded-lg hover:bg-opacity-95 flex items-center space-x-1.5"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Status</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="bg-gray-50 p-4 border-t flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-gray-200 text-xs font-semibold text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// Add User Modal Component
// ==========================================
// ==========================================
// Upgrade Subscription Modal Component
// ==========================================
interface UpgradeSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgraded: () => void;
}

function UpgradeSubscriptionModal({ isOpen, onClose, onUpgraded }: UpgradeSubscriptionModalProps) {
  const packages = useQuery(api.pricing.getPricingPackages);
  const upgradeMutation = useMutation(api.users.upgradeSubscription);

  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleUpgrade = async (packageId: Id<"pricing">, packageName: string) => {
    setError(null);
    setLoadingId(packageId);
    try {
      await upgradeMutation({ pricingPackageId: packageId });
      onUpgraded();
    } catch (err: any) {
      setError(err.message || "Failed to upgrade subscription");
    } finally {
      setLoadingId(null);
    }
  };

  const activePackages = packages?.filter((p) => p.status === "active").sort((a, b) => a.displayOrder - b.displayOrder) || [];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[60] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-gray-150 flex flex-col my-8 animate-scale-in overflow-hidden">
        {/* Header */}
        <div className="bg-[#294a63] text-white p-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-extrabold flex items-center space-x-2.5">
              <CreditCard className="w-6 h-6 animate-pulse" />
              <span>Upgrade Subscription Plan</span>
            </h2>
            <p className="text-xs text-blue-155 mt-1">Unlock more user seats and raise your monthly credit limits</p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh]">
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg text-xs text-red-707 flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="text-center max-w-md mx-auto space-y-2 mb-2">
            <h3 className="text-lg font-bold text-gray-850">Choose a higher-tier package</h3>
            <p className="text-xs text-gray-500">You have reached the maximum number of active seats for your current plan. Upgrade now to scale your business operations instantly.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {activePackages.map((p) => (
              <div
                key={p._id}
                className={`bg-white rounded-2xl border p-5 flex flex-col justify-between transition-all duration-300 relative shadow-sm hover:shadow-md ${
                  p.popularBadge
                    ? "border-[#294a63] ring-1 ring-[#294a63] scale-[1.02] md:scale-105"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                {p.popularBadge && (
                  <span className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-[#294a63] text-white px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider shadow">
                    Most Popular
                  </span>
                )}

                <div className="space-y-4">
                  <div className="text-center">
                    <h4 className="font-extrabold text-gray-800 text-sm tracking-wide">{p.packageName}</h4>
                    <span className="text-[10px] text-gray-400 block mt-0.5 uppercase tracking-wider">{p.category}</span>
                  </div>

                  <div className="text-center py-2 bg-gray-50/50 rounded-xl border border-gray-100">
                    <div className="text-2xl font-black text-gray-900">
                      ₹{p.price}
                    </div>
                    <span className="text-[9px] text-gray-400 font-semibold uppercase tracking-wider">Per {p.billingType}</span>
                  </div>

                  <div className="py-2.5 px-3 bg-[#294a63]/5 rounded-xl border border-[#294a63]/10 text-center">
                    <strong className="text-[#294a63] text-sm block">{p.maxUsers} Active Seats</strong>
                    <span className="text-[9px] text-gray-400">Total staff user accounts</span>
                  </div>

                  <ul className="text-xs text-gray-655 space-y-2 pt-2 divide-y divide-gray-50">
                    {p.featuresList.map((feature, i) => (
                      <li key={i} className="pt-1.5 flex items-center space-x-1.5 truncate" title={feature}>
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  onClick={() => handleUpgrade(p._id, p.packageName)}
                  disabled={loadingId !== null}
                  className={`mt-6 w-full py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center space-x-2 ${
                    p.popularBadge
                      ? "bg-[#294a63] hover:bg-opacity-95 text-white"
                      : "bg-white border border-[#294a63] text-[#294a63] hover:bg-[#294a63] hover:text-white"
                  }`}
                >
                  {loadingId === p._id ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-current"></div>
                  ) : (
                    <span>Choose Plan</span>
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 p-4 border-t flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-white border border-gray-200 text-xs font-semibold text-gray-700 rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
          >
            Cancel & Close
          </button>
        </div>
      </div>
    </div>
  );
}

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  callerRole: string;
  callerBranchId?: string;
  branches?: any[];
  onSaved: (msg: string) => void;
  onLimitExceeded: () => void;
}

function AddUserModal({
  isOpen,
  onClose,
  callerRole,
  callerBranchId,
  branches,
  onSaved,
  onLimitExceeded,
}: AddUserModalProps) {
  const createUserMutation = useMutation(api.users.createUserByAdmin);

  const [fname, setFname] = useState("");
  const [lname, setLname] = useState("");
  const [uname, setUname] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("BRANCH_USER");
  const [branchId, setBranchId] = useState("");
  const [active, setActive] = useState(1);
  const [cmpyName, setCmpyName] = useState("");
  const [cmpyEmail, setCmpyEmail] = useState("");
  const [cmpyMobile, setCmpyMobile] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const activeBranches = branches?.filter((b) => !b.deleted && b.active === 1) || [];

  useEffect(() => {
    if (isOpen) {
      setFname("");
      setLname("");
      setUname("");
      setEmail("");
      setMobile("");
      setPassword("");
      setConfirmPassword("");
      setRole("BRANCH_USER");
      setBranchId(callerRole === "BRANCH_ADMIN" && callerBranchId ? callerBranchId : "");
      setActive(1);
      setCmpyName("");
      setCmpyEmail("");
      setCmpyMobile("");
      setError(null);
    }
  }, [isOpen, callerRole, callerBranchId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (password.length < 6) {
      setError("Password must be at least 6 characters long");
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    const targetBranch = callerRole === "BRANCH_ADMIN" ? callerBranchId : branchId;
    const isBranchRole = role === "BRANCH_ADMIN" || role === "BRANCH_USER";
    if (isBranchRole && !targetBranch) {
      setError("Branch selection is mandatory for branch roles");
      setLoading(false);
      return;
    }

    try {
      await createUserMutation({
        fname,
        lname,
        uname: uname.trim(),
        email: email.trim(),
        mobile: mobile.trim(),
        password,
        role,
        branchId: isBranchRole ? (targetBranch as any) : undefined,
        active,
        cmpyName: cmpyName.trim() || undefined,
        cmpyEmail: cmpyEmail.trim() || undefined,
        cmpyMobile: cmpyMobile.trim() || undefined,
      });
      onSaved("User created successfully!");
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to create user");
      if (err.message?.includes("UserLimitExceeded")) {
        onClose();
        onLimitExceeded();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/55 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-gray-150 flex flex-col my-8 animate-slide-in overflow-hidden">
        {/* Modal Header */}
        <div className="bg-[#294a63] text-white p-5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold flex items-center space-x-2">
              <Users className="w-5 h-5" />
              <span>Add New User</span>
            </h2>
            <p className="text-xs text-blue-100/80 mt-0.5">Register a new user in the system</p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Modal Content */}
        <form onSubmit={handleSubmit} className="flex-1 p-6 space-y-6 overflow-y-auto max-h-[70vh]">
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-3.5 rounded text-xs text-red-700 flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Section: Basic Information */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 border-b pb-1">Basic Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-500 text-xs font-semibold mb-1">First Name *</label>
                <input
                  type="text"
                  required
                  value={fname}
                  onChange={(e) => setFname(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-[#294a63] focus:outline-none"
                  placeholder="John"
                />
              </div>
              <div>
                <label className="block text-gray-500 text-xs font-semibold mb-1">Last Name *</label>
                <input
                  type="text"
                  required
                  value={lname}
                  onChange={(e) => setLname(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-[#294a63] focus:outline-none"
                  placeholder="Doe"
                />
              </div>
              <div>
                <label className="block text-gray-500 text-xs font-semibold mb-1">Username *</label>
                <input
                  type="text"
                  required
                  value={uname}
                  onChange={(e) => setUname(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-[#294a63] focus:outline-none"
                  placeholder="johndoe"
                />
              </div>
              <div>
                <label className="block text-gray-500 text-xs font-semibold mb-1">Email *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-[#294a63] focus:outline-none"
                  placeholder="johndoe@example.com"
                />
              </div>
              <div>
                <label className="block text-gray-500 text-xs font-semibold mb-1">Mobile Number *</label>
                <input
                  type="tel"
                  required
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-[#294a63] focus:outline-none"
                  placeholder="1234567890"
                />
              </div>
              <div>
                <label className="block text-gray-500 text-xs font-semibold mb-1">Status</label>
                <select
                  value={active}
                  onChange={(e) => setActive(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:ring-1 focus:ring-[#294a63] focus:outline-none"
                >
                  <option value={1}>Active</option>
                  <option value={2}>Suspended</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-500 text-xs font-semibold mb-1">Password *</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-[#294a63] focus:outline-none"
                  placeholder="Minimum 6 characters"
                />
              </div>
              <div>
                <label className="block text-gray-500 text-xs font-semibold mb-1">Confirm Password *</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-[#294a63] focus:outline-none"
                  placeholder="Confirm password"
                />
              </div>
            </div>
          </div>

          {/* Section: Roles and Assignments */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 border-b pb-1">Role & Branch Assignment</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-500 text-xs font-semibold mb-1">Role Assignment</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  disabled={callerRole === "BRANCH_ADMIN"}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:ring-1 focus:ring-[#294a63] focus:outline-none disabled:bg-gray-50 disabled:text-gray-500"
                >
                  {callerRole === "SUPER_ADMIN" ? (
                    <>
                      <option value="BRANCH_USER">branch user</option>
                      <option value="BRANCH_ADMIN">branch admin</option>
                      <option value="SUPER_ADMIN">super admin</option>
                    </>
                  ) : (
                    <option value="BRANCH_USER">branch user</option>
                  )}
                </select>
              </div>

              {callerRole === "SUPER_ADMIN" && (role === "BRANCH_ADMIN" || role === "BRANCH_USER") && (
                <div>
                  <label className="block text-gray-500 text-xs font-semibold mb-1">Branch Assignment *</label>
                  <select
                    value={branchId}
                    required
                    onChange={(e) => setBranchId(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:ring-1 focus:ring-[#294a63] focus:outline-none"
                  >
                    <option value="">Select a branch...</option>
                    {activeBranches.map((b) => (
                      <option key={b._id} value={b._id}>
                        {b.name} ({b.code})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Section: Company Information (Optional) */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 border-b pb-1">Company Information (Optional)</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-3">
                <label className="block text-gray-500 text-xs font-semibold mb-1">Company Name</label>
                <input
                  type="text"
                  value={cmpyName}
                  onChange={(e) => setCmpyName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-[#294a63] focus:outline-none"
                  placeholder="e.g. Acme Corp"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-gray-500 text-xs font-semibold mb-1">Company Email</label>
                <input
                  type="email"
                  value={cmpyEmail}
                  onChange={(e) => setCmpyEmail(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-[#294a63] focus:outline-none"
                  placeholder="billing@acme.com"
                />
              </div>
              <div>
                <label className="block text-gray-500 text-xs font-semibold mb-1">Company Mobile</label>
                <input
                  type="tel"
                  value={cmpyMobile}
                  onChange={(e) => setCmpyMobile(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-[#294a63] focus:outline-none"
                  placeholder="9876543210"
                />
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-[#294a63] hover:bg-[#1e3547] text-white px-5 py-2 rounded-lg text-sm font-semibold flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Create User</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ==========================================
// Edit User Modal Component
// ==========================================
interface EditUserModalProps {
  userId: Id<"users"> | null;
  isOpen: boolean;
  onClose: () => void;
  callerRole: string;
  callerBranchId?: string;
  branches?: any[];
  onSaved: (msg: string) => void;
  onLimitExceeded: () => void;
}

function EditUserModal({
  userId,
  isOpen,
  onClose,
  callerRole,
  callerBranchId,
  branches,
  onSaved,
  onLimitExceeded,
}: EditUserModalProps) {
  const details = useQuery(api.users.getAdminUserDetail, userId ? { userId } : "skip");
  const editUserMutation = useMutation(api.users.editUserByAdmin);

  const [fname, setFname] = useState("");
  const [lname, setLname] = useState("");
  const [uname, setUname] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [role, setRole] = useState("BRANCH_USER");
  const [branchId, setBranchId] = useState("");
  const [active, setActive] = useState(1);
  const [cmpyName, setCmpyName] = useState("");
  const [cmpyEmail, setCmpyEmail] = useState("");
  const [cmpyMobile, setCmpyMobile] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const activeBranches = branches?.filter((b) => !b.deleted && b.active === 1) || [];

  useEffect(() => {
    if (details && isOpen) {
      setFname(details.profile.fname || "");
      setLname(details.profile.lname || "");
      setUname(details.profile.uname || "");
      setEmail(details.profile.email || "");
      setMobile(details.profile.mobile || "");
      setRole(details.profile.role || "BRANCH_USER");
      setBranchId(details.profile.branchId || "");
      setActive(details.profile.active || 1);
      setCmpyName(details.company?.cmpyName || "");
      setCmpyEmail(details.company?.cmpyEmail || "");
      setCmpyMobile(details.company?.cmpyMobile || "");
      setError(null);
    }
  }, [details, isOpen]);

  if (!isOpen || !userId) return null;

  if (details === undefined) {
    return (
      <div className="fixed inset-0 bg-black/55 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-2xl rounded-2xl p-8 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#294a63]"></div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const targetBranch = callerRole === "BRANCH_ADMIN" ? callerBranchId : branchId;
    const isBranchRole = role === "BRANCH_ADMIN" || role === "BRANCH_USER";
    if (isBranchRole && !targetBranch) {
      setError("Branch selection is mandatory for branch roles");
      setLoading(false);
      return;
    }

    try {
      await editUserMutation({
        userId,
        fname,
        lname,
        uname: uname.trim(),
        email: email.trim(),
        mobile: mobile.trim(),
        role,
        branchId: isBranchRole ? (targetBranch as any) : undefined,
        active,
        cmpyName: cmpyName.trim() || undefined,
        cmpyEmail: cmpyEmail.trim() || undefined,
        cmpyMobile: cmpyMobile.trim() || undefined,
      });
      onSaved("User updated successfully!");
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to update user");
      if (err.message?.includes("UserLimitExceeded")) {
        onClose();
        onLimitExceeded();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/55 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-gray-150 flex flex-col my-8 animate-slide-in overflow-hidden">
        {/* Modal Header */}
        <div className="bg-[#294a63] text-white p-5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold flex items-center space-x-2">
              <Edit className="w-5 h-5" />
              <span>Edit User</span>
            </h2>
            <p className="text-xs text-blue-100/80 mt-0.5">Modify profile and configuration for {uname}</p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Modal Content */}
        <form onSubmit={handleSubmit} className="flex-1 p-6 space-y-6 overflow-y-auto max-h-[70vh]">
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-3.5 rounded text-xs text-red-700 flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Section: Basic Information */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 border-b pb-1">Basic Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-500 text-xs font-semibold mb-1">First Name *</label>
                <input
                  type="text"
                  required
                  value={fname}
                  onChange={(e) => setFname(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-[#294a63] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-gray-500 text-xs font-semibold mb-1">Last Name *</label>
                <input
                  type="text"
                  required
                  value={lname}
                  onChange={(e) => setLname(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-[#294a63] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-gray-500 text-xs font-semibold mb-1">Username *</label>
                <input
                  type="text"
                  required
                  value={uname}
                  onChange={(e) => setUname(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-[#294a63] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-gray-500 text-xs font-semibold mb-1">Email *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-[#294a63] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-gray-500 text-xs font-semibold mb-1">Mobile Number *</label>
                <input
                  type="tel"
                  required
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-[#294a63] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-gray-500 text-xs font-semibold mb-1">Status</label>
                <select
                  value={active}
                  onChange={(e) => setActive(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:ring-1 focus:ring-[#294a63] focus:outline-none"
                >
                  <option value={1}>Active</option>
                  <option value={2}>Suspended</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section: Roles and Assignments */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 border-b pb-1">Role & Branch Assignment</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-500 text-xs font-semibold mb-1">Role Assignment</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  disabled={callerRole === "BRANCH_ADMIN"}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:ring-1 focus:ring-[#294a63] focus:outline-none disabled:bg-gray-55 disabled:text-gray-500"
                >
                  {callerRole === "SUPER_ADMIN" ? (
                    <>
                      <option value="BRANCH_USER">branch user</option>
                      <option value="BRANCH_ADMIN">branch admin</option>
                      <option value="SUPER_ADMIN">super admin</option>
                    </>
                  ) : (
                    <option value="BRANCH_USER">branch user</option>
                  )}
                </select>
              </div>

              {callerRole === "SUPER_ADMIN" && (role === "BRANCH_ADMIN" || role === "BRANCH_USER") && (
                <div>
                  <label className="block text-gray-500 text-xs font-semibold mb-1">Branch Assignment *</label>
                  <select
                    value={branchId}
                    required
                    onChange={(e) => setBranchId(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:ring-1 focus:ring-[#294a63] focus:outline-none"
                  >
                    <option value="">Select a branch...</option>
                    {activeBranches.map((b) => (
                      <option key={b._id} value={b._id}>
                        {b.name} ({b.code})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Section: Company Information (Optional) */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 border-b pb-1">Company Information (Optional)</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-3">
                <label className="block text-gray-500 text-xs font-semibold mb-1">Company Name</label>
                <input
                  type="text"
                  value={cmpyName}
                  onChange={(e) => setCmpyName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-[#294a63] focus:outline-none"
                  placeholder="e.g. Acme Corp"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-gray-500 text-xs font-semibold mb-1">Company Email</label>
                <input
                  type="email"
                  value={cmpyEmail}
                  onChange={(e) => setCmpyEmail(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-[#294a63] focus:outline-none"
                  placeholder="billing@acme.com"
                />
              </div>
              <div>
                <label className="block text-gray-500 text-xs font-semibold mb-1">Company Mobile</label>
                <input
                  type="tel"
                  value={cmpyMobile}
                  onChange={(e) => setCmpyMobile(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-[#294a63] focus:outline-none"
                  placeholder="9876543210"
                />
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-semibold text-gray-650 hover:bg-gray-55 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-[#294a63] hover:bg-[#1e3547] text-white px-5 py-2 rounded-lg text-sm font-semibold flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ==========================================
// Reset Password Modal Component
// ==========================================
interface ResetPasswordModalProps {
  userId: Id<"users"> | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: (msg: string) => void;
}

function ResetPasswordModal({
  userId,
  isOpen,
  onClose,
  onSaved,
}: ResetPasswordModalProps) {
  const resetPasswordMutation = useMutation(api.users.resetPasswordAdmin);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPassword("");
      setConfirmPassword("");
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen || !userId) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (password.length < 6) {
      setError("Password must be at least 6 characters long");
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    try {
      await resetPasswordMutation({ userId, newPassword: password });
      onSaved("Password reset successfully!");
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/55 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-gray-150 overflow-hidden animate-slide-in">
        {/* Header */}
        <div className="bg-[#294a63] text-white p-5 flex items-center justify-between">
          <h2 className="text-lg font-bold flex items-center space-x-2">
            <Lock className="w-5 h-5" />
            <span>Reset Password</span>
          </h2>
          <button type="button" onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded text-xs text-red-700 flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-gray-500 text-xs font-semibold mb-1">New Password *</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-[#294a63] focus:outline-none"
              placeholder="Minimum 6 characters"
            />
          </div>

          <div>
            <label className="block text-gray-500 text-xs font-semibold mb-1">Confirm New Password *</label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-[#294a63] focus:outline-none"
              placeholder="Confirm new password"
            />
          </div>

          {/* Footer */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-semibold text-gray-650 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-[#294a63] hover:bg-[#1e3547] text-white px-5 py-2 rounded-lg text-sm font-semibold flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
              ) : (
                <span>Reset Password</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

