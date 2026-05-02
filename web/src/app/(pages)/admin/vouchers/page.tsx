"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { apiClient } from "@/lib/axios";
import "./admin-vouchers.css";

type Currency = "GEL" | "USD" | "EUR";
type Amount = 100 | 200 | 500;

interface Voucher {
  _id: string;
  code: string;
  amount: number;
  currency: string;
  isUsed: boolean;
  isActive: boolean;
  expiresAt: string;
  usedAt?: string;
  usedBy?: { email: string; name?: string } | null;
  usedInOrder?: string | null;
  createdAt: string;
}

const CURRENCY_SYMBOLS: Record<Currency, string> = {
  GEL: "₾",
  USD: "$",
  EUR: "€",
};

export default function AdminVouchersPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  // Create form state
  const [createAmount, setCreateAmount] = useState<Amount>(100);
  const [createCurrency, setCreateCurrency] = useState<Currency>("GEL");
  const [createCount, setCreateCount] = useState(1);
  const [isCreating, setIsCreating] = useState(false);
  const [createSuccess, setCreateSuccess] = useState<string[] | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);

  // List state
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filterCurrency, setFilterCurrency] = useState<string>("");
  const [filterUsed, setFilterUsed] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  const limit = 30;

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "admin")) {
      router.push("/admin");
    }
  }, [user, authLoading, router]);

  const fetchVouchers = useCallback(async () => {
    setIsLoading(true);
    setListError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (filterCurrency) params.set("currency", filterCurrency);
      if (filterUsed !== "") params.set("isUsed", filterUsed);

      const res = await apiClient.get(`/vouchers?${params}`);
      setVouchers(res.data.items || []);
      setTotal(res.data.total || 0);
    } catch {
      setListError("ვაუჩერების ჩატვირთვა ვერ მოხდა");
    } finally {
      setIsLoading(false);
    }
  }, [page, filterCurrency, filterUsed]);

  useEffect(() => {
    if (user?.role === "admin") fetchVouchers();
  }, [user, fetchVouchers]);

  const handleCreate = async () => {
    setIsCreating(true);
    setCreateSuccess(null);
    setCreateError(null);
    try {
      const res = await apiClient.post(
        createCount > 1 ? "/vouchers/batch" : "/vouchers",
        createCount > 1
          ? {
              amount: createAmount,
              currency: createCurrency,
              count: createCount,
            }
          : { amount: createAmount, currency: createCurrency },
      );
      const created = Array.isArray(res.data) ? res.data : [res.data];
      setCreateSuccess(created.map((v: Voucher) => v.code));
      fetchVouchers();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setCreateError(err.response?.data?.message || "შექმნა ვერ მოხდა");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeactivate = async (id: string) => {
    if (!confirm("დარწმუნებული ხართ, რომ გსურთ ამ ვაუჩერის გაუქმება?")) return;
    try {
      await apiClient.patch(`/vouchers/${id}/deactivate`);
      fetchVouchers();
    } catch {
      alert("გაუქმება ვერ მოხდა");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
  };

  if (authLoading) return <div className="vouchers-loading">იტვირთება...</div>;

  return (
    <div className="admin-vouchers">
      <div className="vouchers-header">
        <button className="btn-back" onClick={() => router.push("/admin")}>
          ← ადმინ პანელი
        </button>
        <h1>🎟 ვაუჩერების მართვა</h1>
      </div>

      {/* ─── Create vouchers ───────────────────────────────────────────── */}
      <section className="vouchers-create-section">
        <h2>ახალი ვაუჩერ(ებ)ის შექმნა</h2>
        <div className="create-form">
          <div className="form-row">
            <label>თანხა</label>
            <div className="amount-buttons">
              {([100, 200, 500] as Amount[]).map((a) => (
                <button
                  key={a}
                  className={`amount-btn ${createAmount === a ? "active" : ""}`}
                  onClick={() => setCreateAmount(a)}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          <div className="form-row">
            <label>ვალუტა</label>
            <div className="currency-buttons">
              {(["GEL", "USD", "EUR"] as Currency[]).map((c) => (
                <button
                  key={c}
                  className={`currency-btn ${createCurrency === c ? "active" : ""}`}
                  onClick={() => setCreateCurrency(c)}
                >
                  {CURRENCY_SYMBOLS[c]} {c}
                </button>
              ))}
            </div>
          </div>

          <div className="form-row">
            <label>რაოდენობა (1–100)</label>
            <input
              type="number"
              min={1}
              max={100}
              value={createCount}
              onChange={(e) =>
                setCreateCount(
                  Math.min(100, Math.max(1, Number(e.target.value))),
                )
              }
              className="count-input"
            />
          </div>

          <div className="create-preview">
            გენერდება: <strong>{createCount}</strong> ვაუჩერი{" "}
            <strong>
              {createAmount} {CURRENCY_SYMBOLS[createCurrency]}
            </strong>{" "}
            ღირებულებით | ვადა: <strong>1 თვე</strong>
          </div>

          <button
            className="btn-create"
            onClick={handleCreate}
            disabled={isCreating}
          >
            {isCreating ? "იქმნება..." : "ვაუჩერ(ებ)ის შექმნა"}
          </button>

          {createError && <p className="create-error">{createError}</p>}

          {createSuccess && (
            <div className="create-success">
              <p>✅ {createSuccess.length} ვაუჩერი შეიქმნა:</p>
              <div className="created-codes">
                {createSuccess.map((code) => (
                  <div
                    key={code}
                    className="created-code"
                    onClick={() => copyToClipboard(code)}
                    title="დაკოპირება"
                  >
                    <code>{code}</code>
                    <span className="copy-hint">📋</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ─── List vouchers ─────────────────────────────────────────────── */}
      <section className="vouchers-list-section">
        <div className="list-header">
          <h2>
            ვაუჩერების სია <span className="total-badge">{total}</span>
          </h2>
          <div className="list-filters">
            <select
              value={filterCurrency}
              onChange={(e) => {
                setFilterCurrency(e.target.value);
                setPage(1);
              }}
            >
              <option value="">ყველა ვალუტა</option>
              <option value="GEL">GEL</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </select>
            <select
              value={filterUsed}
              onChange={(e) => {
                setFilterUsed(e.target.value);
                setPage(1);
              }}
            >
              <option value="">ყველა სტატუსი</option>
              <option value="false">აქტიური</option>
              <option value="true">გამოყენებული</option>
            </select>
            <button className="btn-refresh" onClick={fetchVouchers}>
              🔄
            </button>
          </div>
        </div>

        {listError && <p className="list-error">{listError}</p>}

        {isLoading ? (
          <div className="list-loading">იტვირთება...</div>
        ) : (
          <>
            <div className="vouchers-table-wrap">
              <table className="vouchers-table">
                <thead>
                  <tr>
                    <th>კოდი</th>
                    <th>თანხა</th>
                    <th>ვალუტა</th>
                    <th>სტატუსი</th>
                    <th>ვადა</th>
                    <th>გამოყენებულია</th>
                    <th>მოქმედება</th>
                  </tr>
                </thead>
                <tbody>
                  {vouchers.map((v) => (
                    <tr
                      key={v._id}
                      className={
                        v.isUsed ? "used" : !v.isActive ? "inactive" : ""
                      }
                    >
                      <td>
                        <code
                          className="voucher-code-cell"
                          onClick={() => copyToClipboard(v.code)}
                          title="დაკოპირება"
                        >
                          {v.code}
                        </code>
                      </td>
                      <td>{v.amount}</td>
                      <td>
                        <span className="currency-tag">{v.currency}</span>
                      </td>
                      <td>
                        {v.isUsed ? (
                          <span className="status-badge used">
                            გამოყენებული
                          </span>
                        ) : !v.isActive ? (
                          <span className="status-badge inactive">
                            გაუქმებული
                          </span>
                        ) : new Date(v.expiresAt) < new Date() ? (
                          <span className="status-badge expired">
                            ვადაგასული
                          </span>
                        ) : (
                          <span className="status-badge active">აქტიური</span>
                        )}
                      </td>
                      <td>
                        {new Date(v.expiresAt).toLocaleDateString("ka-GE")}
                      </td>
                      <td>
                        {v.usedAt ? (
                          <span title={v.usedBy?.email}>
                            {new Date(v.usedAt).toLocaleDateString("ka-GE")}
                            {v.usedBy ? ` — ${v.usedBy.email}` : ""}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td>
                        {!v.isUsed && v.isActive && (
                          <button
                            className="btn-deactivate"
                            onClick={() => handleDeactivate(v._id)}
                          >
                            გაუქმება
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {vouchers.length === 0 && (
                    <tr>
                      <td
                        colSpan={7}
                        style={{ textAlign: "center", padding: "2rem" }}
                      >
                        ვაუჩერი ვერ მოიძებნა
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {total > limit && (
              <div className="pagination">
                <button
                  className="page-btn"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  ←
                </button>
                <span>
                  {page} / {Math.ceil(total / limit)}
                </span>
                <button
                  className="page-btn"
                  disabled={page >= Math.ceil(total / limit)}
                  onClick={() => setPage((p) => p + 1)}
                >
                  →
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
