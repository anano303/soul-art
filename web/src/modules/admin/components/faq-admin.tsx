"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import {
  Plus,
  Pencil,
  Trash2,
  GripVertical,
  Eye,
  EyeOff,
  Save,
  X,
  ChevronDown,
  ChevronUp,
  HelpCircle,
} from "lucide-react";
import "./faq-admin.css";

interface FaqItem {
  _id: string;
  questionKa: string;
  questionEn?: string;
  answerKa: string;
  answerEn?: string;
  order: number;
  isActive: boolean;
}

interface FaqFormData {
  questionKa: string;
  questionEn: string;
  answerKa: string;
  answerEn: string;
  isActive: boolean;
}

const emptyForm: FaqFormData = {
  questionKa: "",
  questionEn: "",
  answerKa: "",
  answerEn: "",
  isActive: true,
};

export function FaqAdmin() {
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<FaqFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const fetchFaqs = useCallback(async () => {
    try {
      const res = await fetchWithAuth("/faq/admin/all");
      if (res.ok) {
        const data = await res.json();
        setFaqs(data);
      }
    } catch (err) {
      console.error("Failed to fetch FAQs:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFaqs();
  }, [fetchFaqs]);

  const handleCreate = async () => {
    if (!formData.questionKa.trim() || !formData.answerKa.trim()) return;
    setSaving(true);
    try {
      const res = await fetchWithAuth("/faq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setIsCreating(false);
        setFormData(emptyForm);
        fetchFaqs();
      }
    } catch (err) {
      console.error("Failed to create FAQ:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingId || !formData.questionKa.trim() || !formData.answerKa.trim())
      return;
    setSaving(true);
    try {
      const res = await fetchWithAuth(`/faq/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setEditingId(null);
        setFormData(emptyForm);
        fetchFaqs();
      }
    } catch (err) {
      console.error("Failed to update FAQ:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("ნამდვილად გსურთ წაშლა?")) return;
    try {
      const res = await fetchWithAuth(`/faq/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchFaqs();
      }
    } catch (err) {
      console.error("Failed to delete FAQ:", err);
    }
  };

  const handleToggleActive = async (faq: FaqItem) => {
    try {
      const res = await fetchWithAuth(`/faq/${faq._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !faq.isActive }),
      });
      if (res.ok) {
        fetchFaqs();
      }
    } catch (err) {
      console.error("Failed to toggle FAQ:", err);
    }
  };

  const startEdit = (faq: FaqItem) => {
    setEditingId(faq._id);
    setIsCreating(false);
    setFormData({
      questionKa: faq.questionKa,
      questionEn: faq.questionEn || "",
      answerKa: faq.answerKa,
      answerEn: faq.answerEn || "",
      isActive: faq.isActive,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setIsCreating(false);
    setFormData(emptyForm);
  };

  // Drag & Drop reorder
  const handleDragStart = (id: string) => {
    setDraggedId(id);
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) return;

    setFaqs((prev) => {
      const items = [...prev];
      const dragIdx = items.findIndex((f) => f._id === draggedId);
      const targetIdx = items.findIndex((f) => f._id === targetId);
      if (dragIdx === -1 || targetIdx === -1) return prev;

      const [removed] = items.splice(dragIdx, 1);
      items.splice(targetIdx, 0, removed);
      return items;
    });
  };

  const handleDragEnd = async () => {
    if (!draggedId) return;
    setDraggedId(null);

    const ids = faqs.map((f) => f._id);
    try {
      await fetchWithAuth("/faq/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
    } catch (err) {
      console.error("Failed to reorder FAQs:", err);
      fetchFaqs();
    }
  };

  if (isLoading) {
    return (
      <div className="faq-admin-loading">
        <div className="faq-admin-spinner" />
        <p>იტვირთება...</p>
      </div>
    );
  }

  return (
    <div className="faq-admin">
      {/* Header */}
      <div className="faq-admin-header">
        <div className="faq-admin-header-left">
          <HelpCircle size={28} />
          <div>
            <h1>ხშირად დასმული კითხვები</h1>
            <p>{faqs.length} კითხვა სულ</p>
          </div>
        </div>
        <button
          className="faq-admin-add-btn"
          onClick={() => {
            setIsCreating(true);
            setEditingId(null);
            setFormData(emptyForm);
          }}
        >
          <Plus size={18} />
          დამატება
        </button>
      </div>

      {/* Create / Edit Form */}
      {(isCreating || editingId) && (
        <div className="faq-admin-form-card">
          <div className="faq-admin-form-header">
            <h3>{isCreating ? "ახალი კითხვა" : "რედაქტირება"}</h3>
            <button className="faq-admin-form-close" onClick={cancelEdit}>
              <X size={18} />
            </button>
          </div>

          <div className="faq-admin-form">
            <div className="faq-admin-form-row">
              <div className="faq-admin-form-group">
                <label>კითხვა (ქართული) *</label>
                <input
                  type="text"
                  value={formData.questionKa}
                  onChange={(e) =>
                    setFormData({ ...formData, questionKa: e.target.value })
                  }
                  placeholder="მაგ: როგორ შევუკვეთო ნახატი?"
                />
              </div>
              <div className="faq-admin-form-group">
                <label>კითხვა (English)</label>
                <input
                  type="text"
                  value={formData.questionEn}
                  onChange={(e) =>
                    setFormData({ ...formData, questionEn: e.target.value })
                  }
                  placeholder="e.g. How do I order a painting?"
                />
              </div>
            </div>

            <div className="faq-admin-form-row">
              <div className="faq-admin-form-group">
                <label>პასუხი (ქართული) *</label>
                <textarea
                  value={formData.answerKa}
                  onChange={(e) =>
                    setFormData({ ...formData, answerKa: e.target.value })
                  }
                  placeholder="პასუხი ქართულად..."
                  rows={4}
                />
              </div>
              <div className="faq-admin-form-group">
                <label>პასუხი (English)</label>
                <textarea
                  value={formData.answerEn}
                  onChange={(e) =>
                    setFormData({ ...formData, answerEn: e.target.value })
                  }
                  placeholder="Answer in English..."
                  rows={4}
                />
              </div>
            </div>

            <div className="faq-admin-form-actions">
              <label className="faq-admin-toggle-label">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) =>
                    setFormData({ ...formData, isActive: e.target.checked })
                  }
                />
                <span>აქტიური</span>
              </label>
              <div className="faq-admin-form-btns">
                <button
                  className="faq-admin-cancel-btn"
                  onClick={cancelEdit}
                >
                  გაუქმება
                </button>
                <button
                  className="faq-admin-save-btn"
                  onClick={isCreating ? handleCreate : handleUpdate}
                  disabled={
                    saving ||
                    !formData.questionKa.trim() ||
                    !formData.answerKa.trim()
                  }
                >
                  <Save size={16} />
                  {saving ? "ინახება..." : "შენახვა"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FAQ List */}
      {faqs.length === 0 ? (
        <div className="faq-admin-empty">
          <HelpCircle size={48} />
          <p>კითხვები ჯერ არ არის დამატებული</p>
          <button
            className="faq-admin-add-btn"
            onClick={() => {
              setIsCreating(true);
              setFormData(emptyForm);
            }}
          >
            <Plus size={18} />
            პირველი კითხვის დამატება
          </button>
        </div>
      ) : (
        <div className="faq-admin-list">
          {faqs.map((faq, index) => (
            <div
              key={faq._id}
              className={`faq-admin-item ${!faq.isActive ? "faq-admin-item-inactive" : ""} ${draggedId === faq._id ? "faq-admin-item-dragging" : ""}`}
              draggable
              onDragStart={() => handleDragStart(faq._id)}
              onDragOver={(e) => handleDragOver(e, faq._id)}
              onDragEnd={handleDragEnd}
            >
              <div className="faq-admin-item-header">
                <div className="faq-admin-item-left">
                  <div className="faq-admin-drag-handle">
                    <GripVertical size={18} />
                  </div>
                  <span className="faq-admin-item-number">{index + 1}</span>
                  <div
                    className="faq-admin-item-question"
                    onClick={() =>
                      setExpandedId(
                        expandedId === faq._id ? null : faq._id
                      )
                    }
                  >
                    <span>{faq.questionKa}</span>
                    {expandedId === faq._id ? (
                      <ChevronUp size={18} />
                    ) : (
                      <ChevronDown size={18} />
                    )}
                  </div>
                </div>
                <div className="faq-admin-item-actions">
                  <button
                    className={`faq-admin-action-btn ${faq.isActive ? "active" : "inactive"}`}
                    onClick={() => handleToggleActive(faq)}
                    title={faq.isActive ? "გამორთვა" : "ჩართვა"}
                  >
                    {faq.isActive ? <Eye size={16} /> : <EyeOff size={16} />}
                  </button>
                  <button
                    className="faq-admin-action-btn edit"
                    onClick={() => startEdit(faq)}
                    title="რედაქტირება"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    className="faq-admin-action-btn delete"
                    onClick={() => handleDelete(faq._id)}
                    title="წაშლა"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {expandedId === faq._id && (
                <div className="faq-admin-item-body">
                  <div className="faq-admin-item-answer">
                    <strong>🇬🇪 ქართული:</strong>
                    <p>{faq.answerKa}</p>
                  </div>
                  {faq.answerEn && (
                    <div className="faq-admin-item-answer">
                      <strong>🇬🇧 English:</strong>
                      <p>{faq.answerEn}</p>
                    </div>
                  )}
                  {faq.questionEn && (
                    <div className="faq-admin-item-answer">
                      <strong>🇬🇧 Question (EN):</strong>
                      <p>{faq.questionEn}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
