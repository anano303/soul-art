"use client";

export default function Offline() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(135deg, #012645, #014f86)" }}>
      <div className="max-w-md w-full bg-white rounded-lg shadow-2xl p-8 text-center mx-4">
        <div className="mb-6">
          <div className="mx-auto w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <svg
              className="h-10 w-10 text-blue-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M12 2v6m0 8v6m8-10h-6m-8 0H2"
              />
            </svg>
          </div>
        </div>

        <h1 className="text-2xl font-bold mb-4" style={{ color: "#012645" }}>📱 ოფლაინ რეჟიმი</h1>

        <p className="text-gray-600 mb-6 leading-relaxed">
          🌐 თქვენ ოფლაინ რეჟიმში ხართ. გთხოვთ შეამოწმოთ ინტერნეტ კავშირი და სცადოთ
          ხელახლა.
        </p>

        <div className="space-y-3">
          <button
            onClick={() => window.location.reload()}
            className="w-full text-white px-6 py-3 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105"
            style={{ 
              background: "linear-gradient(135deg, #012645, #014f86)",
              boxShadow: "0 4px 15px rgba(1, 38, 69, 0.3)"
            }}
          >
            🔄 კვლავ ცდა
          </button>

          <button
            onClick={() => window.history.back()}
            className="w-full bg-gray-100 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
          >
            ← უკან დაბრუნება
          </button>
        </div>

        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-700 font-medium">💡 რჩევა:</p>
          <p className="text-sm text-blue-600 mt-1">
            ზოგიერთი გვერდი და ფუნქცია ხელმისაწვდომია ოფლაინ რეჟიმშიც
          </p>
        </div>
      </div>
    </div>
  );
}
