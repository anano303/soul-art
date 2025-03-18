"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Image from "next/image";
import "./SearchBox.css";
import searchIcon from "../../assets/icons/search.png"

export default function SearchBox() {
  const router = useRouter();
  const [keyword, setKeyword] = useState("");

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (keyword.trim()) {
      router.push(`/search/${keyword.trim()}`);
    }
  };

  return (
    <form onSubmit={onSubmit} className="search-form">
      <Image src={searchIcon} alt="search icon" className="searchIcon" />
      <input
        type="text"
        placeholder="ძიება FishHunt-ზე"
        value={keyword}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          setKeyword(e.target.value)
        }
        className="search-input"
      />
      {/* <button type="submit" className="search-button">
        <Image src={searchIcon} alt="search icon" className="searchIcon" />
      </button> */}
    </form>
  );
}
