import HuntingPermits from "./hunting-permits";
import "./hunting-permits.css";




const HuntingPermitsPage = () => {

  return (
    <div>
<HuntingPermits/>
<div className="real-exam"> <ul>
  გამოცდაზე გასასვლელად მოქალაქემ უნდა წარადგინოს:

<li>►ცნობა ფსიქიკური მდგომარეობის შესახებ;</li>
<li>► პირადობის დამადასტურებელი დოკუმენტი;</li>
<li>► საფასურის (20 ლარი) გადახდის დამადასტურებელი ქვითარი;</li>

</ul>
მომსახურებით სარგებლობისთვის მიმართეთ სსიპ საქართველოს შინაგან საქმეთა სამინისტროს მომსახურების სააგენტოს. ცხელი ხაზი: +995 (032) 2 41 91 91
   {/* <a href="https://my.sa.gov.ge/auth" target="_blank" rel="noopener noreferrer" className="real-exam-button">
          ნამდვილ გამოცდაზე გადასვლა
        </a> */}
        
        </div>

    </div>
  );
};

export default HuntingPermitsPage;