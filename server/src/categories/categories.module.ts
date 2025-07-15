import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CategoriesController } from './controllers/categories.controller';
import { SubCategoriesController } from './controllers/subcategories.controller';
import { AttributesController } from './controllers/attributes.controller';
import { CategoryService } from './services/category.service';
import { SubCategoryService } from './services/subCategory.service';
import { Category, CategorySchema } from './schemas/category.schema';
import { SubCategory, SubCategorySchema } from './schemas/subcategory.schema';
import { Color, ColorSchema } from './schemas/color.schema';
import { Size, SizeSchema } from './schemas/size.schema';
import { AgeGroup, AgeGroupSchema } from './schemas/age-group.schema';
import { ColorService } from './services/color.service';
import { SizeService } from './services/size.service';
import { AgeGroupService } from './services/age-group.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Category.name, schema: CategorySchema },
      { name: SubCategory.name, schema: SubCategorySchema },
      { name: Color.name, schema: ColorSchema },
      { name: Size.name, schema: SizeSchema },
      { name: AgeGroup.name, schema: AgeGroupSchema },
    ]),
  ],
  controllers: [
    CategoriesController,
    SubCategoriesController,
    AttributesController,
  ],
  providers: [
    CategoryService,
    SubCategoryService,
    ColorService,
    SizeService,
    AgeGroupService,
  ],
  exports: [
    CategoryService,
    SubCategoryService,
    ColorService,
    SizeService,
    AgeGroupService,
  ],
})
export class CategoriesModule {}
