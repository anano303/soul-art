"use client"; // Next.js-ის ახალი ვერსიისთვის

const GoogleMap = () => {
  return (
    <div style={{ width: "100%", height: "500px" }}>
      <iframe
        src="https://www.google.com/maps/d/u/0/embed?mid=1kNcYuLY_NtRm4zuxxzHsMv_T8PnRBJo&ehbc=2E312F"
        width="500px"
        height="300px"
        style={{ border: "none" }}
        allowFullScreen
        loading="lazy"
      ></iframe>
    </div>
  );
};

export default GoogleMap;
