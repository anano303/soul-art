// Instant skeleton shown by the App Router the moment a category / subcategory
// route is navigated to (loading.tsx), while the server fetches the products.
// Without it the previous page stays frozen until the RSC arrives, which makes
// clicks feel unresponsive. Self-contained styles so it never depends on other
// CSS being loaded.
export default function CategoryLoading() {
  const cards = Array.from({ length: 8 });
  const box = { background: "#e6e8eb", borderRadius: 4 } as const;
  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", padding: "20px 24px" }}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 24,
          justifyContent: "space-around",
        }}
      >
        {cards.map((_, i) => (
          <div
            key={i}
            style={{
              minWidth: 320,
              maxWidth: 360,
              flex: "1 1 320px",
              borderRadius: "55px 5px 55px 5px",
              overflow: "hidden",
              boxShadow: "2px 9px 10px rgba(0,0,0,0.1)",
              background: "#fff",
            }}
          >
            <div
              className="cat-skel-pulse"
              style={{ ...box, height: 200, borderRadius: 0 }}
            />
            <div
              style={{
                padding: 16,
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <div
                className="cat-skel-pulse"
                style={{ ...box, height: 18, width: "70%" }}
              />
              <div
                className="cat-skel-pulse"
                style={{ ...box, height: 14, width: "40%" }}
              />
              <div
                className="cat-skel-pulse"
                style={{ ...box, height: 20, width: "30%" }}
              />
            </div>
          </div>
        ))}
      </div>
      <style>{`@keyframes catskel{0%,100%{opacity:1}50%{opacity:.5}}.cat-skel-pulse{animation:catskel 1.3s ease-in-out infinite}`}</style>
    </div>
  );
}
