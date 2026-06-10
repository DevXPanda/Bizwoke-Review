"use client";

import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useState } from "react";
import {
  Mail,
  MessageSquare,
  Send,
  AlertTriangle,
  CheckCircle,
  FileSpreadsheet,
  Download,
  Users,
} from "lucide-react";

type TabType = "email" | "sms" | "whatsapp";

export default function SharePage() {
  const dashData = useQuery(api.reviews.getDashboardData);
  const logSentLinkMutation = useMutation(api.reviews.logSentLink);

  const sendEmailAction = useAction(api.email.sendEmailCampaignAction);
  const sendSMSAction = useAction(api.email.sendSMSCampaignAction);
  const sendBulkEmailAction = useAction(api.email.sendBulkEmailCampaignAction);
  const sendBulkSMSAction = useAction(api.email.sendBulkSMSCampaignAction);

  const [activeTab, setActiveTab] = useState<TabType>("email");
  const [selectedPlatform, setSelectedPlatform] = useState("");

  // Email fields
  const [emailMode, setEmailMode] = useState<"single" | "bulk">("single");
  const [emailTo, setEmailTo] = useState("");
  const [emailSubject, setEmailSubject] = useState("Reviews");
  const [emailBody, setEmailBody] = useState("");
  const [emailCsvFile, setEmailCsvFile] = useState<File | null>(null);
  const [emailBulkList, setEmailBulkList] = useState<string[]>([]);
  const [emailValidationErrors, setEmailValidationErrors] = useState<string[]>([]);

  // SMS fields
  const [smsMode, setSmsMode] = useState<"single" | "bulk">("single");
  const [smsMobile, setSmsMobile] = useState("");
  const [smsBody, setSmsBody] = useState("");
  const [smsCsvFile, setSmsCsvFile] = useState<File | null>(null);
  const [smsBulkList, setSmsBulkList] = useState<string[]>([]);
  const [smsValidationErrors, setSmsValidationErrors] = useState<string[]>([]);

  // WhatsApp fields
  const [whpMobile, setWhpMobile] = useState("");
  const [whpBody, setWhpBody] = useState("");

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

  const { platformSummary, user } = dashData;
  const activePlatforms = platformSummary.filter((p) => p.active === 1);
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  const clearMessages = () => {
    setSuccessMsg(null);
    setErrorMsg(null);
  };

  const parseCSV = (text: string, expectedHeader: string): { valid: string[]; invalid: string[] } => {
    const lines = text.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
    if (lines.length === 0) {
      return { valid: [], invalid: ["File is empty"] };
    }
    
    // Check header
    const header = lines[0].replace(/['"]/g, "").trim();
    if (header.toLowerCase() !== expectedHeader.toLowerCase()) {
      return { valid: [], invalid: [`Invalid header. Expected exactly "${expectedHeader}", but got "${header}"`] };
    }
    
    const valid: string[] = [];
    const invalid: string[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const value = lines[i].replace(/['"]/g, "").trim();
      if (!value) continue;
      
      if (expectedHeader.toLowerCase() === "email") {
        if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          valid.push(value);
        } else {
          invalid.push(value);
        }
      } else if (expectedHeader.toLowerCase() === "phonenumber") {
        if (/^\d{10}$/.test(value)) {
          valid.push(value);
        } else {
          invalid.push(value);
        }
      }
    }
    
    return { valid, invalid };
  };

  const downloadSampleCsv = (type: "email" | "sms") => {
    const header = type === "email" ? "Email" : "Phonenumber";
    const sampleRows = type === "email" 
      ? ["customer1@domain.com", "customer2@domain.com"] 
      : ["9876543201", "9876543202"];
    const csvContent = "data:text/csv;charset=utf-8," + [header, ...sampleRows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${type}_sample.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleEmailFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setEmailCsvFile(file);
    setEmailBulkList([]);
    setEmailValidationErrors([]);
    clearMessages();
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const { valid, invalid } = parseCSV(text, "Email");
      setEmailBulkList(valid);
      setEmailValidationErrors(invalid);
      if (invalid.length > 0) {
        setErrorMsg("CSV file contains invalid email entries");
      } else if (valid.length === 0) {
        setErrorMsg("No valid email addresses found in CSV");
      }
    };
    reader.readAsText(file);
  };

  const handleSMSFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSmsCsvFile(file);
    setSmsBulkList([]);
    setSmsValidationErrors([]);
    clearMessages();
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const { valid, invalid } = parseCSV(text, "Phonenumber");
      setSmsBulkList(valid);
      setSmsValidationErrors(invalid);
      if (invalid.length > 0) {
        setErrorMsg("CSV file contains invalid phonenumber entries");
      } else if (valid.length === 0) {
        setErrorMsg("No valid phone numbers found in CSV");
      }
    };
    reader.readAsText(file);
  };

  // When platform is selected, auto-fill the body with the review link
  const handlePlatformChange = (val: string) => {
    setSelectedPlatform(val);
    clearMessages();

    if (val) {
      const platform = activePlatforms.find((p) => p.id === val);
      const reviewLink = `${baseUrl}/wtr/${user.formKey}/${val}`;
      const body = `${reviewLink}\n\nPlease take a moment to leave us a review. Thank you!`;

      if (activeTab === "email") {
        setEmailBody(body);
        if (platform) {
          setEmailSubject(platform.webName + " - Review Request");
        }
      } else if (activeTab === "sms") {
        setSmsBody(body);
      } else {
        setWhpBody(body);
      }
    }
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    if (!selectedPlatform) {
      setErrorMsg("Please select a platform");
      return;
    }

    if (emailMode === "single") {
      if (!emailTo.trim()) {
        setErrorMsg("Email is required");
        return;
      }
      if (!emailSubject.trim()) {
        setErrorMsg("Subject is required");
        return;
      }
      if (!emailBody.trim()) {
        setErrorMsg("Body is required");
        return;
      }

      setLoading(true);
      try {
        await sendEmailAction({
          userId: user.id,
          to: emailTo.trim(),
          subject: emailSubject.trim(),
          body: emailBody.trim(),
        });

        setSuccessMsg("Email sent successfully via SMTP!");
        setEmailTo("");
      } catch (err: unknown) {
        setErrorMsg(err instanceof Error ? err.message : "Error sending email");
      } finally {
        setLoading(false);
      }
    } else {
      // Bulk mode
      if (emailBulkList.length === 0) {
        setErrorMsg("No valid email addresses to send to");
        return;
      }
      if (!emailSubject.trim()) {
        setErrorMsg("Subject is required");
        return;
      }
      if (!emailBody.trim()) {
        setErrorMsg("Body is required");
        return;
      }

      setLoading(true);
      try {
        const result = await sendBulkEmailAction({
          userId: user.id,
          emails: emailBulkList,
          subject: emailSubject.trim(),
          body: emailBody.trim(),
        });

        let msg = `Bulk Email Campaign completed! Sent successfully: ${result.successCount}, Failed: ${result.failureCount}.`;
        if (result.failureCount > 0) {
          msg += ` Failures: ${result.failures.slice(0, 5).join(", ")}${result.failures.length > 5 ? "..." : ""}`;
          setErrorMsg(msg);
        } else {
          setSuccessMsg(msg);
        }
        setEmailCsvFile(null);
        setEmailBulkList([]);
        setEmailValidationErrors([]);
        // Reset file input in DOM
        const fileInput = document.getElementById("email_csv_file") as HTMLInputElement;
        if (fileInput) fileInput.value = "";
      } catch (err: unknown) {
        setErrorMsg(err instanceof Error ? err.message : "Error executing bulk email campaign");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSendSms = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    if (!selectedPlatform) {
      setErrorMsg("Please select a platform");
      return;
    }

    if (smsMode === "single") {
      if (smsMobile.length !== 10) {
        setErrorMsg("Invalid mobile length. Must be exactly 10 digits");
        return;
      }
      if (!smsBody.trim()) {
        setErrorMsg("Body is required");
        return;
      }

      setLoading(true);
      try {
        await sendSMSAction({
          userId: user.id,
          mobile: smsMobile.trim(),
          body: smsBody.trim(),
        });

        setSuccessMsg("SMS sent successfully via Gateway!");
        setSmsMobile("");
      } catch (err: unknown) {
        setErrorMsg(err instanceof Error ? err.message : "Error sending SMS");
      } finally {
        setLoading(false);
      }
    } else {
      // Bulk mode
      if (smsBulkList.length === 0) {
        setErrorMsg("No valid phone numbers to send to");
        return;
      }
      if (!smsBody.trim()) {
        setErrorMsg("Body is required");
        return;
      }

      setLoading(true);
      try {
        const result = await sendBulkSMSAction({
          userId: user.id,
          mobiles: smsBulkList,
          body: smsBody.trim(),
        });

        let msg = `Bulk SMS Campaign completed! Sent successfully: ${result.successCount}, Failed: ${result.failureCount}.`;
        if (result.failureCount > 0) {
          msg += ` Failures: ${result.failures.slice(0, 5).join(", ")}${result.failures.length > 5 ? "..." : ""}`;
          setErrorMsg(msg);
        } else {
          setSuccessMsg(msg);
        }
        setSmsCsvFile(null);
        setSmsBulkList([]);
        setSmsValidationErrors([]);
        // Reset file input in DOM
        const fileInput = document.getElementById("sms_csv_file") as HTMLInputElement;
        if (fileInput) fileInput.value = "";
      } catch (err: unknown) {
        setErrorMsg(err instanceof Error ? err.message : "Error executing bulk SMS campaign");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSendWhatsapp = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    if (!selectedPlatform) {
      setErrorMsg("Please select a platform");
      return;
    }
    if (whpMobile.length !== 10) {
      setErrorMsg("Invalid mobile length. Must be exactly 10 digits");
      return;
    }
    if (!whpBody.trim()) {
      setErrorMsg("Body is required");
      return;
    }

    setLoading(true);
    try {
      await logSentLinkMutation({
        userId: user.id,
        linkFor: "whatsapp",
        sentToSms: whpMobile.trim(),
        body: whpBody.trim(),
      });

      // Open WhatsApp with the message
      const whatsappLink = `https://api.whatsapp.com/send?phone=91${whpMobile.trim()}&text=${encodeURIComponent(whpBody.trim())}`;
      window.open(whatsappLink, "_blank");

      setSuccessMsg("WhatsApp link logged and opened");
      setWhpMobile("");
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Error sending WhatsApp";
      setErrorMsg(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const tabs: { key: TabType; label: string; icon: React.ElementType }[] = [
    { key: "email", label: "Email", icon: Mail },
    { key: "sms", label: "SMS", icon: MessageSquare },
    { key: "whatsapp", label: "WhatsApp", icon: Send },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="bg-white p-6 rounded-xl border border-gray-200/80 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Send Link</h1>
          <p className="text-gray-500 mt-1">Share your review link via Email, SMS, or WhatsApp.</p>
        </div>
        {dashData.quota && (
          <div className="flex items-center space-x-3 bg-gray-50 border border-gray-200 p-3 rounded-lg text-xs font-semibold text-gray-600">
            <Users className="w-4 h-4 text-[#294a63]" />
            <div>
              <span className="block text-[10px] text-gray-400 uppercase">Remaining Quotas</span>
              <div className="flex space-x-3 mt-0.5">
                <span>Email: <strong className="text-gray-850 font-bold">{dashData.quota.emailQuota}</strong></span>
                <span>SMS: <strong className="text-gray-850 font-bold">{dashData.quota.smsQuota}</strong></span>
              </div>
            </div>
          </div>
        )}
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

      {/* Tab Selector */}
      <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm overflow-hidden">
        <div className="flex border-b border-gray-200">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveTab(tab.key);
                  clearMessages();
                }}
                className={`flex-1 py-3.5 text-sm font-semibold flex items-center justify-center space-x-2 transition-colors ${
                  isActive
                    ? "bg-[#294a63] text-white"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="p-6">
          {/* Platform selector (shared across all tabs) */}
          <div className="mb-5">
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Platform</label>
            <select
              required
              value={selectedPlatform}
              onChange={(e) => handlePlatformChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-[#294a63] focus:border-[#294a63] text-sm"
            >
              {activePlatforms.length === 0 ? (
                <option value="">No platform created</option>
              ) : (
                <>
                  <option value="">Select Platform</option>
                  {activePlatforms.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.webName}
                    </option>
                  ))}
                </>
              )}
            </select>
          </div>

          {/* Email Form */}
          {activeTab === "email" && (
            <form onSubmit={handleSendEmail} className="space-y-4">
              {/* Email Mode Toggle */}
              <div className="flex bg-gray-50 border border-gray-200 p-1 rounded-lg w-fit mb-4">
                <button
                  type="button"
                  onClick={() => {
                    setEmailMode("single");
                    clearMessages();
                  }}
                  className={`px-3 py-1.5 text-xs font-semibold rounded ${
                    emailMode === "single"
                      ? "bg-white text-gray-800 shadow-sm border border-gray-200"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Single Send
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEmailMode("bulk");
                    clearMessages();
                  }}
                  className={`px-3 py-1.5 text-xs font-semibold rounded ${
                    emailMode === "bulk"
                      ? "bg-white text-gray-800 shadow-sm border border-gray-200"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Bulk CSV Campaign
                </button>
              </div>

              {emailMode === "single" ? (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">E-mail</label>
                  <input
                    type="email"
                    required
                    placeholder="example@domain.com"
                    value={emailTo}
                    onChange={(e) => setEmailTo(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-[#294a63] focus:border-[#294a63] text-sm"
                  />
                </div>
              ) : (
                <div className="bg-gray-50/50 p-4 border border-gray-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-500 uppercase">Upload Contacts CSV</span>
                    <button
                      type="button"
                      onClick={() => downloadSampleCsv("email")}
                      className="text-xs font-semibold text-red-600 hover:underline flex items-center space-x-1"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Sample</span>
                    </button>
                  </div>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-white flex flex-col items-center justify-center">
                    <input
                      type="file"
                      id="email_csv_file"
                      accept=".csv"
                      onChange={handleEmailFileChange}
                      className="text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 cursor-pointer"
                    />
                    <p className="text-[10px] text-gray-400 mt-2">CSV must have a header of only &quot;Email&quot;</p>
                  </div>
                  {emailBulkList.length > 0 && (
                    <div className="text-xs text-emerald-600 bg-emerald-50/70 p-2.5 rounded-lg font-medium flex items-center space-x-2">
                      <FileSpreadsheet className="w-4 h-4 flex-shrink-0" />
                      <span>Successfully parsed {emailBulkList.length} valid email contacts.</span>
                    </div>
                  )}
                  {emailValidationErrors.length > 0 && (
                    <div className="bg-red-50/70 border border-red-150 p-3 rounded-lg text-xs space-y-1">
                      <span className="font-semibold text-red-700">Invalid records detected ({emailValidationErrors.length}):</span>
                      <div className="max-h-24 overflow-y-auto text-gray-650 font-mono space-y-0.5 mt-1">
                        {emailValidationErrors.map((err, idx) => (
                          <div key={idx}>Row {idx + 2}: {err || "<empty>"}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Subject</label>
                <input
                  type="text"
                  required
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-[#294a63] focus:border-[#294a63] text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Body</label>
                <textarea
                  rows={6}
                  required
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-[#294a63] focus:border-[#294a63] text-sm"
                />
              </div>

              <hr className="border-gray-200" />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading || (emailMode === "bulk" && emailBulkList.length === 0)}
                  className="px-5 py-2 bg-[#294a63] text-white text-sm font-semibold rounded-lg hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {loading ? "Sending Campaign..." : emailMode === "single" ? "Send Email" : `Send Campaign (${emailBulkList.length})`}
                </button>
              </div>
            </form>
          )}

          {/* SMS Form */}
          {activeTab === "sms" && (
            <form onSubmit={handleSendSms} className="space-y-4">
              {/* SMS Mode Toggle */}
              <div className="flex bg-gray-50 border border-gray-200 p-1 rounded-lg w-fit mb-4">
                <button
                  type="button"
                  onClick={() => {
                    setSmsMode("single");
                    clearMessages();
                  }}
                  className={`px-3 py-1.5 text-xs font-semibold rounded ${
                    smsMode === "single"
                      ? "bg-white text-gray-800 shadow-sm border border-gray-200"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Single Send
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSmsMode("bulk");
                    clearMessages();
                  }}
                  className={`px-3 py-1.5 text-xs font-semibold rounded ${
                    smsMode === "bulk"
                      ? "bg-white text-gray-800 shadow-sm border border-gray-200"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Bulk CSV Campaign
                </button>
              </div>

              {smsMode === "single" ? (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Phone Number</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 text-sm">+91</span>
                    </div>
                    <input
                      type="number"
                      required
                      placeholder="10-digit number"
                      value={smsMobile}
                      onChange={(e) => setSmsMobile(e.target.value)}
                      className="w-full pl-12 pr-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-[#294a63] focus:border-[#294a63] text-sm"
                    />
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50/50 p-4 border border-gray-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-500 uppercase">Upload Numbers CSV</span>
                    <button
                      type="button"
                      onClick={() => downloadSampleCsv("sms")}
                      className="text-xs font-semibold text-red-650 hover:underline flex items-center space-x-1"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Sample</span>
                    </button>
                  </div>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-white flex flex-col items-center justify-center">
                    <input
                      type="file"
                      id="sms_csv_file"
                      accept=".csv"
                      onChange={handleSMSFileChange}
                      className="text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 cursor-pointer"
                    />
                    <p className="text-[10px] text-gray-400 mt-2">CSV must have a header of only &quot;Phonenumber&quot;</p>
                  </div>
                  {smsBulkList.length > 0 && (
                    <div className="text-xs text-emerald-600 bg-emerald-50/70 p-2.5 rounded-lg font-medium flex items-center space-x-2">
                      <FileSpreadsheet className="w-4 h-4 flex-shrink-0" />
                      <span>Successfully parsed {smsBulkList.length} valid phone contacts.</span>
                    </div>
                  )}
                  {smsValidationErrors.length > 0 && (
                    <div className="bg-red-50/70 border border-red-150 p-3 rounded-lg text-xs space-y-1">
                      <span className="font-semibold text-red-700">Invalid records detected ({smsValidationErrors.length}):</span>
                      <div className="max-h-24 overflow-y-auto text-gray-650 font-mono space-y-0.5 mt-1">
                        {smsValidationErrors.map((err, idx) => (
                          <div key={idx}>Row {idx + 2}: {err || "<empty>"}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Body</label>
                <textarea
                  rows={6}
                  required
                  value={smsBody}
                  onChange={(e) => setSmsBody(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-[#294a63] focus:border-[#294a63] text-sm"
                />
              </div>

              <hr className="border-gray-200" />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading || (smsMode === "bulk" && smsBulkList.length === 0)}
                  className="px-5 py-2 bg-[#294a63] text-white text-sm font-semibold rounded-lg hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {loading ? "Sending Campaign..." : smsMode === "single" ? "Send SMS" : `Send Campaign (${smsBulkList.length})`}
                </button>
              </div>
            </form>
          )}

          {/* WhatsApp Form */}
          {activeTab === "whatsapp" && (
            <form onSubmit={handleSendWhatsapp} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">WhatsApp Number</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 text-sm">+91</span>
                  </div>
                  <input
                    type="number"
                    required
                    placeholder="WhatsApp number"
                    value={whpMobile}
                    onChange={(e) => setWhpMobile(e.target.value)}
                    className="w-full pl-12 pr-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-[#294a63] focus:border-[#294a63] text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Body</label>
                <textarea
                  rows={6}
                  required
                  value={whpBody}
                  onChange={(e) => setWhpBody(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-[#294a63] focus:border-[#294a63] text-sm"
                />
              </div>

              <hr className="border-gray-200" />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-[#294a63] text-white text-sm font-semibold rounded-lg hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {loading ? "Sharing..." : "Share"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
