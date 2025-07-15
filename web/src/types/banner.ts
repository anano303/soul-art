export interface Banner {
  _id: string;
  title: string;
  titleEn: string;
  buttonText: string;
  buttonTextEn: string;
  buttonLink: string;
  imageUrl: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBannerData {
  title: string;
  titleEn: string;
  buttonText: string;
  buttonTextEn: string;
  buttonLink: string;
  imageUrl?: string;
  isActive?: boolean;
  sortOrder?: number;
}
