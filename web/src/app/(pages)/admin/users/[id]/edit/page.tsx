"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "@/hooks/use-toast";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { Role } from "@/types/role";
import { User } from "@/types";
import { SOCIAL_FIELDS } from "@/modules/profile/components/seller-public-settings";
import "./edit-user.css";

export default function EditUserPage() {
  const params = useParams();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState("");
  const [showPasswordField, setShowPasswordField] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const userId = params?.id ? (params.id as string) : "";
        const response = await fetchWithAuth(`/users/${userId}`);
        const data = await response.json();
        setUser(data);
      } catch (error) {
        console.log(error);
        toast({
          title: "Error",
          description: "Failed to fetch user",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [params]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) return;

    try {
      const updateData: Record<string, unknown> = {
        name: user.name,
        email: user.email,
        role: user.role,
        phoneNumber: user.phoneNumber,
        ...(password && { password }),
      };

      // სელერის ველები
      if (user.role === Role.Seller) {
        updateData.storeName = user.storeName;
        updateData.ownerFirstName = user.ownerFirstName;
        updateData.ownerLastName = user.ownerLastName;
        updateData.phoneNumber = user.phoneNumber;
        updateData.identificationNumber = user.identificationNumber;
        updateData.accountNumber = user.accountNumber;
        // ყველა სოც. ბმული (artistSocials-ში ინახება, სერვერზე ერწყმის ძველს)
        const socials = (user as { artistSocials?: Record<string, string> })
          .artistSocials;
        updateData.artistSocials = Object.fromEntries(
          SOCIAL_FIELDS.map(({ key }) => [key, socials?.[key] || ""])
        );
        updateData.sellerType =
          (user as { sellerType?: string }).sellerType || "artist";
        updateData.artistOpenForCommissions = !!(
          user as { artistOpenForCommissions?: boolean }
        ).artistOpenForCommissions;
      }

      // Sales Manager-ის საბანკო ველები და საკომისიო
      if (user.role === Role.SalesManager) {
        updateData.phoneNumber = user.phoneNumber;
        updateData.identificationNumber = user.identificationNumber;
        updateData.accountNumber = user.accountNumber;
        updateData.salesCommissionRate = user.salesCommissionRate;
      }

      const userId = params?.id as string;
      await fetchWithAuth(`/users/${userId}`, {
        method: "PUT",
        body: JSON.stringify(updateData),
      });

      toast({
        title: "Success",
        description: "User updated successfully",
      });

      router.push("/admin/users");
    } catch (error) {
      console.log(error);
      toast({
        title: "Error",
        description: "Failed to update user",
        variant: "destructive",
      });
    }
  };

  if (loading) return <div className="edit-user-loading">იტვირთება...</div>;
  if (!user)
    return <div className="edit-user-not-found">მომხმარებელი ვერ მოიძებნა</div>;

  const isSeller = user.role === Role.Seller;
  const isSalesManager = user.role === Role.SalesManager;

  return (
    <div className="edit-user-container">
      <button
        type="button"
        className="back-button"
        onClick={() => router.back()}
      >
        ← უკან დაბრუნება
      </button>
      <h1>მომხმარებლის რედაქტირება</h1>
      <form onSubmit={handleSubmit} className="edit-user-form">
        {/* ძირითადი ინფორმაცია */}
        <div className="form-section">
          <h2 className="section-title">ძირითადი ინფორმაცია</h2>

          <div className="form-group">
            <label>სახელი</label>
            <input
              type="text"
              value={user.name}
              onChange={(e) => setUser({ ...user, name: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>ელ. ფოსტა</label>
            <input
              type="email"
              value={user.email}
              onChange={(e) => setUser({ ...user, email: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>საკონტაქტო ტელეფონი</label>
            <input
              type="tel"
              value={user.phoneNumber || ""}
              placeholder="+995 5XX XXX XXX"
              onChange={(e) =>
                setUser({ ...user, phoneNumber: e.target.value })
              }
            />
          </div>

          <div className="form-group">
            <label>როლი</label>
            <select
              value={user.role}
              onChange={(e) =>
                setUser({ ...user, role: e.target.value as Role })
              }
            >
              <option value={Role.User}>მომხმარებელი</option>
              <option value={Role.Admin}>ადმინისტრატორი</option>
              <option value={Role.Seller}>გამყიდველი</option>
              <option value={Role.Blogger}>ბლოგერი</option>
              <option value={Role.SalesManager}>Sales Manager</option>
              <option value={Role.AuctionAdmin}>აუქციონის ადმინი</option>
            </select>
          </div>
        </div>

        {/* სელერის ინფორმაცია */}
        {isSeller && (
          <div className="form-section seller-section">
            <h2 className="section-title">გამყიდველის ინფორმაცია</h2>

            <div className="form-row">
              <div className="form-group">
                <label>მაღაზიის სახელი</label>
                <input
                  type="text"
                  value={user.storeName || ""}
                  onChange={(e) =>
                    setUser({ ...user, storeName: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>მფლობელის სახელი</label>
                <input
                  type="text"
                  value={user.ownerFirstName || ""}
                  onChange={(e) =>
                    setUser({ ...user, ownerFirstName: e.target.value })
                  }
                />
              </div>
              <div className="form-group">
                <label>მფლობელის გვარი</label>
                <input
                  type="text"
                  value={user.ownerLastName || ""}
                  onChange={(e) =>
                    setUser({ ...user, ownerLastName: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>ტელეფონის ნომერი</label>
                <input
                  type="tel"
                  value={user.phoneNumber || ""}
                  onChange={(e) =>
                    setUser({ ...user, phoneNumber: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>პირადი ნომერი</label>
                <input
                  type="text"
                  value={user.identificationNumber || ""}
                  onChange={(e) =>
                    setUser({ ...user, identificationNumber: e.target.value })
                  }
                />
              </div>
              <div className="form-group">
                <label>ანგარიშის ნომერი (IBAN)</label>
                <input
                  type="text"
                  value={user.accountNumber || ""}
                  onChange={(e) =>
                    setUser({ ...user, accountNumber: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>რას ქმნის</label>
                <select
                  value={(user as { sellerType?: string }).sellerType || "artist"}
                  onChange={(e) =>
                    setUser({ ...user, sellerType: e.target.value } as typeof user)
                  }
                >
                  <option value="artist">მხატვარი (ნახატები)</option>
                  <option value="handmade">ხელნაკეთი ნივთები</option>
                  <option value="both">ორივე</option>
                </select>
              </div>
              <div className="form-group">
                <label>ინდივიდუალური შეკვეთები</label>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    style={{ width: "auto" }}
                    checked={
                      !!(user as { artistOpenForCommissions?: boolean })
                        .artistOpenForCommissions
                    }
                    onChange={(e) =>
                      setUser({
                        ...user,
                        artistOpenForCommissions: e.target.checked,
                      } as typeof user)
                    }
                  />
                  <span>🎨 იღებს ინდ. შეკვეთებს</span>
                </label>
              </div>
            </div>

            {/* Every network, not just Facebook — sellers register with
                whatever they have (Instagram, TikTok, …). */}
            {SOCIAL_FIELDS.map(({ key, label, placeholder }) => {
              const current =
                (user as { artistSocials?: Record<string, string> })
                  .artistSocials?.[key] || "";
              return (
                <div className="form-row" key={key}>
                  <div className="form-group">
                    <label>{label}</label>
                    <input
                      type="text"
                      value={current}
                      placeholder={placeholder}
                      onChange={(e) =>
                        setUser({
                          ...user,
                          artistSocials: {
                            ...((
                              user as {
                                artistSocials?: Record<string, string>;
                              }
                            ).artistSocials || {}),
                            [key]: e.target.value,
                          },
                        } as typeof user)
                      }
                    />
                    {current && (
                      <a
                        href={
                          current.startsWith("http")
                            ? current
                            : `https://${current}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="seller-page-link"
                      >
                        <span className="link-icon">🔗</span> გახსნა
                        <span className="external-icon">↗</span>
                      </a>
                    )}
                  </div>
                </div>
              );
            })}

            {user.storeLogo && (
              <div className="form-group">
                <label>მაღაზიის ლოგო</label>
                <div className="store-logo-preview">
                  <img src={user.storeLogo} alt="Store Logo" />
                </div>
              </div>
            )}

            {user.artistSlug && (
              <div className="form-group">
                <label>გამყიდველის გვერდი</label>
                <a
                  href={`/${user.artistSlug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="seller-page-link"
                >
                  <span className="link-icon">🔗</span>
                  soulart.ge/{user.artistSlug}
                  <span className="external-icon">↗</span>
                </a>
              </div>
            )}
          </div>
        )}

        {/* Sales Manager-ის საბანკო რეკვიზიტები */}
        {isSalesManager && (
          <div className="form-section seller-section">
            <h2 className="section-title">Sales Manager პარამეტრები</h2>

            <div className="form-row">
              <div className="form-group">
                <label>საკომისიო პროცენტი (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={user.salesCommissionRate ?? 3}
                  onChange={(e) =>
                    setUser({
                      ...user,
                      salesCommissionRate: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="commission-rate-input"
                />
                <span className="input-hint">მინიმუმ 0%, მაქსიმუმ 100%</span>
              </div>
            </div>

            <h2 className="section-title">საბანკო რეკვიზიტები</h2>

            <div className="form-row">
              <div className="form-group">
                <label>ტელეფონის ნომერი</label>
                <input
                  type="tel"
                  value={user.phoneNumber || ""}
                  onChange={(e) =>
                    setUser({ ...user, phoneNumber: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>პირადი ნომერი</label>
                <input
                  type="text"
                  value={user.identificationNumber || ""}
                  onChange={(e) =>
                    setUser({ ...user, identificationNumber: e.target.value })
                  }
                />
              </div>
              <div className="form-group">
                <label>ანგარიშის ნომერი (IBAN)</label>
                <input
                  type="text"
                  value={user.accountNumber || ""}
                  placeholder="GE..."
                  onChange={(e) =>
                    setUser({ ...user, accountNumber: e.target.value })
                  }
                />
              </div>
            </div>
          </div>
        )}

        {/* პაროლის შეცვლა */}
        <div className="form-section">
          <h2 className="section-title">პაროლი</h2>

          {!showPasswordField ? (
            <div className="form-action">
              <button
                type="button"
                onClick={() => setShowPasswordField(true)}
                className="password-button"
              >
                პაროლის შეცვლა
              </button>
            </div>
          ) : (
            <div className="form-group">
              <label>ახალი პაროლი</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="შეიყვანეთ ახალი პაროლი"
              />
              <button
                type="button"
                onClick={() => {
                  setShowPasswordField(false);
                  setPassword("");
                }}
                className="cancel-password-button"
              >
                გაუქმება
              </button>
            </div>
          )}
        </div>

        <div className="form-actions">
          <button type="submit" className="save-button">
            შენახვა
          </button>
          <button
            type="button"
            onClick={() => router.push("/admin/users")}
            className="cancel-button"
          >
            გაუქმება
          </button>
        </div>
      </form>
    </div>
  );
}
