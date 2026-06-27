"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { 
  Star, 
  Frown, 
  Meh, 
  Smile, 
  AlertTriangle, 
  ThumbsUp, 
  ThumbsDown,
  Globe 
} from "lucide-react";
import { Id } from "../../../../../convex/_generated/dataModel";

export default function ReviewFormPage() {
  const router = useRouter();
  const params = useParams();
  const formKey = params?.key as string;
  const platformId = params?.platformId as string;

  const user = useQuery(api.users.getUserByFormKey, { formKey });
  const platform = useQuery(api.reviews.getWebsiteDetails, { id: platformId as Id<"websites"> });
  const quotaStatus = useQuery(api.quota.checkQuotaStatus, { formKey });
  const companyBranding = useQuery(api.companies.getCompanyBrandingByFormKey, { formKey });
  
  const saveRatingMutation = useMutation(api.reviews.saveRating);
  const activeQuestions = useQuery(api.surveys.getActiveQuestions);
  const submitSurveyMutation = useMutation(api.surveys.submitSurvey);

  // States
  const [selectedStar, setSelectedStar] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [review, setReview] = useState("");
  const [userIp, setUserIp] = useState("127.0.0.1");
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Gating & Clipboard redirection states
  const [countdown, setCountdown] = useState<number | null>(null);
  const [clipboardCopied, setClipboardCopied] = useState(false);

  // Multi-step survey states
  const [step, setStep] = useState(1);
  const [ratingId, setRatingId] = useState<Id<"ratings"> | null>(null);
  const [surveyScores, setSurveyScores] = useState<Record<string, number>>({});

  useEffect(() => {
    fetch("https://api.ipify.org?format=json")
      .then((res) => res.json())
      .then((data) => setUserIp(data.ip || "127.0.0.1"))
      .catch(() => setUserIp("127.0.0.1"));
  }, []);

  useEffect(() => {
    if (countdown === null || !platform) return;
    if (countdown <= 0) {
      let link = platform.webLink;
      if (!/^https?:\/\//i.test(link)) {
        link = `https://${link}`;
      }
      window.location.assign(link);
      return;
    }
    const timer = setTimeout(() => {
      setCountdown(countdown - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [countdown, platform]);

  if (user === undefined || platform === undefined || quotaStatus === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#294a63]"></div>
      </div>
    );
  }

  // Verification checks matching legacy logic
  if (!user || !platform || platform.formKey !== formKey) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white border border-red-200 rounded-xl p-6 shadow-sm text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-800">Invalid Link!</h3>
          <p className="text-sm text-gray-500 mt-2">The link or platform parameters are invalid.</p>
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

  const handleRatingClick = (starValue: number) => {
    setSelectedStar(starValue);
    setValidationError(null);
  };

  const handleCompletion = async (rId: Id<"ratings">) => {
    setSuccessMsg("Thanks for your review!");
    
    // Star Gating Redirection Behavior (4-5 stars redirect, 1-3 stars stay)
    if (selectedStar !== null && selectedStar > 3) {
      let link = platform.webLink;
      if (!/^https?:\/\//i.test(link)) {
        link = `https://${link}`;
      }

      // Copy review text to clipboard automatically
      if (review.trim()) {
        try {
          await navigator.clipboard.writeText(review.trim());
          setClipboardCopied(true);
        } catch (clipErr) {
          console.error("Clipboard copy failed:", clipErr);
        }
      }

      // Start countdown
      setCountdown(4);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setValidationError(null);

    if (selectedStar === null) {
      setValidationError("Please select a star rating");
      return;
    }

    if (mobile.length !== 10) {
      setValidationError("Mobile number must be exactly 10 digits");
      return;
    }

    setLoading(true);
    try {
      const result = await saveRatingMutation({
        userIp,
        formKey,
        webId: platformId as Id<"websites">,
        star: selectedStar,
        review: review.trim(),
        name: name.trim(),
        mobile: mobile.trim(),
        webName: platform.webName,
        webLink: platform.webLink,
      });

      setRatingId(result.ratingId);

      // If active survey questions exist, route to Step 2
      if (result.hasActiveQuestions) {
        setStep(2);
      } else {
        await handleCompletion(result.ratingId);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Error saving feedback";
      setErrorMsg(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSurveySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setValidationError(null);

    if (!ratingId) {
      setValidationError("No rating session found. Please refresh.");
      return;
    }

    // Validate that all questions are answered
    const unanswered = (activeQuestions || []).filter((q) => !surveyScores[q._id]);
    if (unanswered.length > 0) {
      setValidationError("Please answer all survey questions before submitting.");
      return;
    }

    setLoading(true);
    try {
      const answersPayload = Object.entries(surveyScores).map(([qId, score]) => ({
        questionId: qId as Id<"surveyQuestions">,
        score,
      }));

      await submitSurveyMutation({
        ratingId,
        answers: answersPayload,
      });

      await handleCompletion(ratingId);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Error submitting survey responses");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyAgain = async () => {
    if (review.trim()) {
      try {
        await navigator.clipboard.writeText(review.trim());
        setClipboardCopied(true);
      } catch (clipErr) {
        console.error("Clipboard copy failed:", clipErr);
      }
    }
  };

  // Render emotion indicator matching star value
  const renderEmotion = () => {
    switch (selectedStar) {
      case 1:
        return (
          <div className="text-center animate-fade-in mt-4">
            <Frown className="w-16 h-16 text-red-500 mx-auto fill-red-100" />
            <strong className="block text-lg mt-2 text-red-700">Very Bad!</strong>
            <p className="text-sm text-gray-500">You rated us 1 Star</p>
          </div>
        );
      case 2:
        return (
          <div className="text-center animate-fade-in mt-4">
            <Frown className="w-16 h-16 text-red-500 mx-auto fill-red-100" />
            <strong className="block text-lg mt-2 text-red-700">Bad!</strong>
            <p className="text-sm text-gray-500">You rated us 2 Star</p>
          </div>
        );
      case 3:
        return (
          <div className="text-center animate-fade-in mt-4">
            <Meh className="w-16 h-16 text-amber-500 mx-auto fill-amber-100" />
            <strong className="block text-lg mt-2 text-amber-700">Good!</strong>
            <p className="text-sm text-gray-500">You rated us 3 Star</p>
          </div>
        );
      case 4:
        return (
          <div className="text-center animate-fade-in mt-4">
            <Smile className="w-16 h-16 text-emerald-500 mx-auto fill-emerald-100" />
            <strong className="block text-lg mt-2 text-emerald-700">Very Good!</strong>
            <p className="text-sm text-gray-500">You rated us 4 Star</p>
          </div>
        );
      case 5:
        return (
          <div className="text-center animate-fade-in mt-4">
            <Smile className="w-16 h-16 text-emerald-600 mx-auto fill-emerald-100" />
            <strong className="block text-lg mt-2 text-emerald-700">Excellent!</strong>
            <p className="text-sm text-gray-500">You rated us 5 Star</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {companyBranding && (
        <div className="sm:mx-auto sm:w-full sm:max-w-md flex items-center justify-center space-x-2 mb-2">
          {companyBranding.cmpyLogo ? (
            <img src={companyBranding.cmpyLogo} alt="Logo" className="h-6 object-contain rounded border border-gray-200 p-0.5" />
          ) : null}
          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{companyBranding.cmpyName}</span>
        </div>
      )}
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-2 text-center text-3xl font-extrabold text-gray-900 flex items-center justify-center space-x-2">
          {platform.logo ? (
            <img src={platform.logo} alt={platform.webName} className="w-8 h-8 rounded-full object-cover" />
          ) : (
            <Globe className="w-8 h-8 text-[#294a63]" />
          )}
          <span className="text-[#294a63]">{platform.webName}</span>
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Kindly review us
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-xl sm:px-10 border border-gray-150 relative overflow-hidden">
          {/* Success Banner */}
          {successMsg && (
            <div className="absolute inset-0 bg-white/95 z-30 flex flex-col items-center justify-center p-6 text-center transition-all animate-fade-in">
              <ThumbsUp className="w-16 h-16 text-emerald-500 animate-bounce mb-4" />
              <h3 className="text-2xl font-bold text-gray-800">{successMsg}</h3>
              {selectedStar !== null && selectedStar > 3 ? (
                <div className="space-y-4 mt-2">
                  <p className="text-sm font-semibold text-gray-600">
                    Your review has been copied.
                  </p>
                  <p className="text-xs text-gray-500">
                    Paste it on Google Reviews.
                  </p>
                  {clipboardCopied && (
                    <div className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full inline-block">
                      Review copied to clipboard!
                    </div>
                  )}
                  <p className="text-sm text-gray-500">
                    Redirecting you to review page in <span className="font-bold text-[#294a63]">{countdown ?? 4}</span> seconds...
                  </p>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
                    <a
                      href={platform.webLink.startsWith("http") ? platform.webLink : `https://${platform.webLink}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-[#294a63] hover:bg-opacity-95 shadow-sm transition-all"
                    >
                      Open Google Now
                    </a>
                    <button
                      type="button"
                      onClick={handleCopyAgain}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 shadow-sm transition-all"
                    >
                      Copy Review Again
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500 mt-2">Thank you for your rating.</p>
              )}
            </div>
          )}

          {/* Error Banner */}
          {errorMsg && (
            <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-4 rounded text-sm text-red-700 flex items-start space-x-2">
              <ThumbsDown className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="space-y-6">
            {step === 1 && (
              <>
                {/* Stars Interface */}
                <div className="flex justify-center space-x-2 py-4 border-b border-gray-100">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => handleRatingClick(star)}
                      type="button"
                      className="focus:outline-none hover:scale-110 transition-transform"
                    >
                      <Star 
                        className={`w-10 h-10 ${
                          selectedStar !== null && star <= selectedStar 
                            ? "text-amber-400 fill-amber-400" 
                            : "text-gray-300"
                        }`} 
                      />
                    </button>
                  ))}
                </div>

                {/* Emotion description panel */}
                {renderEmotion()}

                {/* Feedback Detail Fields */}
                {selectedStar !== null && (
                  <form onSubmit={handleSubmit} className="space-y-6 pt-4 border-t border-gray-100 animate-fade-in">
                    {validationError && (
                      <div className="text-xs font-semibold text-red-500 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
                        {validationError}
                      </div>
                    )}
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700">
                          Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Your Name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="mt-1.5 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-[#294a63] focus:border-[#294a63] sm:text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700">
                          Mobile <span className="text-red-500">*</span>
                        </label>
                        <div className="mt-1.5 relative rounded-lg shadow-sm">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="text-gray-500 sm:text-sm">+91</span>
                          </div>
                          <input
                            type="number"
                            required
                            placeholder="Your Mobile"
                            value={mobile}
                            onChange={(e) => setMobile(e.target.value)}
                            className="block w-full pl-12 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#294a63] focus:border-[#294a63] sm:text-sm"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700">
                        Review <span className="text-xs text-gray-400 font-medium">(optional)</span>
                      </label>
                      <textarea
                        rows={3}
                        placeholder="Your review..."
                        value={review}
                        onChange={(e) => setReview(e.target.value)}
                        className="mt-1.5 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-[#294a63] focus:border-[#294a63] sm:text-sm"
                      />
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={loading}
                        className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-[#294a63] hover:bg-opacity-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#294a63] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        {loading ? "Saving..." : "Submit"}
                      </button>
                    </div>
                  </form>
                )}
              </>
            )}

            {step === 2 && (
              <form onSubmit={handleSurveySubmit} className="space-y-6 pt-4 animate-fade-in">
                <div className="text-center mb-4">
                  <h3 className="text-lg font-bold text-gray-800">Customer Satisfaction Sheet</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Using the satisfaction scale, select a rating from 1 to 5 for each question.
                  </p>
                  <div className="flex flex-wrap justify-center gap-3 mt-3 text-[10px] text-gray-500 font-semibold bg-gray-50 p-2 rounded-lg border border-gray-100">
                    <span>😠 1 = Poor</span>
                    <span>😐 2 = Fair</span>
                    <span>🙂 3 = Good</span>
                    <span>😀 4 = Very Good</span>
                    <span>🤩 5 = WOW!!</span>
                  </div>
                </div>

                {validationError && (
                  <div className="text-xs font-semibold text-red-500 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
                    {validationError}
                  </div>
                )}

                <div className="space-y-5">
                  {(activeQuestions || []).map((q) => (
                    <div key={q._id} className="space-y-2 pb-3 border-b border-gray-100 last:border-b-0">
                      <label className="block text-sm font-semibold text-gray-700">
                        {q.questionText}
                      </label>
                      <div className="flex items-center justify-between gap-1.5">
                        {[1, 2, 3, 4, 5].map((score) => {
                          const isSelected = surveyScores[q._id] === score;
                          const scoreEmojis = ["😠", "😐", "🙂", "😀", "🤩"];
                          return (
                            <button
                              key={score}
                              type="button"
                              onClick={() => setSurveyScores((prev) => ({ ...prev, [q._id]: score }))}
                              className={`flex-1 py-2 px-1 rounded-lg border text-xs font-semibold flex flex-col items-center justify-center transition-all ${
                                isSelected
                                  ? "bg-[#294a63] text-white border-[#294a63] scale-105 shadow-sm"
                                  : "bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100"
                              }`}
                            >
                              <span className="text-lg mb-0.5">{scoreEmojis[score - 1]}</span>
                              <span>{score}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end pt-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-[#294a63] hover:bg-opacity-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#294a63] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {loading ? "Submitting..." : "Submit Survey"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
