import ForumPage from "@/app/(pages)/forum/ForumPage";
import Link from "next/link";
import "./homePageForum.css";
const HomePageForum = () => {
  return (
    <div className="homePageForum">
      <h1 className="homePageForumH1">Forum</h1>

      <ForumPage />
      <Link href="/forum" className="forumPageLink">
        {" "}
        See More{" "}
      </Link>
    </div>
  );
};

export default HomePageForum;
