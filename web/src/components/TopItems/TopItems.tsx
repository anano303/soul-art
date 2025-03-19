"use client";

import React, { useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import styles from "./TopItems.module.css";
import noPhoto from "../../assets/nophoto.webp";
import fisher from "./world-art-day.gif";
import needle from "../../assets/fish-hook-circle-hook-fishing-bait-hooks-cbc2947b1d4849fa29ae5d039fbc8297.png";
import { useQuery } from "@tanstack/react-query";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { Product } from "@/types";
import LoadingAnim from "../loadingAnim/loadingAnim";

const TopItems: React.FC = () => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: topProducts, isLoading } = useQuery({
    queryKey: ["topProducts"],
    queryFn: async () => {
      const searchParams = new URLSearchParams({
        page: "1",
        limit: "20",
        sort: "-rating",
      });
      const response = await fetchWithAuth(
        `/products?${searchParams.toString()}`
      );
      const data = await response.json();
      return data.items.slice(0, 7);
    },
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.innerHTML += scrollRef.current.innerHTML;
    }
  }, [topProducts]);

  if (isLoading) {
    return (
      <div className={styles.container}>
        {" "}
        <LoadingAnim />{" "}
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Image src={fisher} alt="Fisher Icon" className={styles.fisher} />
      <div className={styles.scroller} ref={scrollRef}>
        <div className={styles.inner}>
          {topProducts?.map((product: Product) => (
            <Link
              href={`/products/${product._id}`}
              key={product._id}
              className={styles.itemLink}
            >
              <div className={styles.itemCard}>
                <div className={styles.hookWrapper}>
                  <Image src={needle} alt="Hook" className={styles.hook} />
                </div>
                <div className={styles.imageWrapper}>
                  <Image
                    src={product.images[0] || noPhoto}
                    alt={product.name}
                    fill
                    className={styles.productImage}
                    style={{ objectFit: "cover" }}
                  />
                </div>
                <div className={styles.productNameWrapper}>
                  <p className={styles.productName}>{product.name}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TopItems;
