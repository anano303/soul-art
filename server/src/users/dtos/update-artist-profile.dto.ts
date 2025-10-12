import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ArtistSocialLinksDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  instagram?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  facebook?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  behance?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  dribbble?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  website?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  tiktok?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  youtube?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  pinterest?: string;
}

export class UpdateArtistProfileDto {
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message:
      'Slug should contain only lowercase letters, numbers and hyphens (no leading or trailing hyphen)',
  })
  @MaxLength(40)
  artistSlug?: string;

  @IsOptional()
  @IsObject()
  artistBio?: Record<string, string>;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  artistCoverImage?: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  artistDisciplines?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(120)
  artistLocation?: string;

  @IsOptional()
  @IsBoolean()
  artistOpenForCommissions?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => ArtistSocialLinksDto)
  artistSocials?: ArtistSocialLinksDto;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(6)
  @ArrayUnique()
  @IsString({ each: true })
  artistHighlights?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ArrayUnique()
  @IsString({ each: true })
  artistGallery?: string[];
}
