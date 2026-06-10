"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Globe, AlertTriangle } from "lucide-react";

export default function PickPlatformPage() {
  const router = useRouter();
  const params = useParams();
  const formKey = params?.key as string;

  const user = useQuery(api.users.getUserByFormKey, { formKey });
  const platforms = useQuery(api.reviews.getPlatformsByKey, { formKey });
  const quotaStatus = useQuery(api.quota.checkQuotaStatus, { formKey });
  const companyBranding = useQuery(api.companies.getCompanyBrandingByFormKey, { formKey });
  const userQuota = useQuery(api.quota.getUserQuota, user ? { userId: user._id } : "skip");

  const [selectedPlatform, setSelectedPlatform] = useState("");

  if (user === undefined || platforms === undefined || quotaStatus === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#294a63]"></div>
      </div>
    );
  }

  // Verification checks matching legacy logic
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white border border-red-200 rounded-xl p-6 shadow-sm text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-800">Invalid Link!</h3>
          <p className="text-sm text-gray-500 mt-2">The review link you have accessed is invalid or does not exist.</p>
        </div>
      </div>
    );
  }

  if (user.active === 0 || user.active === 2 || user.sub === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white border border-red-200 rounded-xl p-6 shadow-sm text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-800">Account Inactive</h3>
          <p className="text-sm text-gray-500 mt-2">User account is inactive or has no subscription.</p>
        </div>
      </div>
    );
  }

  if (quotaStatus === "pending_balance") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white border border-red-200 rounded-xl p-6 shadow-sm text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-800">Access Restricted</h3>
          <p className="text-sm text-gray-500 mt-2">Pending Balance. Please contact support.</p>
        </div>
      </div>
    );
  }

  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlatform) return;
    router.push(`/wtr/${formKey}/${selectedPlatform}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 flex items-center justify-center space-x-2">
          {companyBranding?.cmpyLogo ? (
            <img src={companyBranding.cmpyLogo} alt="Logo" className="w-12 h-12 object-contain rounded-lg border border-gray-200 p-0.5" />
          ) : (
            <Globe className="w-8 h-8 text-[#294a63]" />
          )}
          <span className="text-[#294a63]">{companyBranding?.cmpyName || "Bizorm Reviews"}</span>
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Select a platform to share your experience with us.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-xl sm:px-10 border border-gray-150">
          <form onSubmit={handleContinue} className="space-y-6">
            <div>
              <label htmlFor="platform" className="block text-sm font-semibold text-gray-700">
                Select Platform
              </label>
              <select
                id="platform"
                name="platform"
                required
                value={selectedPlatform}
                onChange={(e) => setSelectedPlatform(e.target.value)}
                className="mt-1.5 block w-full pl-3 pr-10 py-2 border border-gray-300 bg-white rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-[#294a63] focus:border-[#294a63] sm:text-sm transition-all"
              >
                {platforms.length === 0 ? (
                  <option value="">No platform created</option>
                ) : (
                  <>
                    <option value="">Select Platform</option>
                    {platforms.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.webName}
                      </option>
                    ))}
                  </>
                )}
              </select>
            </div>

            <hr className="border-gray-200" />

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={!selectedPlatform}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-[#294a63] hover:bg-opacity-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#294a63] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Continue
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
