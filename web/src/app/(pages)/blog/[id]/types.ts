export interface QA {
  question: string;
  answer: string;
}

export enum PostType {
  INTERVIEW = "interview",
  ARTICLE = "article",
}

export interface PopulatedUser {
  _id: string;
  username?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
}

export interface BlogPostData {
  _id: string;
  postType: PostType;
  title: string;
  titleEn?: string;
  artist?: string;
  artistEn?: string;
  artistUsername?: string;
  coverImage: string;
  intro?: string;
  introEn?: string;
  qa?: QA[];
  qaEn?: QA[];
  subtitle?: string;
  subtitleEn?: string;
  content?: string;
  contentEn?: string;
  author?: string;
  authorEn?: string;
  images?: string[];
  publishDate: string;
  views?: number;
  createdBy?: PopulatedUser | string | null;
  createdAt?: string;
}
