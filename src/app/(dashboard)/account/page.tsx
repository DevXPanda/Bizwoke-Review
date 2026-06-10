"use client";

import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useState, useEffect } from "react";
import {
  User,
  Lock,
  CheckCircle,
  AlertTriangle,
  Copy,
  Globe,
  Smartphone,
  Mail,
  Share2,
} from "lucide-react";

export default function AccountPage() {
  const dashData = useQuery(api.reviews.getDashboardData);
  const user = useQuery(api.users.currentUser);
  const updateProfileMutation = useMutation(api.users.updateProfile);
  const updatePasswordMutation = useMutation(api.users.updatePassword);

  const createOrderAction = useAction(api.razorpay.createRazorpayOrder);
  const verifyPaymentAction = useAction(api.razorpay.verifyRazorpayPayment);

  // Profile edit state
  const [editMode, setEditMode] = useState(false);
  const [fname, setFname] = useState("");
  const [lname, setLname] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [gender, setGender] = useState("");
  const [dob, setDob] = useState("");

  // Company Settings state
  const companyInfo = useQuery(api.companies.getCompanyInfo, user ? { userId: user._id } : "skip");
  const updateCompanyMutation = useMutation(api.companies.updateCompanyDetails);
  const generateUploadUrl = useMutation(api.companies.generateUploadUrl);

  const [cmpyEditMode, setCmpyEditMode] = useState(false);
  const [cmpyName, setCmpyName] = useState("");
  const [cmpyEmail, setCmpyEmail] = useState("");
  const [cmpyMobile, setCmpyMobile] = useState("");
  const [cmpyLogoUrl, setCmpyLogoUrl] = useState("");
  const [cmpyLogoFile, setCmpyLogoFile] = useState<File | null>(null);

  useEffect(() => {
    if (companyInfo) {
      setCmpyName(companyInfo.cmpyName || "");
      setCmpyEmail(companyInfo.cmpyEmail || "");
      setCmpyMobile(companyInfo.cmpyMobile || "");
      setCmpyLogoUrl(companyInfo.cmpyLogo || "");
    }
  }, [companyInfo]);

  // Password change state
  const [showPwdForm, setShowPwdForm] = useState(false);
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");

  // UI state
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  if (dashData === undefined || user === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#294a63]"></div>
      </div>
    );
  }

  if (dashData === null || user === null) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500 font-semibold">Failed to load session.</p>
      </div>
    );
  }

  const { quota } = dashData;
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const reviewLink = `${baseUrl}/wtr/${user.formKey}`;

  const handlePayment = async () => {
    if (!quota?.balance || quota.balance <= 0) return;
    clearMessages();
    setLoading(true);

    try {
      const order = await createOrderAction({
        amount: quota.balance,
        currency: "INR",
      });

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_51lm1hx8EXAMPLE",
        amount: order.amount,
        currency: order.currency,
        name: "Bizorm Reviews",
        description: "Review Plan Payment",
        order_id: order.id,
        handler: async function (response: any) {
          setLoading(true);
          try {
            const verification = await verifyPaymentAction({
              userId: user._id,
              formKey: user.formKey,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpayOrderId: response.razorpay_order_id,
              razorpaySignature: response.razorpay_signature,
            });

            if (verification.success) {
              setSuccessMsg("Payment verified and quota updated successfully!");
            } else {
              setErrorMsg("Payment verification failed. Please contact support.");
            }
          } catch (err: any) {
            setErrorMsg(err.message || "Error during payment verification");
          } finally {
            setLoading(false);
          }
        },
        prefill: {
          name: user.fname ? `${user.fname} ${user.lname || ""}`.trim() : user.uname,
          email: user.email,
          contact: user.mobile,
        },
        theme: {
          color: "#294a63",
        },
      };

      const rzp1 = new (window as any).Razorpay(options);
      rzp1.open();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to initiate payment");
    } finally {
      setLoading(false);
    }
  };

  const clearMessages = () => {
    setSuccessMsg(null);
    setErrorMsg(null);
  };

  const handleEnableEdit = () => {
    setFname(user.fname || "");
    setLname(user.lname || "");
    setEmail(user.email);
    setMobile(user.mobile);
    setGender(user.gender || "");
    setDob(user.dob || "");
    setEditMode(true);
    clearMessages();
  };

  const handleEnableCmpyEdit = () => {
    if (companyInfo) {
      setCmpyName(companyInfo.cmpyName || "");
      setCmpyEmail(companyInfo.cmpyEmail || "");
      setCmpyMobile(companyInfo.cmpyMobile || "");
      setCmpyLogoUrl(companyInfo.cmpyLogo || "");
    }
    setCmpyEditMode(true);
    clearMessages();
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    if (!email.trim()) {
      setErrorMsg("Email is required");
      return;
    }
    if (mobile.length !== 10) {
      setErrorMsg("Mobile must be exactly 10 digits");
      return;
    }

    setLoading(true);
    try {
      await updateProfileMutation({
        userId: user._id,
        fname: fname.trim(),
        lname: lname.trim(),
        email: email.trim(),
        mobile: mobile.trim(),
        gender,
        dob,
      });
      setSuccessMsg("Profile updated successfully");
      setEditMode(false);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Error updating profile";
      setErrorMsg(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    if (!cmpyName.trim()) {
      setErrorMsg("Company Name is required");
      return;
    }
    if (cmpyMobile && cmpyMobile.length !== 10) {
      setErrorMsg("Company Mobile must be exactly 10 digits");
      return;
    }

    setLoading(true);
    try {
      let logoUrl = cmpyLogoUrl;

      if (cmpyLogoFile) {
        const uploadUrl = await generateUploadUrl();
        const response = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": cmpyLogoFile.type },
          body: cmpyLogoFile,
        });
        if (!response.ok) throw new Error("Failed to upload logo file");
        const resJson = await response.json();
        logoUrl = resJson.storageId;
      }

      await updateCompanyMutation({
        userId: user._id,
        cmpyName: cmpyName.trim(),
        cmpyEmail: cmpyEmail.trim(),
        cmpyMobile: cmpyMobile.trim(),
        cmpyLogo: logoUrl,
      });

      setSuccessMsg("Company details updated successfully");
      setCmpyEditMode(false);
      setCmpyLogoFile(null);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Error updating company details");
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    if (!currentPwd || !newPwd) {
      setErrorMsg("All password fields are required");
      return;
    }
    if (newPwd !== confirmPwd) {
      setErrorMsg("New passwords do not match");
      return;
    }
    if (newPwd.length < 6) {
      setErrorMsg("New password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      const res = await updatePasswordMutation({
        userId: user._id,
        currentPwd,
        newPwd,
      });
      if (res) {
        setSuccessMsg("Password changed successfully");
        setShowPwdForm(false);
        setCurrentPwd("");
        setNewPwd("");
        setConfirmPwd("");
      } else {
        setErrorMsg("Current password is incorrect");
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Error changing password";
      setErrorMsg(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(reviewLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="bg-white p-6 rounded-xl border border-gray-200/80 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-800">My Account</h1>
        <p className="text-gray-500 mt-1">View and manage your profile, quotas, and review link.</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          {/* Profile Info */}
          <div className="bg-white p-6 rounded-xl border border-gray-200/80 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-800 flex items-center space-x-2">
                <User className="w-5 h-5 text-[#294a63]" />
                <span>Personal Info</span>
              </h2>
              {!editMode && (
                <button
                  onClick={handleEnableEdit}
                  className="text-sm font-semibold text-[#294a63] hover:underline"
                >
                  Edit
                </button>
              )}
            </div>

            {!editMode ? (
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Username</span>
                  <span className="font-semibold text-gray-800">{user.uname}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">First Name</span>
                  <span className="font-semibold text-gray-800">{user.fname || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Last Name</span>
                  <span className="font-semibold text-gray-800">{user.lname || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Email</span>
                  <span className="font-semibold text-gray-800">{user.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Mobile</span>
                  <span className="font-semibold text-gray-800">{user.mobile}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Gender</span>
                  <span className="font-semibold text-gray-800">{user.gender || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Date of Birth</span>
                  <span className="font-semibold text-gray-800">{user.dob || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Role</span>
                  <span className="font-semibold text-gray-800 capitalize">{user.role}</span>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">First Name</label>
                    <input
                      type="text"
                      value={fname}
                      onChange={(e) => setFname(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#294a63]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Last Name</label>
                    <input
                      type="text"
                      value={lname}
                      onChange={(e) => setLname(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#294a63]"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#294a63]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Mobile</label>
                  <input
                    type="number"
                    required
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#294a63]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Gender</label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#294a63]"
                    >
                      <option value="">Select</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Date of Birth</label>
                    <input
                      type="date"
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#294a63]"
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setEditMode(false)}
                    className="px-4 py-2 text-sm font-semibold text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-[#294a63] text-white text-sm font-semibold rounded-lg hover:bg-opacity-90 disabled:opacity-50 transition-all"
                  >
                    {loading ? "Saving..." : "Save"}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Company Details (Only visible to Company Admins) */}
          {user.iscmpy === 1 && user.admin === 1 && (
            <div className="bg-white p-6 rounded-xl border border-gray-200/80 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-gray-800 flex items-center space-x-2">
                  <span className="w-5 h-5 flex items-center justify-center text-[#294a63] font-bold">🏢</span>
                  <span>Company Branding</span>
                </h2>
                {!cmpyEditMode && (
                  <button
                    onClick={handleEnableCmpyEdit}
                    className="text-sm font-semibold text-[#294a63] hover:underline"
                  >
                    Edit
                  </button>
                )}
              </div>

              {!cmpyEditMode ? (
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Company Name</span>
                    <span className="font-semibold text-gray-800">{cmpyName || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Company Email</span>
                    <span className="font-semibold text-gray-800">{cmpyEmail || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Company Mobile</span>
                    <span className="font-semibold text-gray-800">{cmpyMobile || "—"}</span>
                  </div>
                  <div className="flex flex-col space-y-2 pt-2 border-t border-gray-100">
                    <span className="text-gray-500">Company Logo</span>
                    {cmpyLogoUrl ? (
                      <div className="w-24 h-12 bg-gray-50 rounded-lg overflow-hidden flex items-center justify-center border border-gray-200">
                        <img src={cmpyLogoUrl} alt="Logo" className="max-h-full max-w-full object-contain" />
                      </div>
                    ) : (
                      <span className="text-gray-400 italic">No logo uploaded</span>
                    )}
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSaveCompany} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Company Name</label>
                    <input
                      type="text"
                      required
                      value={cmpyName}
                      onChange={(e) => setCmpyName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#294a63]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Company Email</label>
                    <input
                      type="email"
                      value={cmpyEmail}
                      onChange={(e) => setCmpyEmail(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#294a63]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Company Mobile</label>
                    <input
                      type="number"
                      value={cmpyMobile}
                      onChange={(e) => setCmpyMobile(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#294a63]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Company Logo (Max 2MB)</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setCmpyLogoFile(e.target.files[0]);
                        }
                      }}
                      className="w-full text-xs text-gray-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-gray-100 file:text-[#294a63] hover:file:bg-gray-200 cursor-pointer"
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => setCmpyEditMode(false)}
                      className="px-4 py-2 text-sm font-semibold text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-4 py-2 bg-[#294a63] text-white text-sm font-semibold rounded-lg hover:bg-opacity-90 disabled:opacity-50 transition-all"
                    >
                      {loading ? "Saving..." : "Save"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Quota + Link + Password */}
        <div className="space-y-6">
          {/* Quota Summary */}
          <div className="bg-white p-6 rounded-xl border border-gray-200/80 shadow-sm">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Quota Summary</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-gray-50 rounded-lg text-center border border-gray-100">
                <Smartphone className="w-4 h-4 mx-auto text-sky-600 mb-1" />
                <p className="text-xs text-gray-400">SMS</p>
                <p className="text-lg font-bold text-gray-700">{quota?.smsQuota ?? 0}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg text-center border border-gray-100">
                <Mail className="w-4 h-4 mx-auto text-emerald-600 mb-1" />
                <p className="text-xs text-gray-400">Email</p>
                <p className="text-lg font-bold text-gray-700">{quota?.emailQuota ?? 0}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg text-center border border-gray-100">
                <Share2 className="w-4 h-4 mx-auto text-green-600 mb-1" />
                <p className="text-xs text-gray-400">WhatsApp</p>
                <p className="text-lg font-bold text-gray-700">{quota?.whatsappQuota ?? 0}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg text-center border border-gray-100">
                <Globe className="w-4 h-4 mx-auto text-indigo-600 mb-1" />
                <p className="text-xs text-gray-400">Web</p>
                <p className="text-lg font-bold text-gray-700">{quota?.webQuota ?? 0}</p>
              </div>
            </div>
            {quota?.balance && quota.balance > 0 && (
              <div className="mt-3 p-3 bg-amber-50 rounded-lg border border-amber-200 text-center space-y-3">
                <p className="text-sm font-semibold text-amber-700">
                  Pending Balance: ₹{quota.balance}
                </p>
                <button
                  onClick={handlePayment}
                  disabled={loading}
                  className="w-full py-2 bg-[#294a63] hover:bg-opacity-95 text-white text-xs font-bold rounded-lg disabled:opacity-50 transition-all shadow-sm"
                >
                  {loading ? "Processing..." : "Pay Now with Razorpay"}
                </button>
              </div>
            )}
          </div>

          {/* Review Link */}
          <div className="bg-white p-6 rounded-xl border border-gray-200/80 shadow-sm">
            <h2 className="text-lg font-bold text-gray-800 mb-3">Your Review Link</h2>
            <div className="flex space-x-2">
              <input
                type="text"
                readOnly
                value={reviewLink}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-600 cursor-not-allowed"
              />
              <button
                onClick={handleCopyLink}
                className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-500 hover:text-gray-700 relative transition-colors"
              >
                <Copy className="w-5 h-5" />
                {copiedLink && (
                  <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-[10px] py-1 px-1.5 rounded shadow">
                    Copied!
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Change Password */}
          <div className="bg-white p-6 rounded-xl border border-gray-200/80 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800 flex items-center space-x-2">
                <Lock className="w-5 h-5 text-[#294a63]" />
                <span>Password</span>
              </h2>
              {!showPwdForm && (
                <button
                  onClick={() => {
                    setShowPwdForm(true);
                    clearMessages();
                  }}
                  className="text-sm font-semibold text-[#294a63] hover:underline"
                >
                  Change Password
                </button>
              )}
            </div>

            {showPwdForm && (
              <form onSubmit={handleChangePassword} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Current Password</label>
                  <input
                    type="password"
                    required
                    value={currentPwd}
                    onChange={(e) => setCurrentPwd(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#294a63]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">New Password</label>
                  <input
                    type="password"
                    required
                    value={newPwd}
                    onChange={(e) => setNewPwd(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#294a63]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    required
                    value={confirmPwd}
                    onChange={(e) => setConfirmPwd(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#294a63]"
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowPwdForm(false)}
                    className="px-4 py-2 text-sm font-semibold text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-[#294a63] text-white text-sm font-semibold rounded-lg hover:bg-opacity-90 disabled:opacity-50 transition-all"
                  >
                    {loading ? "Updating..." : "Update Password"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
