"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { apiClient } from "@/lib/axios";
import { toast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/LanguageContext";
import type { ArtistVideo } from "@/types";
import "./artist-videos-panel.css";

export const MAX_ARTIST_VIDEOS = 5;
const MAX_SIZE_MB = 100;

interface ArtistVideosPanelProps {
  videos: ArtistVideo[];
  /** Owner sees the upload button and per-video delete. */
  isOwner?: boolean;
  onVideosChange?: (videos: ArtistVideo[]) => void;
}

/**
 * The artist's "about me" clips. They live on YouTube (uploaded server-side)
 * and are shown here as embeds — both on the public page and in the editor.
 */
export function ArtistVideosPanel({
  videos,
  isOwner = false,
  onVideosChange,
}: ArtistVideosPanelProps) {
  const { language } = useLanguage();
  const en = language === "en";
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const visible = isOwner
    ? videos
    : videos.filter((video) => video.status === "ready" && video.embedUrl);

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const clear = () => {
      event.target.value = "";
    };

    if (!file.type.startsWith("video/")) {
      setError(en ? "Please pick a video file." : "აირჩიე ვიდეო ფაილი.");
      clear();
      return;
    }

    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(
        en
          ? `The video must be under ${MAX_SIZE_MB}MB.`
          : `ვიდეო ${MAX_SIZE_MB}MB-ზე ნაკლები უნდა იყოს.`
      );
      clear();
      return;
    }

    try {
      setBusy(true);
      setError(null);

      const formData = new FormData();
      formData.append("file", file);
      const response = await apiClient.post("/artists/videos", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      onVideosChange?.(response.data?.videos || []);
      toast({
        title: en ? "Video received" : "ვიდეო მიღებულია",
        description: en
          ? "It goes  automatically — if the daily limit is reached it waits in the queue until tomorrow."
          : "ავტომატურად აიტვირთება — თუ დღიური ლიმიტი ამოწურულია, რიგში დაელოდება ხვალამდე.",
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : en
          ? "Upload failed."
          : "ატვირთვა ვერ მოხერხდა."
      );
    } finally {
      setBusy(false);
      clear();
    }
  };

  const handleRemove = async (entryId?: string) => {
    if (!entryId) return;
    if (
      !confirm(
        en ? "Remove this video?" : "წავშალო ეს ვიდეო? YouTube-იდანაც წაიშლება."
      )
    ) {
      return;
    }

    try {
      setBusy(true);
      setError(null);
      const response = await apiClient.delete(`/artists/videos/${entryId}`);
      onVideosChange?.(response.data?.videos || []);
      toast({ title: en ? "Video removed" : "ვიდეო წაიშალა" });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : en
          ? "Could not remove the video."
          : "ვიდეო ვერ წაიშალა."
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="avp">
      {isOwner && (
        <div className="avp__intro">
          <h3>{en ? "Videos about you" : "ვიდეოები შენს შესახებ"}</h3>
          <p>
            {en
              ? "Record a short clip (up to a minute): who you are, what you create and how you work. Buyers trust an artist they have seen, and such profiles sell noticeably better. By uploading you agree that SoulArt may also use the video on its social media to promote you."
              : "ჩაწერე მოკლე ვიდეო (1 წუთამდე): ვინ ხარ, რას ქმნი და როგორ მუშაობ. მყიდველი ბევრად მეტად ენდობა ხელოვანს, რომელიც ნახა — ასეთი პროფილების ნამუშევრები შესამჩნევად უკეთ იყიდება. ატვირთვით ეთანხმები, რომ SoulArt-მა ვიდეო შენივე რეკლამირებისთვის სოციალურ ქსელებშიც გამოიყენოს."}
          </p>

          <div className="avp__actions">
            <input
              ref={inputRef}
              type="file"
              accept="video/*"
              className="avp__file"
              onChange={handleUpload}
            />
            <button
              type="button"
              className="avp__upload"
              onClick={() => {
                setError(null);
                inputRef.current?.click();
              }}
              disabled={busy || videos.length >= MAX_ARTIST_VIDEOS}
            >
              {busy
                ? en
                  ? "Uploading…"
                  : "იტვირთება…"
                : en
                ? "🎬 Upload video"
                : "🎬 ვიდეოს ატვირთვა"}
            </button>
            <span className="avp__hint">
              {en
                ? `MP4 or MOV, up to ${MAX_SIZE_MB}MB · ${videos.length}/${MAX_ARTIST_VIDEOS}`
                : `MP4 ან MOV, მაქს. ${MAX_SIZE_MB}MB · ${videos.length}/${MAX_ARTIST_VIDEOS}`}
            </span>
          </div>

          {error && <p className="avp__error">{error}</p>}
        </div>
      )}

      {visible.length === 0 ? (
        <p className="avp__empty">
          {isOwner
            ? en
              ? "No videos yet — the first one takes a couple of minutes to appear."
              : "ჯერ ვიდეო არ არის — პირველი ატვირთვიდან რამდენიმე წუთში გამოჩნდება."
            : en
            ? "This artist hasn't added a video yet."
            : "ამ ხელოვანს ჯერ ვიდეო არ დაუმატებია."}
        </p>
      ) : (
        <div className="avp__grid">
          {visible.map((video) => (
            <div className="avp__item" key={String(video._id || video.videoId)}>
              {video.status === "ready" && video.embedUrl ? (
                <iframe
                  src={video.embedUrl}
                  title={video.title || "SoulArt"}
                  allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div className={`avp__status avp__status--${video.status}`}>
                  {video.status === "failed"
                    ? en
                      ? "Upload failed"
                      : "ატვირთვა ჩაიშალა"
                    : video.status === "queued"
                    ? en
                      ? "In queue — YouTube allows a few uploads per day, yours goes out automatically (today or tomorrow)."
                      : "რიგშია —  ელოდება დადასტურებას / ავტომატურად აიტვირთება (დღეს ან ხვალ)."
                    : en
                    ? "Uploading"
                    : "იტვირთება"}
                </div>
              )}
              {isOwner && (
                <button
                  type="button"
                  className="avp__remove"
                  onClick={() => handleRemove(String(video._id))}
                  disabled={busy}
                >
                  {en ? "Remove" : "წაშლა"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
