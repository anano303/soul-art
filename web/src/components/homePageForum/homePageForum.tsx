"use client";
import Link from "next/link";
import "./homePageForum.css";
import { useEffect, useState } from "react";
import axios from "axios";
import ForumPost from "@/app/(pages)/forum/ForumPost";
import Image from "next/image";

const HomePageForum = () => {
  interface Post {
    _id: string;
    image?: string;
    content: string;
    tags: string[];
    user: {
      name: string;
      _id: string;
      role: string;
      profileImage?: string; // Add profileImage property to user
    };
    comments: {
      _id: string;
      content: string;
      user: {
        name: string;
        _id: string;
        profileImage?: string; // Add profileImage property to comment user
      };
      parentId?: string;
      replies?: string[];
    }[];
    createdAt: string;
    likes: number;
    likesArray: string[];
  }

  const [posts, setPosts] = useState<Post[]>([]);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/forums`, {
          params: { page: 1, take: 3 },
        });
        setPosts(response.data);
      } catch (error) {
        console.error("Error fetching posts:", error);
      }
    };

    fetchPosts();
  }, []);

  return (
    <div className="homePageForum">
       <h1 className="homePageForumH1">
          <Image 
            src="/chat-icon.svg" 
            alt="Forum Icon" 
            width={28} 
            height={28}
            className="forum-icon"
          />
           ფორუმი
        </h1>
      
      {posts.map((post) => (
        <ForumPost
          key={post._id}
          id={post._id}
          image={post.image || "/avatar.jpg"}
          text={post.content}
          category={post.tags}
          author={{
            name: post.user.name,
            _id: post.user._id,
            avatar: post.user.profileImage || "/avatar.jpg", // Use profile image if available
            role: post.user.role,
            profileImage: post.user.profileImage, // Pass profile image to ForumPost
          }}
          currentUser={undefined}
          comments={post.comments.map((comment) => ({
            id: comment._id,
            text: comment.content,
            author: {
              name: comment.user.name,
              _id: comment.user._id,
              avatar: comment.user.profileImage || "/avatar.jpg", // Use profile image for comments too
              profileImage: comment.user.profileImage,
            },
            parentId: comment.parentId?.toString(),
            replies: comment.replies?.map((r) => r.toString()),
          }))}
          time={new Date(post.createdAt).toLocaleDateString()}
          likes={post.likes}
          isLiked={false}
          isAuthorized={false}
          canModify={false}
        />
      ))}
      <Link href="/forum" className="forumPageLink">
        დაამატე პოსტი / ნახე სხვა პოსტებიც
      </Link>
    </div>
  );
};

export default HomePageForum;
