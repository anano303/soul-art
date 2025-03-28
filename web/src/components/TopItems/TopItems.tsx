"use client";

import React, { useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import styles from "./TopItems.module.css";
import noPhoto from "../../assets/nophoto.webp";
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

    // Apply margin-top to every second .easel element
    const easels = document.querySelectorAll(`.${styles.easel}`);
    easels.forEach((easel, index) => {
      if ((index + 1) % 2 === 0) {
        (easel as HTMLElement).style.marginTop = "20%";
      }
    });
  }, [topProducts]);

  if (isLoading) {
    return (
      <div className={styles.container}>
        <LoadingAnim />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.scroller} ref={scrollRef}>
        <div className={styles.inner}>
          {topProducts?.map((product: Product) => (
            <Link
              href={`/products/${product._id}`}
              key={product._id}
              className={styles.itemLink}
            >
              <div className={styles.easel}>
                <div className={`${styles.easelLeg} ${styles.easelLeftLeg}`}></div>
                <div className={`${styles.easelLeg} ${styles.easelRightLeg}`}></div>
                <div className={`${styles.easelLeg} ${styles.easelBackLeg}`}></div>
                <div className={styles.board}>
                  <Image
                    src={product.images[0] || noPhoto}
                    alt={product.name}
                    fill
                    className={styles.productImage}
                    style={{ objectFit: "cover", width: "100%" }}
                  />
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
