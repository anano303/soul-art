"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getCampaigns,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  activateCampaign,
  deactivateCampaign,
  endCampaign,
  Campaign,
  CreateCampaignDto,
} from "../api/campaigns";
import {
  Plus,
  Play,
  Pause,
  Square,
  Trash2,
  Pencil,
  Calendar,
  TrendingUp,
  DollarSign,
  ShoppingCart,
  X,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import HeartLoading from "@/components/HeartLoading/HeartLoading";
import "./campaigns-list.css";

const statusColors: Record<string, string> = {
  draft: "#6c757d",
  active: "#28a745",
  scheduled: "#17a2b8",
  ended: "#dc3545",
  paused: "#ffc107",
};

const statusLabels: Record<string, string> = {
  draft: "მომზადება",
  active: "აქტიური",
  scheduled: "დაგეგმილი",
  ended: "დასრულებული",
  paused: "შეჩერებული",
};

export function CampaignsList() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const queryClient = useQueryClient();

  const { data: campaigns, isLoading } = useQuery({
    queryKey: ["campaigns"],
    queryFn: () => getCampaigns(),
  });

  const createMutation = useMutation({
    mutationFn: createCampaign,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      setIsModalOpen(false);
      toast({ title: "Success", description: "Campaign created" });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<CreateCampaignDto>;
    }) => updateCampaign(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      setEditingCampaign(null);
      toast({ title: "Success", description: "Campaign updated" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCampaign,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      toast({ title: "Success", description: "Campaign deleted" });
    },
  });

  const activateMutation = useMutation({
    mutationFn: activateCampaign,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      toast({ title: "Success", description: "Campaign activated!" });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: deactivateCampaign,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      toast({ title: "Success", description: "Campaign paused" });
    },
  });

  const endMutation = useMutation({
    mutationFn: endCampaign,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      toast({ title: "Success", description: "Campaign ended" });
    },
  });

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this campaign?")) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) {
    return <HeartLoading size="medium" />;
  }

  return (
    <div className="campaigns-container">
      <div className="campaigns-header">
        <h1 className="campaigns-title">აქციები და პრომოციები</h1>
        <button
          className="campaigns-add-btn"
          onClick={() => setIsModalOpen(true)}
        >
          <Plus size={20} />
          ახალი აქცია
        </button>
      </div>

      <div className="campaigns-grid">
        {campaigns?.map((campaign) => (
          <div key={campaign._id} className="campaign-card">
            <div className="campaign-card-header">
              <div className="campaign-name">{campaign.name}</div>
              <span
                className="campaign-status"
                style={{ backgroundColor: statusColors[campaign.status] }}
              >
                {statusLabels[campaign.status]}
              </span>
            </div>

            {campaign.description && (
              <p className="campaign-description">{campaign.description}</p>
            )}

            <div className="campaign-dates">
              <Calendar size={16} />
              <span>
                {new Date(campaign.startDate).toLocaleDateString()} -{" "}
                {new Date(campaign.endDate).toLocaleDateString()}
              </span>
            </div>

            <div className="campaign-settings">
              <div className="campaign-setting">
                <span className="setting-label">მაქს. ფასდაკლება:</span>
                <span className="setting-value">
                  {campaign.maxDiscountPercent}%
                </span>
              </div>
              <div className="campaign-setting">
                <span className="setting-label">ვრცელდება:</span>
                <span className="setting-value">
                  {campaign.appliesTo.includes("all_visitors")
                    ? "ყველაზე"
                    : "მხოლოდ რეფერალებზე"}
                </span>
              </div>
            </div>

            <div className="campaign-analytics">
              <div className="analytics-item">
                <ShoppingCart size={16} />
                <span>{campaign.totalOrders} შეკვეთა</span>
              </div>
              <div className="analytics-item">
                <DollarSign size={16} />
                <span>₾{campaign.totalRevenue.toLocaleString()}</span>
              </div>
              <div className="analytics-item">
                <TrendingUp size={16} />
                <span>-₾{campaign.totalDiscount.toLocaleString()}</span>
              </div>
            </div>

            <div className="campaign-actions">
              {campaign.status === "draft" && (
                <button
                  className="action-btn action-activate"
                  onClick={() => activateMutation.mutate(campaign._id)}
                  disabled={activateMutation.isPending}
                >
                  <Play size={16} />
                  გააქტიურება
                </button>
              )}
              {campaign.status === "active" && (
                <>
                  <button
                    className="action-btn action-pause"
                    onClick={() => deactivateMutation.mutate(campaign._id)}
                  >
                    <Pause size={16} />
                    პაუზა
                  </button>
                  <button
                    className="action-btn action-end"
                    onClick={() => endMutation.mutate(campaign._id)}
                  >
                    <Square size={16} />
                    დასრულება
                  </button>
                </>
              )}
              {campaign.status === "paused" && (
                <button
                  className="action-btn action-activate"
                  onClick={() => activateMutation.mutate(campaign._id)}
                >
                  <Play size={16} />
                  განახლება
                </button>
              )}
              <button
                className="action-btn action-edit"
                onClick={() => setEditingCampaign(campaign)}
              >
                <Pencil size={16} />
              </button>
              <button
                className="action-btn action-delete"
                onClick={() => handleDelete(campaign._id)}
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}

        {(!campaigns || campaigns.length === 0) && (
          <div className="campaigns-empty">
            <p>აქციები არ არის. შექმენით პირველი აქცია!</p>
          </div>
        )}
      </div>

      {(isModalOpen || editingCampaign) && (
        <CampaignModal
          campaign={editingCampaign}
          onClose={() => {
            setIsModalOpen(false);
            setEditingCampaign(null);
          }}
          onSave={(data) => {
            if (editingCampaign) {
              updateMutation.mutate({ id: editingCampaign._id, data });
            } else {
              createMutation.mutate(data);
            }
          }}
          isLoading={createMutation.isPending || updateMutation.isPending}
        />
      )}
    </div>
  );
}

interface CampaignModalProps {
  campaign: Campaign | null;
  onClose: () => void;
  onSave: (data: CreateCampaignDto) => void;
  isLoading: boolean;
}

function CampaignModal({
  campaign,
  onClose,
  onSave,
  isLoading,
}: CampaignModalProps) {
  const [formData, setFormData] = useState<CreateCampaignDto>({
    name: campaign?.name || "",
    description: campaign?.description || "",
    startDate:
      campaign?.startDate?.slice(0, 10) ||
      new Date().toISOString().slice(0, 10),
    endDate: campaign?.endDate?.slice(0, 10) || "",
    appliesTo: campaign?.appliesTo || ["influencer_referrals"],
    onlyProductsWithPermission: campaign?.onlyProductsWithPermission ?? true,
    discountSource: campaign?.discountSource || "product_referral_discount",
    maxDiscountPercent: campaign?.maxDiscountPercent ?? 15,
    useMaxAsOverride: campaign?.useMaxAsOverride ?? false,
    badgeText: campaign?.badgeText || "Campaign price",
    badgeTextGe: campaign?.badgeTextGe || "აქციის ფასი",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{campaign ? "აქციის რედაქტირება" : "ახალი აქცია"}</h2>
          <button className="modal-close" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="campaign-form">
          <div className="form-group">
            <label>აქციის სახელი *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
              placeholder="მაგ., გაზაფხულის ფასდაკლება 2026"
            />
          </div>

          <div className="form-group">
            <label>აღწერა</label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="აქციის აღწერა..."
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>დაწყების თარიღი *</label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) =>
                  setFormData({ ...formData, startDate: e.target.value })
                }
                required
              />
            </div>
            <div className="form-group">
              <label>დასრულების თარიღი *</label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) =>
                  setFormData({ ...formData, endDate: e.target.value })
                }
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>ვრცელდება</label>
            <div className="checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.appliesTo?.includes("influencer_referrals")}
                  onChange={(e) => {
                    const current = formData.appliesTo || [];
                    if (e.target.checked) {
                      setFormData({
                        ...formData,
                        appliesTo: [...current, "influencer_referrals"],
                      });
                    } else {
                      setFormData({
                        ...formData,
                        appliesTo: current.filter(
                          (a) => a !== "influencer_referrals"
                        ),
                      });
                    }
                  }}
                />
                ინფლუენსერების რეფერალები
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.appliesTo?.includes("all_visitors")}
                  onChange={(e) => {
                    const current = formData.appliesTo || [];
                    if (e.target.checked) {
                      setFormData({
                        ...formData,
                        appliesTo: [...current, "all_visitors"],
                      });
                    } else {
                      setFormData({
                        ...formData,
                        appliesTo: current.filter((a) => a !== "all_visitors"),
                      });
                    }
                  }}
                />
                ყველა მომხმარებელი
              </label>
            </div>
          </div>

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={formData.onlyProductsWithPermission}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    onlyProductsWithPermission: e.target.checked,
                  })
                }
              />
              მხოლოდ ფასდაკლების უფლების მქონე პროდუქტები
            </label>
          </div>

          <div className="form-group">
            <label>ფასდაკლების წყარო</label>
            <select
              value={formData.discountSource}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  discountSource: e.target.value as any,
                })
              }
            >
              <option value="product_referral_discount">
                პროდუქტის რეფერალის ფასდაკლება %
              </option>
              <option value="artist_default">
                არტისტის ნაგულისხმევი ფასდაკლება %
              </option>
              <option value="override">Override (გამოიყენე მაქს %)</option>
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>მაქსიმალური ფასდაკლება %</label>
              <input
                type="number"
                min="0"
                max="50"
                value={formData.maxDiscountPercent}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    maxDiscountPercent: Number(e.target.value),
                  })
                }
              />
            </div>
            <div className="form-group">
              <label className="checkbox-label" style={{ marginTop: "2rem" }}>
                <input
                  type="checkbox"
                  checked={formData.useMaxAsOverride}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      useMaxAsOverride: e.target.checked,
                    })
                  }
                />
                Override-ად გამოყენება (არა ზღვარი)
              </label>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>ბეჯის ტექსტი (EN)</label>
              <input
                type="text"
                value={formData.badgeText}
                onChange={(e) =>
                  setFormData({ ...formData, badgeText: e.target.value })
                }
                placeholder="Campaign price"
              />
            </div>
            <div className="form-group">
              <label>ბეჯის ტექსტი (GE)</label>
              <input
                type="text"
                value={formData.badgeTextGe}
                onChange={(e) =>
                  setFormData({ ...formData, badgeTextGe: e.target.value })
                }
                placeholder="აქციის ფასი"
              />
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>
              გაუქმება
            </button>
            <button type="submit" className="btn-save" disabled={isLoading}>
              {isLoading ? "შენახვა..." : campaign ? "განახლება" : "შექმნა"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
