"use client";

import { useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useRouter } from "next/navigation";

export default function RootPage() {
  const router = useRouter();
  const user = useQuery(api.users.currentUser);

  useEffect(() => {
    if (user === null) {
      router.push("/login");
    } else if (user) {
      if (user.websiteForm === 0) {
        router.push("/platform");
      } else {
        router.push("/dashboard");
      }
    }
  }, [user, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#294a63]"></div>
    </div>
  );
}
