"use client";

export default function Offline() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="mb-6">
          <svg
            className="mx-auto h-16 w-16 text-gray-400"
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

        <h1 className="text-2xl font-bold text-gray-900 mb-4">ოფლაინ რეჟიმი</h1>

        <p className="text-gray-600 mb-6">
          თქვენ ოფლაინ რეჟიმში ხართ. გთხოვთ შეამოწმოთ ინტერნეტ კავშირი და სცადოთ
          ხელახლა.
        </p>

        <div className="space-y-3">
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            კვლავ ცდა
          </button>

          <button
            onClick={() => window.history.back()}
            className="w-full bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300 transition-colors"
          >
            უკან დაბრუნება
          </button>
        </div>

        <div className="mt-6 text-sm text-gray-500">
          <p>ზოგიერთი ფუნქცია შეიძლება მუშაობდეს ოფლაინ რეჟიმშიც</p>
        </div>
      </div>
    </div>
  );
}
