// import Navbar from "@/components/navbar/navbar";
import MainPhoto from "../mainPhoto/mainPhoto";
import "./homePagesHead.css";
// import DiscountCard from "../discountCard/discountCard";
// import campImage from '../../assets/camp.webp'
// import rifleImage from '../../assets/rifle.jpg'

const HomePagesHead = () => {
  return (
    <div className="HomePageshead">
      <div>
        <MainPhoto />
      </div>
     
      <div>
        {/* <DiscountCard
        title="Special Offer"
        description="Get 50% Off on Camping Gear"
        imageSrc={campImage} 
        altText="Camping Tent"
      /> */}
        {/* <DiscountCard
        title="Special Offer"
        description="Get 50% Off on Camping Gear"
        imageSrc={rifleImage} 
        altText="Camping Tent"
      /> */}
      </div>
    </div>
  );
};

export default HomePagesHead;
