"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { useState } from "react";
import { FileText, CheckCircle, AlertTriangle, Plus, Edit3, X } from "lucide-react";
import { Id } from "../../../../../convex/_generated/dataModel";

export default function AdminPlansPage() {
  const user = useQuery(api.users.currentUser);
  const plans = useQuery(api.plans.getAllPlans);
  const updatePlanMutation = useMutation(api.plans.updatePlan);
  const addPlanMutation = useMutation(api.plans.addPlan);

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<Id<"plans"> | null>(null);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [per, setPer] = useState("+ GST Per Year");
  const [smsQuota, setSmsQuota] = useState(0);
  const [emailQuota, setEmailQuota] = useState(0);
  const [whatsappQuota, setWhatsappQuota] = useState(0);
  const [webQuota, setWebQuota] = useState(0);
  const [orderBy, setOrderBy] = useState(1);
  const [active, setActive] = useState(1);

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (user === undefined || plans === undefined) {
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

  const openAddModal = () => {
    setEditingId(null);
    setName("");
    setAmount("");
    setPer("+ GST Per Year");
    setSmsQuota(0);
    setEmailQuota(0);
    setWhatsappQuota(0);
    setWebQuota(0);
    setOrderBy((plans?.length || 0) + 1);
    setActive(1);
    setShowModal(true);
    setSuccessMsg(null);
    setErrorMsg(null);
  };

  const openEditModal = (plan: NonNullable<typeof plans>[number]) => {
    setEditingId(plan._id);
    setName(plan.name);
    setAmount(plan.amount);
    setPer(plan.per);
    setSmsQuota(plan.smsQuota);
    setEmailQuota(plan.emailQuota);
    setWhatsappQuota(plan.whatsappQuota);
    setWebQuota(plan.webQuota);
    setOrderBy(plan.orderBy);
    setActive(plan.active);
    setShowModal(true);
    setSuccessMsg(null);
    setErrorMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg(null);
    setErrorMsg(null);

    if (!name.trim() || !amount.trim()) {
      setErrorMsg("Name and amount are required");
      return;
    }

    setLoading(true);
    try {
      if (editingId) {
        await updatePlanMutation({
          planId: editingId,
          name: name.trim(),
          amount: amount.trim(),
          per: per.trim(),
          smsQuota,
          emailQuota,
          whatsappQuota,
          webQuota,
          orderBy,
          active,
        });
        setSuccessMsg("Plan updated");
      } else {
        await addPlanMutation({
          name: name.trim(),
          amount: amount.trim(),
          per: per.trim(),
          smsQuota,
          emailQuota,
          whatsappQuota,
          webQuota,
          orderBy,
          active,
        });
        setSuccessMsg("Plan added");
      }
      setShowModal(false);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between bg-white p-6 rounded-xl border border-gray-200/80 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center space-x-2">
            <FileText className="w-7 h-7 text-[#294a63]" />
            <span>Plans</span>
          </h1>
          <p className="text-gray-500 mt-1">Manage pricing plans for new users.</p>
        </div>
        <button
          onClick={openAddModal}
          className="inline-flex items-center px-4 py-2 bg-[#294a63] text-white text-sm font-semibold rounded-lg hover:bg-opacity-90 transition-all"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Plan
        </button>
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

      {/* Plans Table */}
      <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase">
              <tr>
                <th className="px-6 py-3.5">Order</th>
                <th className="px-6 py-3.5">Name</th>
                <th className="px-6 py-3.5">Amount</th>
                <th className="px-6 py-3.5">SMS</th>
                <th className="px-6 py-3.5">Email</th>
                <th className="px-6 py-3.5">WhatsApp</th>
                <th className="px-6 py-3.5">Web</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {(plans ?? []).map((plan) => (
                <tr key={plan._id} className="hover:bg-gray-50/50">
                  <td className="px-6 py-4">{plan.orderBy}</td>
                  <td className="px-6 py-4 font-semibold">{plan.name}</td>
                  <td className="px-6 py-4">₹{plan.amount} {plan.per}</td>
                  <td className="px-6 py-4">{plan.smsQuota}</td>
                  <td className="px-6 py-4">{plan.emailQuota}</td>
                  <td className="px-6 py-4">{plan.whatsappQuota}</td>
                  <td className="px-6 py-4">{plan.webQuota}</td>
                  <td className="px-6 py-4">
                    {plan.active === 1 ? (
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded border border-emerald-100">Active</span>
                    ) : (
                      <span className="px-2 py-0.5 bg-gray-50 text-gray-500 text-xs font-semibold rounded border border-gray-200">Disabled</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => openEditModal(plan)}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-16">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 relative animate-fade-in">
            <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-gray-800 mb-4">
              {editingId ? "Edit Plan" : "Add Plan"}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Name</label>
                  <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#294a63]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Amount (₹)</label>
                  <input type="text" required value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#294a63]" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Period Label</label>
                  <input type="text" value={per} onChange={(e) => setPer(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#294a63]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Order</label>
                  <input type="number" value={orderBy} onChange={(e) => setOrderBy(Number(e.target.value))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#294a63]" />
                </div>
              </div>
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">SMS</label>
                  <input type="number" value={smsQuota} onChange={(e) => setSmsQuota(Number(e.target.value))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#294a63]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Email</label>
                  <input type="number" value={emailQuota} onChange={(e) => setEmailQuota(Number(e.target.value))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#294a63]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">WhatsApp</label>
                  <input type="number" value={whatsappQuota} onChange={(e) => setWhatsappQuota(Number(e.target.value))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#294a63]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Web</label>
                  <input type="number" value={webQuota} onChange={(e) => setWebQuota(Number(e.target.value))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#294a63]" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Status</label>
                <select value={active} onChange={(e) => setActive(Number(e.target.value))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#294a63]">
                  <option value={1}>Active</option>
                  <option value={0}>Disabled</option>
                </select>
              </div>
              <div className="flex justify-end">
                <button type="submit" disabled={loading} className="px-4 py-2 bg-[#294a63] text-white text-sm font-semibold rounded-lg hover:bg-opacity-90 disabled:opacity-50 transition-all">
                  {loading ? "Saving..." : editingId ? "Update" : "Add"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
