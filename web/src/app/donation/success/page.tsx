"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import "./donation-result.css";

function DonationSuccessContent() {
  const searchParams = useSearchParams();
  const donationId = searchParams.get("id");
  const [donation, setDonation] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (donationId) {
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/donations/${donationId}/status`)
        .then((res) => res.json())
        .then((data) => {
          setDonation(data);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [donationId]);

  return (
    <div className="donation-result-page">
      <div className="donation-result-card success">
        <div className="result-icon">🎉</div>
        <h1>მადლობა!</h1>
        <p className="result-message">
          თქვენი დონაცია წარმატებით განხორციელდა.
        </p>
        {donation && (
          <div className="donation-details">
            <p className="donation-amount">{donation.amount} ₾</p>
            <p className="donor-name">{donation.donorName}</p>
          </div>
        )}
        <p className="gratitude-text">
          თქვენი მხარდაჭერა გვეხმარება ქართული ხელოვნების პოპულარიზაციაში და
          პლატფორმის განვითარებაში. ❤️
        </p>
        <Link href="/" className="return-home-btn">
          მთავარ გვერდზე დაბრუნება
        </Link>
      </div>
    </div>
  );
}

export default function DonationSuccessPage() {
  return (
    <Suspense fallback={
      <div className="donation-result-page">
        <div className="donation-result-card success">
          <div className="result-icon">⏳</div>
          <h1>იტვირთება...</h1>
        </div>
      </div>
    }>
      <DonationSuccessContent />
    </Suspense>
  );
}
