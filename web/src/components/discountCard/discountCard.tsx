import "./discountCard.css";
import Image, { StaticImageData } from "next/image";

interface DiscountCardProps {
  title: string;
  description: string;
  imageSrc: StaticImageData; // აქ ვუთითებთ StaticImageData, რომ გამოსწორდეს ტიპი
  altText: string;
}

const DiscountCard: React.FC<DiscountCardProps> = ({
  title,
  description,
  imageSrc,
  altText,
}) => {
  return (
    <div className="discountCard">
    <div className="circle-container">
      <div className="circle">
        <div className="line top-line"></div>
        <div className="line right-line"></div>
        <div className="line bottom-line"></div>
        <div className="line left-line"></div>
        <div className="circle-text">
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
      </div>
      <div className="overlay-circle">
        <Image src={imageSrc} alt={altText} className="circle-image" />
      </div>
    </div>
    </div>
  );
};

export default DiscountCard;
