# ბლოგის ადმინ პანელი - სრული დოკუმენტაცია

## 📋 მიმოხილვა

შეიქმნა სრული ბლოგის მართვის სისტემა ქართველი მხატვრების ინტერვიუებისთვის. სისტემა შედგება:

- **Backend API** (NestJS)
- **Admin Panel** (React/Next.js)
- **Public Blog Pages** (დინამიური მონაცემებით)

---

## 🚀 Backend (Server)

### შექმნილი ფაილები:

#### 1. **Blog Module** (`server/src/blog/blog.module.ts`)

```typescript
- BlogController
- BlogService
- BlogPost Schema (Mongoose)
```

#### 2. **Blog Schema** (`server/src/blog/schemas/blog-post.schema.ts`)

```typescript
interface BlogPost {
  title: string; // ქართული სათაური
  titleEn: string; // ინგლისური სათაური
  artist: string; // მხატვრის სახელი (ქართული)
  artistEn: string; // მხატვრის სახელი (ინგლისური)
  artistUsername?: string; // მხატვრის username (ბმულებისთვის)
  coverImage: string; // მთავარი სურათი
  intro: string; // შესავალი ტექსტი (ქართული)
  introEn: string; // შესავალი ტექსტი (ინგლისური)
  qa: QA[]; // კითხვა-პასუხები (ქართული)
  qaEn: QA[]; // კითხვა-პასუხები (ინგლისური)
  images: string[]; // დამატებითი სურათები
  isPublished: boolean; // გამოქვეყნებული თუ არა
  publishDate: Date; // გამოქვეყნების თარიღი
  createdBy: ObjectId; // ავტორი (ადმინი)
}
```

#### 3. **API Endpoints**

**საჯარო (Public):**

- `GET /blog` - ყველა გამოქვეყნებული პოსტი
- `GET /blog?published=true` - მხოლოდ გამოქვეყნებულები
- `GET /blog?published=false` - მხოლოდ დრაფტები
- `GET /blog/:id` - კონკრეტული პოსტი

**ადმინისთვის (Admin only):**

- `POST /blog` - ახალი პოსტის შექმნა
- `PUT /blog/:id` - პოსტის რედაქტირება
- `DELETE /blog/:id` - პოსტის წაშლა
- `PUT /blog/:id/toggle-publish` - გამოქვეყნება/დამალვა

---

## 💻 Frontend - Admin Panel

### შექმნილი კომპონენტები:

#### 1. **BlogList** (`web/src/modules/admin/components/blog-list.tsx`)

- პოსტების ჩამონათვალი კარდებით
- ფილტრაცია: ყველა / გამოქვეყნებული / დრაფტი
- სწრაფი მოქმედებები:
  - ✏️ რედაქტირება
  - 👁️ გამოქვეყნება/დამალვა
  - 🗑️ წაშლა
- CSS: `blog-list.css`

#### 2. **BlogForm** (`web/src/modules/admin/components/blog-form.tsx`)

- ორენოვანი ფორმა (ქართული + ინგლისური)
- **მარცხენა სვეტი:** ქართული ველები
- **მარჯვენა სვეტი:** ინგლისური ველები
- დინამიური Q&A წყვილების დამატება/წაშლა
- სურათების ატვირთვა (Cloudinary integration)
- გალერეის სურათების მართვა
- მონაცემების ვალიდაცია
- CSS: `blog-form.css`

### Admin Routes:

```
/admin/blog              - პოსტების სია
/admin/blog/create       - ახალი პოსტის შექმნა
/admin/blog/[id]/edit    - პოსტის რედაქტირება
```

### უსაფრთხოება:

- ✅ JWT Authentication
- ✅ Role-based access (მხოლოდ Admin)
- ✅ Redirect თუ არაავტორიზებულია

---

## 🌐 Frontend - Public Blog

### განახლებული გვერდები:

#### 1. **Blog Listing** (`/blog`)

- დინამიურად იტვირთება backend-იდან
- რესპონსიული grid layout
- Card preview-ები:
  - სურათი
  - სათაური
  - მხატვრის სახელი
  - თარიღი
  - intro excerpt
- მხარდაჭერა ორივე ენისთვის

#### 2. **Blog Post Page** (`/blog/[id]`)

- დინამიური routing
- სრული პოსტის ჩვენება:
  - Cover image header
  - Artist links (თუ artistUsername არსებობს)
  - Q&A სექცია (ლამაზი ბეჯებით)
  - გალერეა (თუ images არსებობს)
- Lucide React icons:
  - `Palette` - მხატვრის ნამუშევრების სექცია
  - `ImageIcon` - გალერეა
  - `ShoppingBag` - მაღაზია
  - `ArrowLeft` - უკან დაბრუნება

---

## 🎨 დიზაინი

### ფერები & სტილი:

- **მთავარი გრადიენტი:** `#667eea` → `#764ba2` (purple theme)
- **კითხვების badge:** Blue (`#667eea`)
- **პასუხების badge:** Purple (`#764ba2`)
- **Artist Links Card:** Purple gradient background
- **Animations:** Hover effects, shimmer, scale transforms

### Responsive Design:

- ✅ Desktop (1400px+)
- ✅ Tablet (768px - 1400px)
- ✅ Mobile (< 768px)

---

## 📝 გამოყენების ინსტრუქცია

### ადმინისთვის:

#### 1. ახალი პოსტის შექმნა:

```
1. შედით /admin/blog
2. დააჭირეთ "ახალი პოსტი"
3. შეავსეთ ორივე ენის ველები:
   - სათაური (ქართული და ინგლისური)
   - მხატვრის სახელი (ქართული და ინგლისური)
   - შესავალი ტექსტი (ორივე ენაზე)
4. დაამატეთ კითხვა-პასუხები (მინ. 1 წყვილი)
5. ატვირთეთ cover სურათი (აუცილებელი)
6. დაამატეთ გალერეის სურათები (არააუცილებელი)
7. შეიყვანეთ artistUsername თუ გსურთ ბმულები
8. აირჩიეთ გამოქვეყნების თარიღი
9. მონიშნეთ "გამოქვეყნებული" ან შეინახეთ როგორც დრაფტი
10. დააჭირეთ "შენახვა"
```

#### 2. პოსტის რედაქტირება:

```
1. პოსტის კარდზე დააჭირეთ "რედაქტირება"
2. შეცვალეთ სასურველი ველები
3. დააჭირეთ "განახლება"
```

#### 3. პოსტის გამოქვეყნება/დამალვა:

```
- დააჭირეთ თვალის ხატულას (👁️/👁️‍🗨️)
- სტატუსი დაუყოვნებლივ შეიცვლება
```

#### 4. პოსტის წაშლა:

```
- დააჭირეთ "წაშლა"
- დაადასტურეთ
```

---

## 🔧 ტექნიკური დეტალები

### Backend Dependencies:

```json
{
  "@nestjs/common": "^10.x",
  "@nestjs/mongoose": "^10.x",
  "class-validator": "^0.14.x",
  "class-transformer": "^0.5.x"
}
```

### Frontend Dependencies:

```json
{
  "next": "^14.x",
  "react": "^18.x",
  "lucide-react": "^0.x",
  "react-hot-toast": "^2.x"
}
```

### Environment Variables:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

---

## ✅ რა შეიცვალა არსებულ ფაილებში:

### Backend:

1. **`server/src/app/app.module.ts`**
   - დაემატა `BlogModule` imports-ში

### Frontend:

2. **`web/src/app/(pages)/blog/page.tsx`**

   - დინამიური data fetching backend-იდან
   - ორენოვანი მხარდაჭერა

3. **`web/src/app/(pages)/blog/[id]/page.tsx`**
   - სრულად გადაკეთდა динамიური API integration-ით
   - Lucide React icons
   - ორენოვანი Q&A

---

## 🚀 რას უნდა გააკეთოთ შემდეგ:

1. **Backend გაშვება:**

```bash
cd server
npm install
npm run start:dev
```

2. **Frontend გაშვება:**

```bash
cd web
npm install
npm run dev
```

3. **Admin-ში შესვლა:**

```
http://localhost:3000/admin/blog
```

4. **პირველი პოსტის შექმნა:**

- შექმენით demo ინტერვიუ
- ატვირთეთ სურათები
- გამოაქვეყნეთ
- შეამოწმეთ საჯარო გვერდზე: `/blog`

---

## 🎉 შედეგი

✅ სრული CRUD ფუნქციონალი ბლოგ პოსტებისთვის  
✅ ორენოვანი სისტემა (ქართული + ინგლისური)  
✅ სურათების ატვირთვა Cloudinary-ზე  
✅ ლამაზი, მხატვრული დიზაინი  
✅ Responsive ყველა მოწყობილობაზე  
✅ Role-based უსაფრთხოება  
✅ Real-time preview & editing  
✅ Artist profile integration

**ბლოგის სისტემა მზადაა გამოსაყენებლად!** 🎨📝
