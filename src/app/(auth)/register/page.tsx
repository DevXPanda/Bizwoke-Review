"use client";

import { useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const { signIn } = useAuthActions();
  const router = useRouter();

  const [fname, setFname] = useState("");
  const [lname, setLname] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [uname, setUname] = useState("");
  const [pwd, setPwd] = useState("");
  const [isCompany, setIsCompany] = useState(false);
  const [cmpy, setCmpy] = useState("");
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Queries for duplicates
  const dupUnameCount = useQuery(api.users.checkDuplicateUsername, { uname });
  const dupCmpyCount = useQuery(api.users.checkDuplicateCompany, { cmpy });
  const plans = useQuery(api.plans.getPlans);

  const generatePassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let generated = "";
    for (let i = 0; i < 10; i++) {
      generated += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPwd(generated);
  };

  const selectedPlan = plans?.find((p) => p._id === selectedPlanId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (mobile.length !== 10) {
      setError("Mobile number must be exactly 10 digits");
      return;
    }

    if (pwd.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    if (dupUnameCount === 1) {
      setError("Username already exists");
      return;
    }

    if (isCompany && !cmpy) {
      setError("Company Name is required");
      return;
    }

    if (isCompany && dupCmpyCount === 1) {
      setError("Company Name already exists");
      return;
    }

    if (!selectedPlan) {
      setError("Please choose a subscription plan");
      return;
    }

    setLoading(true);

    try {
      const signUpFields: Record<string, any> = {
        email,
        password: pwd,
        flow: "signUp",
        uname,
        fname,
        lname,
        mobile,
        isCompanyAdmin: isCompany,
        smsQuota: selectedPlan.smsQuota,
        emailQuota: selectedPlan.emailQuota,
        whatsappQuota: selectedPlan.whatsappQuota,
        webQuota: selectedPlan.webQuota,
        amount: Number(selectedPlan.amount),
      };

      if (isCompany && cmpy) {
        signUpFields.cmpy = cmpy;
      }

      await signIn("password", signUpFields);

      // User will be authenticated and logged in, but unverified.
      // We will redirect to email verification. Since the user is logged in, we can redirect.
      // Wait, to get the user's formKey, we can wait a moment and fetch or redirect to verification path.
      // Wait, how can we fetch the current user's formKey?
      // We can query currentUser, or redirect to a page like `/emailverify` which queries the user and shows the form!
      // Yes! If we create a page `/emailverify` without key, it can query `currentUser` and show the verification form!
      // This is even better than redirecting with a key because it is session-based and extremely secure!
      // Let's implement `/emailverify/page.tsx` which handles verification for the currently logged-in user!
      // Wait, the user requirements also say: "Email Verification" flow. We will support both `/emailverify` (current session) and `/emailverify/[key]`.
      router.push("/emailverify");
    } catch (err: any) {
      console.error("Registration error:", err);
      setError(err.message || "Registration failed. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="registerbox w-full max-w-lg mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded border border-gray-200 shadow-sm">
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded text-sm text-red-700">
            <strong>{error}</strong>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700">First Name</label>
            <input
              type="text"
              placeholder="Your First Name"
              value={fname}
              onChange={(e) => setFname(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-[#294a63] focus:border-[#294a63] sm:text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700">Last Name</label>
            <input
              type="text"
              placeholder="Your Last Name"
              value={lname}
              onChange={(e) => setLname(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-[#294a63] focus:border-[#294a63] sm:text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700">E-mail *</label>
          <input
            type="email"
            required
            placeholder="example@domain.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-[#294a63] focus:border-[#294a63] sm:text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700">Mobile *</label>
          <div className="mt-1 flex rounded-md shadow-sm">
            <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
              +91
            </span>
            <input
              type="number"
              required
              placeholder="0123456789"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              className="block w-full min-w-0 flex-1 px-3 py-2 border border-gray-300 rounded-none rounded-r-md focus:outline-none focus:ring-[#294a63] focus:border-[#294a63] sm:text-sm"
            />
          </div>
          {mobile && mobile.length !== 10 && (
            <span className="text-xs text-red-500">Invalid mobile length</span>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700">Username *</label>
          <input
            type="text"
            required
            placeholder="Pick a username"
            value={uname}
            onChange={(e) => setUname(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-[#294a63] focus:border-[#294a63] sm:text-sm"
          />
          {dupUnameCount === 1 && (
            <span className="text-xs text-red-500">Username already exists</span>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700">Password *</label>
          <input
            type="text"
            required
            placeholder="Password must be over 6 characters long"
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-[#294a63] focus:border-[#294a63] sm:text-sm font-mono"
          />
          {pwd && pwd.length < 6 && (
            <span className="text-xs text-red-500">Password is too short</span>
          )}
          <div className="mt-2 text-right">
            <button
              type="button"
              onClick={generatePassword}
              className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-semibold"
            >
              Generate Password
            </button>
          </div>
        </div>

        <hr className="border-gray-200" />

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="cmpychkb"
            checked={isCompany}
            onChange={(e) => setIsCompany(e.target.checked)}
            className="h-4 w-4 text-[#294a63] border-gray-300 rounded focus:ring-[#294a63]"
          />
          <label htmlFor="cmpychkb" className="text-sm font-bold text-[#294a63]">
            Are you a company?
          </label>
        </div>

        {isCompany && (
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">Company Name *</label>
            <input
              type="text"
              required
              placeholder="Company Name"
              value={cmpy}
              onChange={(e) => setCmpy(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-[#294a63] focus:border-[#294a63] sm:text-sm"
            />
            {dupCmpyCount === 1 && (
              <span className="text-xs text-red-500">Company already exists</span>
            )}
          </div>
        )}

        <hr className="border-gray-200" />

        <div>
          <div className="text-center mb-4">
            <h3 className="text-lg font-bold text-gray-950">Simple Pricing for Everyone!</h3>
            <p className="text-xs text-gray-500">All plans come with a 100% money-back guarantee.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {plans?.map((p) => (
              <div
                key={p._id}
                onClick={() => setSelectedPlanId(p._id)}
                className={`cursor-pointer p-4 rounded border text-center transition-all ${
                  selectedPlanId === p._id
                    ? "border-[#294a63] ring-2 ring-[#294a63] bg-blue-50/25"
                    : "border-gray-300 hover:border-[#294a63]"
                }`}
              >
                <h5 className="font-bold text-gray-800 text-sm">{p.name}</h5>
                <h6 className="text-xs font-bold text-gray-600 mt-1">
                  Rs <span className="text-base text-gray-900 font-extrabold">{p.amount}</span> {p.per}
                </h6>
                <button
                  type="button"
                  className={`mt-3 w-full py-1 rounded text-xs font-bold border ${
                    selectedPlanId === p._id
                      ? "bg-[#294a63] text-white border-transparent"
                      : "text-[#294a63] border-[#294a63] hover:bg-[#294a63] hover:text-white"
                  }`}
                >
                  {selectedPlanId === p._id ? "Current Plan" : "Choose Plan"}
                </button>
                <ul className="text-left text-xs text-gray-600 mt-4 space-y-1 divide-y divide-gray-100">
                  <li className="pt-1">{p.smsQuota} SMS Quota</li>
                  <li className="pt-1">{p.emailQuota} Email Quota</li>
                  <li className="pt-1">{p.whatsappQuota} WhatsApp Quota</li>
                  <li className="pt-1">{p.webQuota} Website Quota</li>
                  {isCompany && <li className="pt-1 text-[#294a63] font-bold">Unlimited Users</li>}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-4 flex items-center justify-between">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 rounded text-white font-bold text-sm bg-[#294a63] hover:bg-[#1f384c] focus:outline-none focus:ring-2 focus:ring-[#294a63] disabled:opacity-50"
          >
            {loading ? "Registering..." : "Create Account"}
          </button>
          <Link href="/login" className="text-xs font-semibold text-red-600 hover:text-red-500">
            Already a user?
          </Link>
        </div>
      </form>
    </div>
  );
}
