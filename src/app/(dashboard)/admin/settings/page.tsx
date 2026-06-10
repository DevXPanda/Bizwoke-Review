"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { useState, useEffect } from "react";
import { Settings, CheckCircle, AlertTriangle } from "lucide-react";

export default function AdminSettingsPage() {
  const user = useQuery(api.users.currentUser);
  const settings = useQuery(api.settings.getSettings);
  const updateSettingsMutation = useMutation(api.settings.updateSettings);

  const [siteName, setSiteName] = useState("");
  const [siteTitle, setSiteTitle] = useState("");
  const [siteDesc, setSiteDesc] = useState("");
  const [siteKeywords, setSiteKeywords] = useState("");
  const [captchaSiteKey, setCaptchaSiteKey] = useState("");
  const [protocol, setProtocol] = useState("smtp");

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (settings) {
      setSiteName(settings.siteName || "");
      setSiteTitle(settings.siteTitle || "");
      setSiteDesc(settings.siteDesc || "");
      setSiteKeywords(settings.siteKeywords || "");
      setCaptchaSiteKey(settings.captchaSiteKey || "");
      setProtocol(settings.protocol || "smtp");
    }
  }, [settings]);

  if (user === undefined || settings === undefined) {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg(null);
    setErrorMsg(null);

    if (!siteName.trim() || !siteTitle.trim()) {
      setErrorMsg("Site name and title are required");
      return;
    }

    setLoading(true);
    try {
      await updateSettingsMutation({
        siteName: siteName.trim(),
        siteTitle: siteTitle.trim(),
        siteDesc: siteDesc.trim(),
        siteKeywords: siteKeywords.trim(),
        captchaSiteKey: captchaSiteKey.trim(),
        protocol: protocol.trim(),
      });
      setSuccessMsg("Settings updated successfully");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Error updating settings");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white p-6 rounded-xl border border-gray-200/80 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center space-x-2">
          <Settings className="w-7 h-7 text-[#294a63]" />
          <span>Settings</span>
        </h1>
        <p className="text-gray-500 mt-1">Configure global site settings.</p>
      </div>

      {successMsg && (
        <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded text-sm text-emerald-700 flex items-center space-x-2">
          <CheckCircle className="w-5 h-5" /><span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded text-sm text-red-700 flex items-center space-x-2">
          <AlertTriangle className="w-5 h-5" /><span>{errorMsg}</span>
        </div>
      )}

      <div className="bg-white p-6 rounded-xl border border-gray-200/80 shadow-sm max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Site Name</label>
            <input
              type="text"
              required
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-[#294a63] focus:border-[#294a63] text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Site Title</label>
            <input
              type="text"
              required
              value={siteTitle}
              onChange={(e) => setSiteTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-[#294a63] focus:border-[#294a63] text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Site Description</label>
            <textarea
              rows={3}
              value={siteDesc}
              onChange={(e) => setSiteDesc(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-[#294a63] focus:border-[#294a63] text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">SEO Keywords</label>
            <input
              type="text"
              value={siteKeywords}
              onChange={(e) => setSiteKeywords(e.target.value)}
              placeholder="reviews, feedback, stars, ratings"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-[#294a63] focus:border-[#294a63] text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">reCAPTCHA Site Key</label>
              <input
                type="text"
                value={captchaSiteKey}
                onChange={(e) => setCaptchaSiteKey(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-[#294a63] focus:border-[#294a63] text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email Protocol</label>
              <select
                value={protocol}
                onChange={(e) => setProtocol(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-[#294a63] focus:border-[#294a63] text-sm"
              >
                <option value="smtp">SMTP</option>
                <option value="sendmail">Sendmail</option>
                <option value="mail">Mail</option>
              </select>
            </div>
          </div>

          <hr className="border-gray-200" />

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-[#294a63] text-white text-sm font-semibold rounded-lg hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
