"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { useState, useEffect } from "react";
import {
  Settings,
  CheckCircle,
  AlertTriangle,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Edit2,
  Check,
  X,
} from "lucide-react";
import { Id } from "../../../../../convex/_generated/dataModel";

export default function AdminSettingsPage() {
  const user = useQuery(api.users.currentUser);
  const settings = useQuery(api.settings.getSettings);
  const updateSettingsMutation = useMutation(api.settings.updateSettings);

  // Survey management hooks
  const questions = useQuery(api.surveys.getAllQuestions);
  const createQuestionMutation = useMutation(api.surveys.createQuestion);
  const updateQuestionMutation = useMutation(api.surveys.updateQuestion);
  const deleteQuestionMutation = useMutation(api.surveys.deleteQuestion);
  const reorderQuestionsMutation = useMutation(api.surveys.reorderQuestions);
  const seedSurveyQuestions = useMutation(api.surveys.seedSurveyQuestions);

  useEffect(() => {
    if (questions && questions.length === 0) {
      seedSurveyQuestions({});
    }
  }, [questions, seedSurveyQuestions]);

  const [siteName, setSiteName] = useState("");
  const [siteTitle, setSiteTitle] = useState("");
  const [siteDesc, setSiteDesc] = useState("");
  const [siteKeywords, setSiteKeywords] = useState("");
  const [captchaSiteKey, setCaptchaSiteKey] = useState("");
  const [protocol, setProtocol] = useState("smtp");

  // Survey states
  const [newQuestionText, setNewQuestionText] = useState("");
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");

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

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg(null);
    setErrorMsg(null);
    if (!newQuestionText.trim()) return;

    setLoading(true);
    try {
      await createQuestionMutation({ questionText: newQuestionText.trim() });
      setNewQuestionText("");
      setSuccessMsg("Survey question added successfully");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Error adding question");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (qId: Id<"surveyQuestions">, currentActive: number) => {
    setSuccessMsg(null);
    setErrorMsg(null);
    try {
      await updateQuestionMutation({
        id: qId,
        active: currentActive === 1 ? 0 : 1,
      });
      setSuccessMsg("Question status updated successfully");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Error updating status");
    }
  };

  const handleStartEdit = (qId: string, text: string) => {
    setSuccessMsg(null);
    setErrorMsg(null);
    setEditingQuestionId(qId);
    setEditingText(text);
  };

  const handleSaveEdit = async (qId: Id<"surveyQuestions">) => {
    if (!editingText.trim()) return;
    setSuccessMsg(null);
    setErrorMsg(null);
    try {
      await updateQuestionMutation({
        id: qId,
        questionText: editingText.trim(),
      });
      setEditingQuestionId(null);
      setSuccessMsg("Question text updated successfully");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Error updating question");
    }
  };

  const handleDeleteQuestion = async (qId: Id<"surveyQuestions">) => {
    if (!confirm("Are you sure you want to delete this question? All answers linked to this question will be deleted too.")) return;
    setSuccessMsg(null);
    setErrorMsg(null);
    try {
      await deleteQuestionMutation({ id: qId });
      setSuccessMsg("Question deleted successfully");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Error deleting question");
    }
  };

  const handleMoveQuestion = async (index: number, direction: "up" | "down") => {
    if (!questions) return;
    setSuccessMsg(null);
    setErrorMsg(null);
    const newQuestions = [...questions];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newQuestions.length) return;

    const temp = newQuestions[index];
    newQuestions[index] = newQuestions[targetIndex];
    newQuestions[targetIndex] = temp;

    try {
      await reorderQuestionsMutation({
        orderedIds: newQuestions.map((q) => q._id),
      });
      setSuccessMsg("Question order updated successfully");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Error reordering questions");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white p-6 rounded-xl border border-gray-200/80 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center space-x-2">
          <Settings className="w-7 h-7 text-[#294a63]" />
          <span>Settings & Surveys</span>
        </h1>
        <p className="text-gray-500 mt-1">Configure global site settings and manage satisfaction survey questions.</p>
      </div>

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left Column: Global Site Settings */}
        <div className="bg-white p-6 rounded-xl border border-gray-200/80 shadow-sm">
          <h2 className="text-lg font-bold text-gray-850 mb-4 pb-2 border-b border-gray-100 flex items-center space-x-2">
            <span>⚙️</span>
            <span>Global Site Settings</span>
          </h2>
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

        {/* Right Column: Survey Questionnaire Manager */}
        <div className="bg-white p-6 rounded-xl border border-gray-200/80 shadow-sm">
          <h2 className="text-lg font-bold text-gray-850 mb-4 pb-2 border-b border-gray-100 flex items-center space-x-2">
            <span>📝</span>
            <span>Survey Questionnaire Manager</span>
          </h2>

          <form onSubmit={handleAddQuestion} className="flex gap-2 mb-5">
            <input
              type="text"
              required
              placeholder="e.g., How would you rate the food quality?"
              value={newQuestionText}
              onChange={(e) => setNewQuestionText(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-[#294a63] text-sm"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-[#294a63] text-white text-sm font-semibold rounded-lg hover:bg-opacity-90 disabled:opacity-50 transition-all flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              <span>Add</span>
            </button>
          </form>

          <div className="space-y-3">
            {questions === undefined ? (
              <div className="text-center py-4 text-gray-400">Loading questions...</div>
            ) : questions.length === 0 ? (
              <div className="text-center py-6 text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                No survey questions configured yet. Add one above!
              </div>
            ) : (
              questions.map((q, idx) => {
                const isEditing = editingQuestionId === q._id;
                return (
                  <div
                    key={q._id}
                    className={`p-3 rounded-lg border transition-all flex items-center justify-between gap-3 ${
                      q.active === 1
                        ? "bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm"
                        : "bg-gray-50 border-gray-150 opacity-70"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#294a63]"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(q._id)}
                            className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingQuestionId(null)}
                            className="p-1 text-red-500 hover:bg-red-50 rounded"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-start gap-2">
                          <span className="text-xs font-mono font-bold text-gray-400 mt-0.5">#{idx + 1}</span>
                          <span className="text-sm text-gray-750 font-semibold break-words leading-relaxed">{q.questionText}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      {/* Active Status Badge Button */}
                      <button
                        type="button"
                        onClick={() => handleToggleActive(q._id, q.active)}
                        className={`px-2 py-0.5 text-[9px] font-bold rounded-full border transition-all ${
                          q.active === 1
                            ? "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                            : "bg-gray-100 border-gray-250 text-gray-500 hover:bg-gray-200"
                        }`}
                      >
                        {q.active === 1 ? "Active" : "Disabled"}
                      </button>

                      {/* Move Up */}
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleMoveQuestion(idx, "up")}
                        className="p-1 text-gray-450 hover:text-gray-700 hover:bg-gray-100 rounded disabled:opacity-30"
                        title="Move Up"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>

                      {/* Move Down */}
                      <button
                        type="button"
                        disabled={idx === questions.length - 1}
                        onClick={() => handleMoveQuestion(idx, "down")}
                        className="p-1 text-gray-450 hover:text-gray-700 hover:bg-gray-100 rounded disabled:opacity-30"
                        title="Move Down"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>

                      {/* Edit */}
                      {!isEditing && (
                        <button
                          type="button"
                          onClick={() => handleStartEdit(q._id, q.questionText)}
                          className="p-1 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => handleDeleteQuestion(q._id)}
                        className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
