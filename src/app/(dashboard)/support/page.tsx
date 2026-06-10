"use client";

import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useState } from "react";
import { HelpCircle, CheckCircle, AlertTriangle, Send } from "lucide-react";

export default function SupportPage() {
  const createContactMutation = useMutation(api.settings.createContact);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg(null);
    setErrorMsg(null);

    if (!name.trim() || !email.trim() || !body.trim()) {
      setErrorMsg("All fields are required");
      return;
    }

    setLoading(true);
    try {
      await createContactMutation({
        name: name.trim(),
        userMail: email.trim(),
        bdy: body.trim(),
      });
      setSuccessMsg("Your message has been sent. We will get back to you shortly.");
      setName("");
      setEmail("");
      setBody("");
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Error sending message";
      setErrorMsg(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="bg-white p-6 rounded-xl border border-gray-200/80 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center space-x-2">
          <HelpCircle className="w-7 h-7 text-[#294a63]" />
          <span>Support</span>
        </h1>
        <p className="text-gray-500 mt-1">Need help? Send us a message and we&#39;ll respond as soon as possible.</p>
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

      {/* Contact Form */}
      <div className="bg-white p-6 rounded-xl border border-gray-200/80 shadow-sm max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Name</label>
            <input
              type="text"
              required
              placeholder="Your Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-[#294a63] focus:border-[#294a63] text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">E-mail</label>
            <input
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-[#294a63] focus:border-[#294a63] text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Message</label>
            <textarea
              rows={6}
              required
              placeholder="Describe your issue or question..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-[#294a63] focus:border-[#294a63] text-sm"
            />
          </div>

          <hr className="border-gray-200" />

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center px-5 py-2 bg-[#294a63] text-white text-sm font-semibold rounded-lg hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <Send className="w-4 h-4 mr-2" />
              {loading ? "Sending..." : "Send Message"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
