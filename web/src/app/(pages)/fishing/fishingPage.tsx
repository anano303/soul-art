import "./fishingPage.css";
import GoogleMap from "./GoogleMap";
import NearestBeachButton from "./NearestBeachButton";

const FishingPage = () => {
  return (
    <div>
      <a
        href="https://www.google.com/maps/d/u/0/edit?mid=1kNcYuLY_NtRm4zuxxzHsMv_T8PnRBJo&usp=sharing"
        target="_blank"
        rel="noopener noreferrer"
      >
        ნახე რუკაზე
      </a>
      <br />
      <br />
      <br />
      <br />
      <NearestBeachButton />
      <br />
      <br />
      <br />
      <br />
      <GoogleMap />
    </div>
  );
};

export default FishingPage;
