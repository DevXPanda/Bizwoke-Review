"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useParams } from "next/navigation";
import { Globe, AlertTriangle } from "lucide-react";

export default function IframeFramePage() {
  const params = useParams();
  const frameId = params?.frameId as string;

  const websites = useQuery(api.reviews.getWebsitesByFrameId, { frameId });
  const formKey = websites && websites.length > 0 ? websites[0].formKey : undefined;
  const companyBranding = useQuery(
    api.companies.getCompanyBrandingByFormKey,
    formKey ? { formKey } : "skip"
  );

  if (websites === undefined) {
    return (
      <div className="flex items-center justify-center p-4 min-h-[80px]">
        <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-[#294a63]"></div>
      </div>
    );
  }

  if (websites.length === 0) {
    return (
      <div className="bg-white border border-[#c5d6de] p-3 text-center rounded-lg text-xs font-semibold text-red-500 flex items-center justify-center space-x-1">
        <AlertTriangle className="w-4 h-4" />
        <span>No Frame or active websites found for ID.</span>
      </div>
    );
  }

  return (
    <div className="p-3 bg-white border border-[#c5d6de] rounded-lg">
      {companyBranding && (
        <div className="flex items-center space-x-2 mb-3 pb-2 border-b border-gray-100">
          {companyBranding.cmpyLogo ? (
            <img src={companyBranding.cmpyLogo} alt="Logo" className="h-6 object-contain rounded" />
          ) : null}
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{companyBranding.cmpyName}</span>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {websites.map((web) => {
          let redirectLink = web.webLink;
          if (!/^https?:\/\//i.test(redirectLink)) {
            redirectLink = `https://${redirectLink}`;
          }

          return (
            <a
              key={web._id}
              href={redirectLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2 text-sm font-semibold text-[#294a63] hover:underline hover:text-blue-900 transition-colors"
            >
              {web.logo ? (
                <img
                  src={web.logo}
                  alt={web.webName}
                  className="w-8 h-8 rounded-full object-cover max-w-[32px] max-h-[32px]"
                />
              ) : web.icon ? (
                <i className={`${web.icon} text-lg`}></i>
              ) : (
                <Globe className="w-5 h-5" />
              )}
              <span>{web.webName}</span>
            </a>
          );
        })}
      </div>
    </div>
  );
}
