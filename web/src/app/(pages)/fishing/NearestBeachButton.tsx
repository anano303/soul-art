"use client";

const NearestBeachButton = () => {
  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        const userLat = position.coords.latitude;
        const userLng = position.coords.longitude;
        const destination = encodeURIComponent("მტკვრის სანაპირო");

        const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${userLat},${userLng}&destination=${destination}&travelmode=walking`;

        window.open(googleMapsUrl, "_blank");
      });
    } else {
      alert("გეოლოკაცია არ არის მხარდაჭერილი ამ ბრაუზერში");
    }
  };

  return <button onClick={getUserLocation}>🚶 წასვლა უახლოეს სანაპიროზე</button>;
};

export default NearestBeachButton;
