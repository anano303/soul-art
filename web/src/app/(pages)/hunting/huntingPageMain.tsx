import Image from "next/image";
import Link from "next/link";
import "./huntingPageMain.css";
import mapImage from "../../../assets/map.png";
import AnserAnser from "../../../assets/birds/AnserAnser.jpg";
import MarecaStrepera from "../../../assets/birds/MarecaStrepera.png";
import AnasCrecca from "../../../assets/birds/Anas crecca.png";
import AnasPlatyrhynchos from "../../../assets/birds/AnasPlatyrhynchos.jpg";
import AnasQuerquedula from "../../../assets/birds/Anas querquedula.jpg";
import AnasClypeata from "../../../assets/birds/Anas clypeata.jpeg";
import FulicaAtra from "../../../assets/birds/Fulica atra.png";
import AnasAcuta from "../../../assets/birds/Anas acuta.png";
import MarecaPenelope from "../../../assets/birds/Mareca Penelope.jpg";
import AnserAlbifrons from "../../../assets/birds/Anser albifrons.jpg";
import AythyaFuligula from "../../../assets/birds/Aythya fuligula.jpeg";
import ScolopaxRusticola from "../../../assets/birds/Scolopax rusticola.jpeg";
import GallinagoGallinago from "../../../assets/birds/Gallinago gallinago.png";
import Coturnix from "../../../assets/birds/Coturnix coturnix.png";
import ColumbaPalumbus from "../../../assets/birds/Columba palumbus.jpeg";
import ColumbaLivia from "../../../assets/birds/Columba livia.png";
import ColumbaOenas from "../../../assets/birds/Columba oenas.jpeg";
import StreptopeliaDecaocto from "../../../assets/birds/Streptopelia decaocto.png";
import Crex from "../../../assets/birds/Crex crex.png";
import LymnocryptesMinimus from "../../../assets/birds/Lymnocryptes minimus.jpeg";

const category1 = [
  { name: "Anser anser", geo: "რუხი ბატი (Anser anser)", limit: 5, image: AnserAnser },
  { name: "Mareca strepera", geo: "რუხი იხვი (Mareca strepera (Anas strepera))", limit: 3, image: MarecaStrepera },
  { name: "Anas crecca", geo: "ჭიკვარა (სტვენია იხვი) (Anas crecca)", limit: 5, image: AnasCrecca },
  { name: "Anas platyrhynchos", geo: "გარეული იხვი (Anas platyrhynchos)", limit: 6, image: AnasPlatyrhynchos },
  { name: "Anas querquedula", geo: "იხვინჯა (ჭახჭახა იხვი) (Spatula clypeata (Anas querquedula))", limit: 3, image: AnasQuerquedula },
  { name: "Anas clypeata", geo: "ფართოცხვირა (განიერნისკარტა) იხვი (Spatula clypeata (Anas clypeata))", limit: 3, image: AnasClypeata },
  { name: "Fulica atra", geo: "მელოტა (Fulica atra)", limit: 6, image: FulicaAtra },
  { name: "Anas acuta", geo: "კუდსადგისა (ბოლოსადგისა) იხვი (Anas acuta)", limit: 3, image: AnasAcuta },
  { name: "Mareca Penelope", geo: "თეთრშუბლა იხვი (Mareca Penelope (Anas penelope))", limit: 6, image: MarecaPenelope },
  { name: "Anser albifrons", geo: "დიდი თეთრშუბლა ბატი (Anser albifrons)", limit: 5, image: AnserAlbifrons},
  { name: "Aythya fuligula", geo: "ქოჩორა ყვინთია (Aythya fuligula)", limit: 5, image: AythyaFuligula }
];

const category2 = [
  { name: "Anser anser", geo: "რუხი ბატი (Anser anser)", limit: 3, image: AnserAnser },
  { name: "Mareca strepera", geo: "რუხი იხვი (Mareca strepera (Anas strepera))", limit: 2, image: MarecaStrepera },
  { name: "Anas crecca", geo: "ჭიკვარა (სტვენია იხვი) (Anas crecca)", limit: 3, image: AnasCrecca },
  { name: "Anas platyrhynchos", geo: "გარეული იხვი (Anas platyrhynchos)", limit: 5, image: AnasPlatyrhynchos },
  { name: "Anas querquedula", geo: "იხვინჯა (ჭახჭახა იხვი) (Spatula clypeata (Anas querquedula))", limit: 2, image: AnasQuerquedula },
  { name: "Anas clypeata", geo: "ფართოცხვირა (განიერნისკარტა) იხვი (Spatula clypeata (Anas clypeata))", limit: 2, image: AnasClypeata },
  { name: "Fulica atra", geo: "მელოტა (Fulica atra)", limit: 5, image: FulicaAtra },
  { name: "Anas acuta", geo: "კუდსადგისა (ბოლოსადგისა) იხვი (Anas acuta)", limit: 2, image: AnasAcuta },
  { name: "Mareca Penelope", geo: "თეთრშუბლა იხვი (Mareca Penelope (Anas penelope))", limit: 3, image: MarecaPenelope },
  { name: "Anser albifrons", geo: "დიდი თეთრშუბლა ბატი (Anser albifrons)", limit: 3, image: AnserAlbifrons },
  { name: "Aythya fuligula", geo: "ქოჩორა ყვინთია (Aythya fuligula)", limit: 3, image: AythyaFuligula }
];

const category3 = [
  { name: "Scolopax rusticola", geo: "ტყის ქათამი (Scolopax rusticola)", limit: 5, image: ScolopaxRusticola },
  { name: "Gallinago gallinago", geo: "ჩიბუხა (Gallinago)", limit: 5, image: GallinagoGallinago },
  { name: "Coturnix coturnix", geo: "მწყერი (Coturnix)", limit: 20, image: Coturnix },
  { name: "Columba palumbus", geo: "ქედანი (Columba palumbus)", limit: 10, image: ColumbaPalumbus },
  { name: "Columba livia", geo: "გარეული მტრედი (Columba livia)", limit: 10, image: ColumbaLivia },
  { name: "Columba oenas", geo: "გულიო (გვიძინი) (Columba oenas)", limit: 10, image: ColumbaOenas },
  { name: "Streptopelia decaocto", geo: "საყელოიანი გვრიტი (Streptopelia decaocto)", limit: 5, image: StreptopeliaDecaocto },
  { name: "Crex crex", geo: "ღალღა (Crex)", limit: 5, image: Crex },
  { name: "Lymnocryptes minimus", geo: "ჩიბუხელა (გარშნეპი) (Lymnocryptes minimus)", limit: 5, image: LymnocryptesMinimus }
];



const getSeasonStatus = (startDate: Date, endDate: Date): string => {
  const now = new Date();
  if (now >= startDate && now <= endDate) {
    const remainingDays = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return `ნადირობის სეზონი გახსნილია - დარჩენილია ${remainingDays} დღე`;
  } else if (now < startDate) {
    const daysUntilOpen = Math.ceil((startDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return `ნადირობის სეზონი დახურულია - გაიხსნება ${daysUntilOpen} დღეში`;
  } else {
    return "ნადირობის სეზონი დახურულია";
  }
};

const getFourthSaturdayOfAugust = (year: number) => {
  const date = new Date(year, 7, 22);
  while (date.getDay() !== 6) {
    date.setDate(date.getDate() + 1);
  }
  return date;
};

const HuntingPageMain = () => {
  const currentYear = new Date().getFullYear();
  const seasonStartWaterfowl = new Date(currentYear, 10, 1);
  const seasonEndWaterfowl = new Date(currentYear + 1, 2, 1);
  const seasonStartOthers = getFourthSaturdayOfAugust(currentYear);
  const seasonEndOthers = new Date(currentYear + 1, 1, 15);
  const seasonStartLimitedWaterfowl = new Date(currentYear, 8, 10);
  const seasonEndLimitedWaterfowl = new Date(currentYear, 11, 31);

  const statusWaterfowl = getSeasonStatus(seasonStartWaterfowl, seasonEndWaterfowl);
  const statusOthers = getSeasonStatus(seasonStartOthers, seasonEndOthers);
  const statusLimitedWaterfowl = getSeasonStatus(seasonStartLimitedWaterfowl, seasonEndLimitedWaterfowl);
  
  const seasonDates = [
    { start: seasonStartWaterfowl, end: seasonEndWaterfowl },
    { start: seasonStartOthers, end: seasonEndOthers },
    { start: seasonStartLimitedWaterfowl, end: seasonEndLimitedWaterfowl },
  ];

  const now = new Date();
  const openSeasons = seasonDates.filter(({ start, end }) => now >= start && now <= end);
  const upcomingSeasons = seasonDates.filter(({ start }) => now < start);

  let mainStatus = "ნადირობის სეზონი დახურულია";
  if (openSeasons.length > 0) {
    const closingDates = openSeasons.map(({ end }) => end);
    const earliestClosing = new Date(Math.min(...closingDates.map(date => date.getTime())));
    const daysUntilClose = Math.ceil((earliestClosing.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    mainStatus = `ნადირობის სეზონი გახსნილია - დაიხურება ${daysUntilClose} დღეში`;
  } else if (upcomingSeasons.length > 0) {
    const openingDates = upcomingSeasons.map(({ start }) => start);
    const earliestOpening = new Date(Math.min(...openingDates.map(date => date.getTime())));
    const daysUntilOpen = Math.ceil((earliestOpening.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    mainStatus = `ნადირობის სეზონი დახურულია - გაიხსნება ${daysUntilOpen} დღეში`;
  }

  return (
    <div className="hunting-main-container">
      {/* <h1 className="hunting-main-title1">ნადირობა</h1> */}
      <h1 className="hunting-main-title">{mainStatus}</h1>
      
      <h3 className="hunting-main-list-title">ნადირობისათვის დაშვებული ფრინველები:</h3>

      <h4 className="hunting-main-list-category">წყალმცურავი ფრინველები </h4>
      <p className="hunting-main-list-category-p"> (საქართველოს ტერიტორიაზე, გარდა ახალქალაქის, ნინოწმინდის, წალკის და დმანისის მუნიციპალიტეტების ტერიტორიებისა) </p>
      <h3 className="status">{statusWaterfowl}</h3>
      <p className="status"> (01.11 – 01.03) </p>
      <ul className="hunting-main-list">
        {category1.map((bird, index) => (
          <li key={index} className="bird-item">
            <Image src={bird.image} alt={bird.geo} width={100} height={100} />
            {bird.geo} (დღიური ლიმიტი: {bird.limit} ცალი)
          </li>
        ))}
      </ul>

      <h4 className="hunting-main-list-category">წყალმცურავი ფრინველები - სპეციალური ზონები </h4>
      <p className="hunting-main-list-category-p">(მხოლოდ ახალქალაქის, ნინოწმინდის, წალკის და დმანისის მუნიციპალიტეტების  ტერიტორიებზე)</p>
      <h3 className="status">{statusLimitedWaterfowl}</h3>
        <p className="status" >(10.09 – 31.12)</p>
      <ul className="hunting-main-list">

        {category2.map((bird, index) => (
          <li key={index} className="bird-item">
            <Image src={bird.image} alt={bird.geo} width={100} height={100} />
            {bird.geo} (დღიური ლიმიტი: {bird.limit} ცალი)
          </li>
        ))}
      </ul>

      <h4 className="hunting-main-list-category">სხვა ფრინველები</h4>
      <h3 className="status">{statusOthers}</h3>
      <p className="status"> (აგვისტოს მეოთხე შაბათიდან – 15 თებერვლამდე)</p>
      <ul className="hunting-main-list">
        {category3.map((bird, index) => (
          <li key={index} className="bird-item">
            <Image src={bird.image} alt={bird.geo} width={100} height={100} />
            {bird.geo} (დღიური ლიმიტი: {bird.limit} ცალი)
          </li>
        ))}
      </ul>

      <div className="hunting-main-map">
        <h5 className="hunting-main-map-title">იპოვე რუკაზე სანადირო ლოკაციები საქართველოში</h5>
        <Image src={mapImage} alt="Hunting Map" className="hunting-main-map-image" width={600} height={400} />
      </div>

      <Link href="/hunting-permits" className="hunting-main-permit-link">
        იარაღის ნებართვა და საგამოცდო ბილეთები
      </Link>


      <div>
      ნადირობა აკრძალულია:

 

• საქართველოს კანონმდებლობით დადგენილ ადგილებში, მათ შორის: საქართველოს ქალაქების ადმინისტრაციულ საზღვრებში, სახელმწიფო ნაკრძალებში, ეროვნულ პარკებში, ნუგზარ ზაზანაშვილის სახელობის სამუხის მრავალმხრივი გამოყენების ტერიტორიაზე, ასევე სახელმწიფო ნაკრძალების გარშემო 500-მეტრიან და ეროვნული პარკების გარშემო 250-მეტრიან ზონებში; სამინისტროს სსიპ ველური ბუნების ეროვნული სააგენტოს მართვაში/სარგებლობაში არსებული საშენი მეურნეობების ფართობებზე.

 

• ყველა სხვა იარაღით, რომელიც მითითებული არ არის „იარაღის შესახებ” საქართველოს კანონის მე-7 მუხლში, კერძოდ: სანადირო გლუვლულიანი ცეცხლსასროლი იარაღი (თოფი), სანადირო ხრახნილლულიანი ცეცხლსასროლი იარაღი (კარაბინი ან შაშხანა), სანადირო კომბინირებული ცეცხლსასროლი იარაღი (ხრახნილლულიანი და გლუვლულიანი თოფი), სანადირო ცივი და ცივი სასროლი იარაღი; სანადირო პნევმატური იარაღი.

 

ნადირობა შესაძლებელია გარემოდან გადამფრენი ფრინველების ამოღებაზე დაწესებული მოსაკრებლის (10 ლარი) გადახდის დამადასტურებელი ქვითრის გაცემის წლის აგვისტოს მეოთხე შაბათიდან მომდევნო წლის პირველ მარტამდე.

 

მოსაკრებლის გადახდა შესაძლებელია საქართველოს ნებისმიერ ბანკში, მიმღების ბანკი: სახელმწიფო ხაზინა, ბანკის კოდი: 220 101 222, ანგარიშის ნომერი: №200122900, ბიუჯეტის შემოსულობების სახის განმსაზღვრელი სახაზინო კოდი: 3033.


განმარტება მოსაკრებლის გადახდისათვის: ბიუჯეტის შემოსულობების სახის განმსაზღვრელი სახაზინო კოდი 3033 წარმოადგენს 9 ნიშნიანი კოდის ბოლო ოთხ ციფრს, რომელიც უცვლელია (ერთი და იგივეა ყველა თვითმმართველი ერთეულისათვის _  ქალაქი, რაიონი). 9 ნიშნიანი კოდის პირველი ციფრი არის 3, რომელიც ასევე უცვლელია და ნიშნავს ამკრეფის კოდს, ამ შემთხვევაში არასაგადასახადო შემოსულობებს. ხოლო, შუა 4 ციფრი სხვადასხვაა იმ თვითმმართველი ერთეულის შესაბამისად (ქალაქი, მუნიციპალიტეტი),  სადაც წარმოებს თანხის გადახდა. ზოგადად კოდი ასე გამოიყურება: 3 XXXX 3033. მაგალითად: თბილისისათვის ბიუჯეტის შემოსულობების სახის განმსაზღვრელი სახაზინო კოდია: 3 0077 3033; ახმეტისათვის 3 0054 3033; რუსთავისათვის 3 0006 3033; ქუთაისისთვის 3 0018 3033, ლენტეხისათვის 3 0031 3033 და ა.შ.
      </div>



    </div>
  );
};

export default HuntingPageMain;
