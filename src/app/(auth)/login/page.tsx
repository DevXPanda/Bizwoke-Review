"use client";

import { useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { logger } from "@/utils/logger";

export default function LoginPage() {
  const { signIn } = useAuthActions();
  const router = useRouter();
  const [uname, setUname] = useState("");
  const [pwd, setPwd] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const migrateLegacyUser = useMutation(api.users.migrateLegacyUser);
  const loginUser = useMutation(api.users.loginUser);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const precheck = await loginUser({ uname, pwd });
      
      if (precheck.status === "wrong_credentials") {
        console.warn("Login: Precheck wrong credentials");
        setError("Wrong username/email or password");
        setLoading(false);
        return;
      }
      if (precheck.status === "deactivated") {
        console.warn("Login: Precheck account deactivated");
        setError("Your account is deactivated");
        setLoading(false);
        return;
      }
      if (precheck.status === "unverified") {
        console.warn("Login: Precheck account unverified");
        setError("Your account is not verified");
        if (precheck.formKey) {
          router.push(`/emailverify/${precheck.formKey}`);
        }
        setLoading(false);
        return;
      }

      const migration = await migrateLegacyUser({ unameOrEmail: uname, pwd });
      
      const emailToSignIn = precheck.user?.email || uname;

      await signIn("password", {
        email: emailToSignIn,
        password: pwd,
        flow: "signIn",
      });

      router.push("/dashboard");
    } catch (err: any) {
      console.error("Login: Caught error in handleSubmit:", err);
      setError(err.message || "Failed to sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="loginbox w-full max-w-md">
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded text-sm text-red-700">
            <strong>{error}</strong>
          </div>
        )}
        <div>
          <label className="block text-sm font-semibold text-gray-700">Username *</label>
          <input
            type="text"
            required
            placeholder="Your Username"
            value={uname}
            onChange={(e) => setUname(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-1 focus:ring-[#294a63] focus:border-[#294a63] sm:text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700">Password *</label>
          <input
            type="password"
            required
            placeholder="Your Password"
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-1 focus:ring-[#294a63] focus:border-[#294a63] sm:text-sm"
          />
        </div>

        <div>
          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded shadow-sm text-sm font-medium text-white bg-[#294a63] hover:bg-[#1f384c] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#294a63] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Verifying..." : "Login"}
          </button>
        </div>

        <div className="text-center text-sm">
          <Link href="/register" className="font-semibold text-red-600 hover:text-red-500">
            Create Account
          </Link>
        </div>
      </form>
    </div>
  );
}
