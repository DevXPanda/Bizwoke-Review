import { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded shadow-md border border-gray-200">
        <div className="flex justify-center">
          <h2 className="text-3xl font-extrabold text-[#294a63] tracking-tight">Bizorm Reviews</h2>
        </div>
        {children}
      </div>
    </div>
  );
}
