"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useRouter } from "next/navigation";

export default function EmailVerifySessionPage() {
  const router = useRouter();

  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const user = useQuery(api.users.currentUser);
  const emailVerify = useMutation(api.users.emailVerify);
  const resendCode = useMutation(api.users.resendVerificationCode);

  useEffect(() => {
    if (user === null) {
      router.push("/login");
    } else if (user && user.active === 1) {
      router.push("/dashboard");
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const res = await emailVerify({ formKey: user.formKey, sentCode: code });
      if (res.success) {
        setSuccess("Account verified successfully! Redirecting to dashboard...");
        setTimeout(() => {
          router.push("/dashboard");
        }, 2000);
      }
    } catch (err: any) {
      setError(err.message || "Invalid verification code");
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!user) return;
    setError(null);
    setSuccess(null);
    setResending(true);

    try {
      const res = await resendCode({ formKey: user.formKey });
      if (res.alreadyActive) {
        setSuccess("Account is already active. Redirecting to dashboard...");
        setTimeout(() => {
          router.push("/dashboard");
        }, 2000);
      } else {
        setSuccess(`Verification code sent! (Dev code: ${res.code})`);
      }
    } catch (err: any) {
      setError(err.message || "Failed to resend code");
    } finally {
      setResending(false);
    }
  };

  if (user === undefined) {
    return <div className="text-center font-bold text-gray-500">Loading...</div>;
  }

  if (user === null) {
    return null;
  }

  return (
    <div className="verifyDiv w-full max-w-md">
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded text-sm text-red-700">
            <strong>{error}</strong>
          </div>
        )}
        {success && (
          <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded text-sm text-green-700">
            <strong>{success}</strong>
          </div>
        )}

        <div>
          <label className="block text-sm font-semibold text-gray-700">
            Enter the verification code sent to your mail ({user.email}) *
          </label>
          <input
            type="text"
            required
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-1 focus:ring-[#294a63] focus:border-[#294a63] sm:text-sm font-mono"
          />
        </div>

        <div>
          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded shadow-sm text-sm font-medium text-white bg-[#294a63] hover:bg-[#1f384c] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#294a63] disabled:opacity-50"
          >
            {loading ? "Verifying..." : "Verify"}
          </button>
        </div>

        <div className="text-right text-xs">
          <button
            type="button"
            onClick={handleResend}
            disabled={resending}
            className="font-semibold text-red-600 hover:text-red-500 disabled:opacity-50"
          >
            {resending ? "Sending..." : "Resend code?"}
          </button>
        </div>
      </form>
    </div>
  );
}
