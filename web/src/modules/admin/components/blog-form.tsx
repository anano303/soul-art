"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { toast } from "react-hot-toast";
import { Plus, Trash2, Upload, Save, X } from "lucide-react";
import Image from "next/image";
import { getUserData } from "@/lib/auth";
import { Role } from "@/types/role";
import "./blog-form.css";

interface QAItem {
  question: string;
  answer: string;
}

enum PostType {
  INTERVIEW = "interview",
  ARTICLE = "article",
}

interface BlogFormData {
  postType: PostType;
  title: string;
  titleEn: string;
  artist: string;
  artistEn: string;
  artistUsername: string;
  linkName: string;
  linkNameEn: string;
  coverImage: string;
  intro: string;
  introEn: string;
  qa: QAItem[];
  qaEn: QAItem[];
  subtitle: string;
  subtitleEn: string;
  content: string;
  contentEn: string;
  author: string;
  authorEn: string;
  images: string[];
  isPublished: boolean;
  publishDate: string;
}

interface BlogFormProps {
  postId?: string;
}

export function BlogForm({ postId }: BlogFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [currentUser] = useState(() => {
    if (typeof window === "undefined") {
      return null;
    }
    return getUserData();
  });
  const normalizeQA = (items?: Array<Partial<QAItem>>): QAItem[] => {
    if (!Array.isArray(items) || items.length === 0) {
      return [{ question: "", answer: "" }];
    }
    return items.map((item) => ({
      question: item?.question ?? "",
      answer: item?.answer ?? "",
    }));
  };
  const isPostOwner = (post: any) => {
    if (!currentUser) return false;

    const normalize = (value: unknown) => {
      if (value === undefined || value === null) {
        return "";
      }
      return String(value);
    };

    const userIdCandidates = [
      post?.createdById,
      post?.authorId,
      post?.ownerId,
      post?.createdBy?._id,
      post?.createdBy?.id,
      post?.createdBy?.userId,
      post?.createdBy?.authorId,
    ]
      .filter(Boolean)
      .map((candidate: unknown) => normalize(candidate));

    if (
      currentUser._id &&
      userIdCandidates.some((candidate) => candidate === currentUser._id)
    ) {
      return true;
    }

    const emailCandidates = [
      post?.createdBy?.email,
      post?.authorEmail,
      post?.createdByEmail,
    ]
      .filter(Boolean)
      .map((candidate: unknown) => normalize(candidate).toLowerCase());

    if (
      currentUser.email &&
      emailCandidates.includes(currentUser.email.toLowerCase())
    ) {
      return true;
    }

    return false;
  };
  const [formData, setFormData] = useState<BlogFormData>({
    postType: PostType.INTERVIEW,
    title: "",
    titleEn: "",
    artist: "",
    artistEn: "",
    artistUsername: "",
    linkName: "",
    linkNameEn: "",
    coverImage: "",
    intro: "",
    introEn: "",
    qa: [{ question: "", answer: "" }],
    qaEn: [{ question: "", answer: "" }],
    subtitle: "",
    subtitleEn: "",
    content: "",
    contentEn: "",
    author: currentUser
      ? [currentUser.firstName, currentUser.lastName]
          .filter(Boolean)
          .join(" ") ||
        currentUser.name ||
        currentUser.username ||
        ""
      : "",
    authorEn: "",
    images: [],
    isPublished: false,
    publishDate: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    if (postId) {
      fetchPost();
    }
  }, [postId]);

  // Auto-fill author name when switching to article type (only for new posts)
  useEffect(() => {
    if (!postId && formData.postType === PostType.ARTICLE && currentUser) {
      const currentAuthorName =
        [currentUser.firstName, currentUser.lastName]
          .filter(Boolean)
          .join(" ") ||
        currentUser.name ||
        currentUser.username ||
        "";

      if (!formData.author) {
        setFormData((prev) => ({
          ...prev,
          author: currentAuthorName,
        }));
      }
    }
  }, [formData.postType, postId, currentUser]);

  const fetchPost = async () => {
    try {
      const response = await fetchWithAuth(`/blog/${postId}`);
      if (response.ok) {
        const data = await response.json();

        if (
          postId &&
          currentUser?.role === Role.Blogger &&
          !isPostOwner(data)
        ) {
          toast.error("შეგიძლიათ მხოლოდ საკუთარი პოსტების რედაქტირება");
          router.push("/admin/blog");
          return;
        }
        setFormData({
          postType: data.postType || PostType.INTERVIEW,
          title: data.title,
          titleEn: data.titleEn,
          artist: data.artist || "",
          artistEn: data.artistEn || "",
          artistUsername: data.artistUsername || "",
          linkName: data.linkName || "",
          linkNameEn: data.linkNameEn || "",
          coverImage: data.coverImage,
          intro: data.intro || "",
          introEn: data.introEn || "",
          qa: normalizeQA(data.qa),
          qaEn: normalizeQA(data.qaEn),
          subtitle: data.subtitle || "",
          subtitleEn: data.subtitleEn || "",
          content: data.content || "",
          contentEn: data.contentEn || "",
          author: data.author || "",
          authorEn: data.authorEn || "",
          images: data.images || [],
          isPublished: data.isPublished,
          publishDate: new Date(data.publishDate).toISOString().split("T")[0],
        });
      }
    } catch (error) {
      console.error("Error fetching post:", error);
      toast.error("პოსტის ჩატვირთვა ვერ მოხერხდა");
    }
  };

  const handleImageUpload = async (file: File, type: "cover" | "gallery") => {
    console.log("🖼️ Starting image upload:", file.name, type);
    setUploading(true);
    const formDataToSend = new FormData();
    formDataToSend.append("image", file);

    try {
      console.log("📤 Sending request to /upload");
      const response = await fetchWithAuth("/upload", {
        method: "POST",
        body: formDataToSend,
      });

      console.log("📥 Response status:", response.status, response.ok);

      if (response.ok) {
        const data = await response.json();
        console.log("� Response data:", data);

        const url =
          typeof data === "string"
            ? data
            : data?.url || data?.secure_url || data?.optimizedUrl;

        console.log("✅ Final URL:", url);

        if (!url || typeof url !== "string") {
          throw new Error("No URL in response");
        }

        if (type === "cover") {
          setFormData((prev) => ({ ...prev, coverImage: url }));
        } else {
          setFormData((prev) => ({
            ...prev,
            images: [...prev.images, url],
          }));
        }
        toast.success("სურათი აიტვირთა");
      } else {
        const errorText = await response.text();
        console.error("❌ Upload failed:", response.status, errorText);
        toast.error("სურათის ატვირთვა ვერ მოხერხდა");
      }
    } catch (error) {
      console.error("💥 Error uploading image:", error);
      toast.error("შეცდომა მოხდა");
    } finally {
      console.log("🏁 Upload finished");
      setUploading(false);
    }
  };

  const addQAPair = (lang: "ka" | "en") => {
    if (lang === "ka") {
      setFormData((prev) => ({
        ...prev,
        qa: [...prev.qa, { question: "", answer: "" }],
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        qaEn: [...prev.qaEn, { question: "", answer: "" }],
      }));
    }
  };

  const removeQAPair = (index: number, lang: "ka" | "en") => {
    if (lang === "ka") {
      setFormData((prev) => ({
        ...prev,
        qa: prev.qa.filter((_, i) => i !== index),
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        qaEn: prev.qaEn.filter((_, i) => i !== index),
      }));
    }
  };

  const updateQAPair = (
    index: number,
    field: "question" | "answer",
    value: string,
    lang: "ka" | "en"
  ) => {
    if (lang === "ka") {
      const newQA = [...formData.qa];
      newQA[index][field] = value;
      setFormData((prev) => ({ ...prev, qa: newQA }));
    } else {
      const newQA = [...formData.qaEn];
      newQA[index][field] = value;
      setFormData((prev) => ({ ...prev, qaEn: newQA }));
    }
  };

  const removeGalleryImage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.coverImage) {
      toast.error("გთხოვთ ატვირთოთ მთავარი სურათი");
      return;
    }

    if (formData.postType === PostType.INTERVIEW) {
      if (formData.qa.length === 0) {
        toast.error("გთხოვთ დაამატოთ მინიმუმ ერთი კითხვა-პასუხი");
        return;
      }
    } else if (formData.postType === PostType.ARTICLE) {
      if (!formData.content) {
        toast.error("გთხოვთ შეავსოთ სტატიის შინაარსი");
        return;
      }
    }

    setLoading(true);

    try {
      const url = postId ? `/blog/${postId}` : "/blog";
      const method = postId ? "PUT" : "POST";

      // Prepare payload based on post type
      const sanitizedPayload: any = {
        postType: formData.postType,
        title: formData.title,
        titleEn: formData.titleEn,
        coverImage: formData.coverImage,
        images: formData.images,
        isPublished: formData.isPublished,
        publishDate: formData.publishDate,
      };

      if (formData.postType === PostType.INTERVIEW) {
        // Include interview-specific fields
        sanitizedPayload.artist = formData.artist;
        sanitizedPayload.artistEn = formData.artistEn;
        sanitizedPayload.artistUsername = formData.artistUsername?.trim() ?? "";
        sanitizedPayload.linkName = "";
        sanitizedPayload.linkNameEn = "";
        sanitizedPayload.intro = formData.intro;
        sanitizedPayload.introEn = formData.introEn;
        sanitizedPayload.qa = formData.qa.map(({ question, answer }) => ({
          question,
          answer,
        }));
        sanitizedPayload.qaEn = formData.qaEn.map(({ question, answer }) => ({
          question,
          answer,
        }));
      } else if (formData.postType === PostType.ARTICLE) {
        // Include article-specific fields only
        sanitizedPayload.subtitle = formData.subtitle;
        sanitizedPayload.subtitleEn = formData.subtitleEn;
        sanitizedPayload.content = formData.content;
        sanitizedPayload.contentEn = formData.contentEn;
        sanitizedPayload.author = formData.author;
        sanitizedPayload.authorEn = formData.authorEn;
        sanitizedPayload.linkName = formData.linkName?.trim() ?? "";
        sanitizedPayload.linkNameEn = formData.linkNameEn?.trim() ?? "";
        sanitizedPayload.artistUsername = formData.artistUsername?.trim() ?? "";
      }

      const response = await fetchWithAuth(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sanitizedPayload),
      });

      if (response.ok) {
        toast.success(postId ? "პოსტი განახლდა" : "პოსტი შეიქმნა");
        router.push("/admin/blog");
      } else {
        const error = await response.json();
        toast.error(error.message || "შეცდომა მოხდა");
      }
    } catch (error) {
      console.error("Error saving post:", error);
      toast.error("შეცდომა მოხდა");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="blog-form">
      <div className="form-header">
        <h1>{postId ? "პოსტის რედაქტირება" : "ახალი პოსტის შექმნა"}</h1>
        <div className="form-header-actions">
          <button
            type="button"
            onClick={() => router.push("/admin/blog")}
            className="btn-cancel"
          >
            <X size={20} />
            გაუქმება
          </button>
          <button type="submit" disabled={loading} className="btn-save">
            <Save size={20} />
            {loading ? "ინახება..." : "შენახვა"}
          </button>
        </div>
      </div>

      {/* Post Type Selector */}
      <div className="form-section-full">
        <div className="form-group">
          <label>პოსტის ტიპი *</label>
          <div className="post-type-selector">
            <button
              type="button"
              className={`post-type-btn ${
                formData.postType === PostType.INTERVIEW ? "active" : ""
              }`}
              onClick={() =>
                setFormData({ ...formData, postType: PostType.INTERVIEW })
              }
            >
              ინტერვიუ
            </button>
            <button
              type="button"
              className={`post-type-btn ${
                formData.postType === PostType.ARTICLE ? "active" : ""
              }`}
              onClick={() =>
                setFormData({ ...formData, postType: PostType.ARTICLE })
              }
            >
              სტატია
            </button>
          </div>
        </div>
      </div>

      <div className="form-grid">
        {/* Left Column */}
        <div className="form-section">
          <h2>ქართული ვერსია</h2>

          <div className="form-group">
            <label>სათაური *</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              placeholder={
                formData.postType === PostType.INTERVIEW
                  ? "ინტერვიუ მხატვართან..."
                  : "სტატიის სათაური"
              }
            />
          </div>

          {formData.postType === PostType.INTERVIEW ? (
            <>
              <div className="form-group">
                <label>მხატვრის სახელი *</label>
                <input
                  type="text"
                  required
                  value={formData.artist}
                  onChange={(e) =>
                    setFormData({ ...formData, artist: e.target.value })
                  }
                  placeholder="ანა გელაშვილი"
                />
              </div>

              <div className="form-group">
                <label>შესავალი ტექსტი *</label>
                <textarea
                  required
                  rows={4}
                  value={formData.intro}
                  onChange={(e) =>
                    setFormData({ ...formData, intro: e.target.value })
                  }
                  placeholder="მოკლე აღწერა მხატვარზე..."
                />
              </div>

              <div className="qa-section">
                <div className="qa-header">
                  <h3>კითხვა-პასუხები</h3>
                  <button
                    type="button"
                    onClick={() => addQAPair("ka")}
                    className="btn-add-qa"
                  >
                    <Plus size={16} />
                    დამატება
                  </button>
                </div>

                {formData.qa.map((item, index) => (
                  <div key={index} className="qa-pair">
                    <div className="qa-pair-header">
                      <span>კითხვა-პასუხი #{index + 1}</span>
                      {formData.qa.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeQAPair(index, "ka")}
                          className="btn-remove-qa"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                    <div className="form-group">
                      <label>კითხვა</label>
                      <input
                        type="text"
                        required
                        value={item.question}
                        onChange={(e) =>
                          updateQAPair(index, "question", e.target.value, "ka")
                        }
                        placeholder="როდის დაიწყეთ მხატვრობა?"
                      />
                    </div>
                    <div className="form-group">
                      <label>პასუხი</label>
                      <textarea
                        required
                        rows={4}
                        value={item.answer}
                        onChange={(e) =>
                          updateQAPair(index, "answer", e.target.value, "ka")
                        }
                        placeholder="პასუხი..."
                      />
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="form-group">
                <label>ქვესათაური</label>
                <input
                  type="text"
                  value={formData.subtitle}
                  onChange={(e) =>
                    setFormData({ ...formData, subtitle: e.target.value })
                  }
                  placeholder="სტატიის ქვესათაური"
                />
              </div>

              <div className="form-group">
                <label>სტატიის შინაარსი *</label>
                <textarea
                  required
                  rows={12}
                  value={formData.content}
                  onChange={(e) =>
                    setFormData({ ...formData, content: e.target.value })
                  }
                  placeholder="სტატიის სრული შინაარსი..."
                />
              </div>

              <div className="form-group">
                <label>ავტორი *</label>
                <input
                  type="text"
                  required
                  value={formData.author}
                  onChange={(e) =>
                    setFormData({ ...formData, author: e.target.value })
                  }
                  placeholder="ავტორის სახელი"
                />
              </div>
            </>
          )}
        </div>

        {/* Right Column */}
        <div className="form-section">
          <h2>English Version (Optional)</h2>

          <div className="form-group">
            <label>Title</label>
            <input
              type="text"
              value={formData.titleEn}
              onChange={(e) =>
                setFormData({ ...formData, titleEn: e.target.value })
              }
              placeholder={
                formData.postType === PostType.INTERVIEW
                  ? "Interview with Artist..."
                  : "Article Title"
              }
            />
          </div>

          {formData.postType === PostType.INTERVIEW ? (
            <>
              <div className="form-group">
                <label>Artist Name</label>
                <input
                  type="text"
                  value={formData.artistEn}
                  onChange={(e) =>
                    setFormData({ ...formData, artistEn: e.target.value })
                  }
                  placeholder="Ana Gelashvili"
                />
              </div>

              <div className="form-group">
                <label>Intro Text</label>
                <textarea
                  rows={4}
                  value={formData.introEn}
                  onChange={(e) =>
                    setFormData({ ...formData, introEn: e.target.value })
                  }
                  placeholder="Brief description about the artist..."
                />
              </div>

              <div className="qa-section">
                <div className="qa-header">
                  <h3>Q&A Pairs</h3>
                  <button
                    type="button"
                    onClick={() => addQAPair("en")}
                    className="btn-add-qa"
                  >
                    <Plus size={16} />
                    Add
                  </button>
                </div>

                {formData.qaEn.map((item, index) => (
                  <div key={index} className="qa-pair">
                    <div className="qa-pair-header">
                      <span>Q&A #{index + 1}</span>
                      {formData.qaEn.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeQAPair(index, "en")}
                          className="btn-remove-qa"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                    <div className="form-group">
                      <label>Question</label>
                      <input
                        type="text"
                        value={item.question}
                        onChange={(e) =>
                          updateQAPair(index, "question", e.target.value, "en")
                        }
                        placeholder="When did you start painting?"
                      />
                    </div>
                    <div className="form-group">
                      <label>Answer</label>
                      <textarea
                        rows={4}
                        value={item.answer}
                        onChange={(e) =>
                          updateQAPair(index, "answer", e.target.value, "en")
                        }
                        placeholder="Answer..."
                      />
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="form-group">
                <label>Subtitle</label>
                <input
                  type="text"
                  value={formData.subtitleEn}
                  onChange={(e) =>
                    setFormData({ ...formData, subtitleEn: e.target.value })
                  }
                  placeholder="Article subtitle"
                />
              </div>

              <div className="form-group">
                <label>Article Content</label>
                <textarea
                  rows={12}
                  value={formData.contentEn}
                  onChange={(e) =>
                    setFormData({ ...formData, contentEn: e.target.value })
                  }
                  placeholder="Full article content..."
                />
              </div>

              <div className="form-group">
                <label>Author</label>
                <input
                  type="text"
                  value={formData.authorEn}
                  onChange={(e) =>
                    setFormData({ ...formData, authorEn: e.target.value })
                  }
                  placeholder="Author name"
                />
              </div>

            </>
          )}
        </div>
      </div>

      {/* Full Width Sections */}
      <div className="form-section-full">
        <h2>დამატებითი ინფორმაცია</h2>

        <div className="form-row">
          {formData.postType === PostType.INTERVIEW && (
            <div className="form-group">
              <label>მხატვრის Username (არაა აუცილებელი)</label>
              <input
                type="text"
                value={formData.artistUsername}
                onChange={(e) =>
                  setFormData({ ...formData, artistUsername: e.target.value })
                }
                placeholder="ana_artist"
              />
              <small>
                შეიყვანეთ username რომ ბლოგში ჩაემატოს ბმული მხატვრის გვერდზე
              </small>
            </div>
          )}

          {formData.postType === PostType.ARTICLE && (
            <div className="form-group link-group">
              <label>ლინკი (არაა აუცილებელი)</label>
              <div className="link-fields">
                <input
                  type="text"
                  value={formData.linkName}
                  onChange={(e) =>
                    setFormData({ ...formData, linkName: e.target.value })
                  }
                  placeholder="ბმულის სახელი"
                />
                <input
                  type="text"
                  value={formData.linkNameEn}
                  onChange={(e) =>
                    setFormData({ ...formData, linkNameEn: e.target.value })
                  }
                  placeholder="Link name (EN)"
                />
                <input
                  type="url"
                  value={formData.artistUsername}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      artistUsername: e.target.value,
                    })
                  }
                  placeholder="https://example.com"
                />
              </div>
              <small>
                დაამატეთ ლინკი და მისთვის ქართული და ინგლისური სახელწოდება
              </small>
            </div>
          )}

          <div className="form-group">
            <label>გამოქვეყნების თარიღი *</label>
            <input
              type="date"
              required
              value={formData.publishDate}
              onChange={(e) =>
                setFormData({ ...formData, publishDate: e.target.value })
              }
            />
          </div>

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={formData.isPublished}
                onChange={(e) =>
                  setFormData({ ...formData, isPublished: e.target.checked })
                }
              />
              გამოქვეყნებული
            </label>
          </div>
        </div>

        <div className="form-group">
          <label>მთავარი სურათი *</label>
          {formData.coverImage ? (
            <div className="image-preview">
              <Image
                src={formData.coverImage}
                alt="Cover"
                width={400}
                height={250}
                style={{ objectFit: "cover", borderRadius: "8px" }}
              />
              <button
                type="button"
                onClick={() => setFormData({ ...formData, coverImage: "" })}
                className="btn-remove-image"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ) : (
            <label className="file-upload">
              <Upload size={24} />
              <span>სურათის ატვირთვა</span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  console.log("🎯 File input onChange triggered");
                  const file = e.target.files?.[0];
                  console.log("📁 Selected file:", file);
                  if (file) {
                    console.log("✅ File exists, calling handleImageUpload");
                    handleImageUpload(file, "cover");
                  } else {
                    console.log("❌ No file selected");
                  }
                }}
                disabled={uploading}
              />
            </label>
          )}
        </div>

        <div className="form-group">
          <label>გალერეის სურათები (არაა აუცილებელი)</label>
          <div className="gallery-images">
            {formData.images.map((url, index) => (
              <div key={index} className="gallery-image-item">
                <Image
                  src={url}
                  alt={`Gallery ${index + 1}`}
                  width={150}
                  height={150}
                  style={{ objectFit: "cover", borderRadius: "8px" }}
                />
                <button
                  type="button"
                  onClick={() => removeGalleryImage(index)}
                  className="btn-remove-image"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <label className="file-upload-small">
              <Upload size={20} />
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  console.log("🎯 Gallery input onChange triggered");
                  const file = e.target.files?.[0];
                  console.log("📁 Selected gallery file:", file);
                  if (file) {
                    console.log(
                      "✅ Gallery file exists, calling handleImageUpload"
                    );
                    handleImageUpload(file, "gallery");
                  } else {
                    console.log("❌ No gallery file selected");
                  }
                }}
                disabled={uploading}
              />
            </label>
          </div>
        </div>
      </div>

      <div className="form-footer">
        <button
          type="button"
          onClick={() => router.push("/admin/blog")}
          className="btn-cancel"
        >
          გაუქმება
        </button>
        <button type="submit" disabled={loading} className="btn-save">
          <Save size={20} />
          {loading ? "ინახება..." : postId ? "განახლება" : "შექმნა"}
        </button>
      </div>
    </form>
  );
}
