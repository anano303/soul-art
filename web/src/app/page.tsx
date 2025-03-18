import HomePageForum from "@/components/homePageForum/homePageForum";
import HomePagesHead from "@/components/homePagesHead/homePagesHead";
import HomePageShop from "@/components/homePageShop/homePageShop";
import TopItems from "@/components/TopItems/TopItems";
const Home = () => {
  

  return (
    <div>
      <HomePagesHead/>
      <TopItems/>
      <HomePageShop/>
      <HomePageForum/>
    </div>
  );
};

export default Home;