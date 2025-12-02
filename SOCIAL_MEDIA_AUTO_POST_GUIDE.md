# სოციალურ მედიაში ავტომატური პოსტირების გაიდი

## მიმოხილვა

ეს სისტემა ავტომატურად აპოსტავს ახალ დამტკიცებულ პროდუქტებს შემდეგ პლატფორმებზე:
- ✅ **Facebook Page** - თქვენი ბიზნეს გვერდი
- ✅ **Facebook Groups** - დაკავშირებული ჯგუფები (მრავალჯერადი)
- ✅ **Instagram** - Instagram Business Account

## 🔧 კონფიგურაცია

### 1. Facebook Page პოსტირება (უკვე მუშაობს)

```env
# თქვენს .env ფაილში უკვე არის:
FACEBOOK_POSTS_PAGE_ID=542501458957000
FACEBOOK_PAGE_ACCESS_TOKEN=EAAh5uzq...
FACEBOOK_AUTO_POST=true
```

### 2. Facebook Groups პოსტირება (ახალი)

```env
# დაამატეთ თქვენს .env ფაილში:

# მრავალი ჯგუფის ID-ები (მძიმით გამოყოფილი)
FACEBOOK_GROUP_IDS=123456789,987654321,456789123

# ჯგუფებში ავტო-პოსტის გააქტიურება
FACEBOOK_AUTO_POST_GROUPS=true
```

**როგორ მოვძებნოთ Group ID:**
1. გახსენით ჯგუფის გვერდი Facebook-ზე
2. URL-ში ნახეთ: `facebook.com/groups/123456789`
3. რიცხვი `123456789` არის თქვენი Group ID

**საჭირო ნებართვები:**
- თქვენი Page Access Token უნდა ჰქონდეს წვდომა ჯგუფებზე
- Page-ს უნდა ჰქონდეს ჯგუფში პოსტის ნებართვა
- `groups_access_member_info` permission (ზოგიერთ შემთხვევაში)

### 3. Instagram პოსტირება (ახალი)

```env
# დაამატეთ თქვენს .env ფაილში:

# Instagram Business Account ID
INSTAGRAM_ACCOUNT_ID=17841405309211844

# Instagram ავტო-პოსტის გააქტიურება
INSTAGRAM_AUTO_POST=true
```

**როგორ მოვძებნოთ Instagram Account ID:**

1. გადადით Facebook Business Manager-ში
2. Settings → Instagram Accounts
3. ან გამოიყენეთ Graph API Explorer:
   ```
   GET https://graph.facebook.com/v19.0/me/accounts?fields=instagram_business_account
   ```

**საჭირო პირობები:**
- Instagram Business Account (არა Personal)
- Instagram დაკავშირებული Facebook Page-თან
- Page Access Token-ს უნდა ჰქონდეს `instagram_content_publish` permission

**საჭირო Instagram Permissions:**
- `instagram_basic`
- `instagram_content_publish`
- `pages_read_engagement`

## 📋 სრული .env კონფიგურაცია

```env
# ============================================
# FACEBOOK & INSTAGRAM AUTO-POST CONFIGURATION
# ============================================

# Facebook Page (მთავარი გვერდი)
FACEBOOK_POSTS_PAGE_ID=542501458957000
FACEBOOK_PAGE_ACCESS_TOKEN=EAAh5uzqZCKRIBP22uG9wc5sKNWz53S9gfuRzehCmVDcZAX6grP5X9XHU0eNY7wNoos9vXKc9Toq4qN2tXioAiGwalBZC93NQOj4u4nCE4doJQ2Rwp9HPH5Md4jUD0qIZAHoNoVjBHNZBa7xZCeByKykCXzxhe8ZAZCwSUupRku3qqiWv7vdUe068UX8ZBoutrK7n6ZAaBi
FACEBOOK_AUTO_POST=true

# Facebook Groups (დაკავშირებული ჯგუფები - მძიმით გამოყოფილი)
FACEBOOK_GROUP_IDS=123456789,987654321
FACEBOOK_AUTO_POST_GROUPS=true

# Instagram (Business Account)
INSTAGRAM_ACCOUNT_ID=17841405309211844
INSTAGRAM_AUTO_POST=true
```

## 🎯 როგორ მუშაობს

### ახალი პროდუქტის დამტკიცება

როცა ადმინი **პირველად** ადასტურებს პროდუქტს:

1. ✅ **Facebook Page** - პოსტავს მთავარ გვერდზე (თუ `FACEBOOK_AUTO_POST=true`)
2. ✅ **Facebook Groups** - პოსტავს ყველა მითითებულ ჯგუფში (თუ `FACEBOOK_AUTO_POST_GROUPS=true`)
3. ✅ **Instagram** - პოსტავს Instagram-ზე (თუ `INSTAGRAM_AUTO_POST=true`)

### დაედითებული პროდუქტის დამტკიცება

თუ პროდუქტი **ადრე უკვე დამტკიცებული იყო** და მხოლოდ რედაქტირდება:
- ❌ **არ იპოსტება** არც ერთ პლატფორმაზე
- ✅ ეს თავიდან აიცილებს დუბლირებულ პოსტებს

## 📝 პოსტის შინაარსი

პოსტი შეიცავს:
- 📌 პროდუქტის სახელწოდებას
- ✍️ ავტორს/ბრენდს
- 📝 აღწერას
- ✅ ორიგინალი/ასლის სტატუსს
- 🎨 მასალებს
- 📏 განზომილებებს
- 💰 ფასს (ფასდაკლებით თუ არის)
- 🔗 პროდუქტის ლინკს
- 👤 ავტორის პროფილის ლინკს
- #️⃣ ჰეშთეგებს (მაქსიმუმ 10)

### Instagram-ის თავისებურებები

- Instagram-ზე პოსტდება **მხოლოდ პირველი ფოტო**
- Caption შეიცავს იგივე ინფორმაციას
- საჭიროა Instagram Business Account
- პოსტირება ხდება ორ ეტაპად:
  1. Media Container-ის შექმნა
  2. Container-ის გამოქვეყნება

## 🔐 Access Token-ის მიღება

### Facebook Page Access Token

1. გადადით [Facebook Developers](https://developers.facebook.com/)
2. გადადით თქვენს აპში → Tools → Graph API Explorer
3. აირჩიეთ თქვენი Page
4. მიანიჭეთ Permissions:
   - `pages_manage_posts`
   - `pages_read_engagement`
   - `publish_to_groups` (ჯგუფებისთვის)
5. Generate Access Token
6. გააგრძელეთ Token-ის მოქმედების ვადა Access Token Debugger-ით

### Instagram Permissions დამატება

1. Graph API Explorer-ში
2. დაამატეთ Permissions:
   - `instagram_basic`
   - `instagram_content_publish`
   - `pages_read_engagement`
3. Generate Token და გამოიყენეთ იგივე Token

## 🧪 ტესტირება

### 1. ლოკალური ტესტი

.env ფაილში:
```env
NODE_ENV=production  # პოსტირება მხოლოდ production-ში
```

### 2. შეამოწმეთ ლოგები

```bash
cd server
npm run start:dev
```

პროდუქტის დამტკიცებისას კონსოლში უნდა დაინახოთ:
```
[Social Media] Posted new product 507f1f77bcf86cd799439011 to: FB Page, FB Groups, Instagram
```

ან თუ რამე არ მუშაობს:
```
[Social Media] Some posts failed { errors: [...] }
```

### 3. მხოლოდ Page-ზე პოსტირება (ჯგუფები/Instagram-ის გარეშე)

```env
FACEBOOK_AUTO_POST=true
FACEBOOK_AUTO_POST_GROUPS=false  # გამორთული
INSTAGRAM_AUTO_POST=false        # გამორთული
```

## ⚠️ მნიშვნელოვანი შენიშვნები

1. **Facebook Groups შეზღუდვები:**
   - ზოგიერთი ჯგუფი არ იღებს API-დან პოსტებს
   - ჯგუფის ადმინმა უნდა მისცეს ნებართვა თქვენს Page-ს
   - შემოწმება: სცადეთ მანუალურად პოსტის დამატება Page-დან ჯგუფში

2. **Instagram შეზღუდვები:**
   - მხოლოდ ერთი ფოტო (არა carousel)
   - ფოტო უნდა იყოს საჯარო URL-ზე ხელმისაწვდომი
   - ფოტოს ზომა: მინ. 320x320px
   - ფაილის ტიპი: JPG ან PNG

3. **Rate Limits:**
   - Facebook: ~200 posts/საათში per Page
   - Instagram: ~25 posts/საათში per account
   - სისტემა არ აყოვნებს response-ს - ყველაფერი ხდება background-ში

4. **Token-ის ვადა:**
   - Page Access Token-ს შეიძლება ჰქონდეს მოქმედების ვადა
   - გამოიყენეთ Long-lived Token (60 დღე)
   - ან System User Token (არასდროს არ ამოიწურება)

## 🔄 როგორ გავაუქმო

### გამორთეთ ყველაფერი:
```env
FACEBOOK_AUTO_POST=false
FACEBOOK_AUTO_POST_GROUPS=false
INSTAGRAM_AUTO_POST=false
```

### გამორთეთ მხოლოდ ჯგუფები:
```env
FACEBOOK_AUTO_POST_GROUPS=false
```

### გამორთეთ მხოლოდ Instagram:
```env
INSTAGRAM_AUTO_POST=false
```

## 🐛 Troubleshooting

### "Facebook Group post failed"
- შეამოწმეთ Group ID სწორია თუ არა
- დარწმუნდით რომ Page-ს აქვს პოსტის უფლება ჯგუფში
- ზოგიერთი ჯგუფი არ იღებს API პოსტებს

### "Instagram post failed"
- შეამოწმეთ Instagram Account ID
- დარწმუნდით რომ Instagram Business Account-ია (არა Personal)
- შეამოწმეთ რომ Instagram დაკავშირებულია Facebook Page-თან
- Token-ს უნდა ჰქონდეს `instagram_content_publish` permission

### "No images available for Instagram post"
- Instagram-ს სჭირდება მინიმუმ ერთი სურათი
- შეამოწმეთ რომ პროდუქტს აქვს სურათები

## 📊 სტატისტიკა და მონიტორინგი

შეგიძლიათ დაამატოთ MongoDB-ში ლოგირება:
```typescript
// შექმენით SocialMediaPost schema
{
  productId: ObjectId,
  platforms: ['facebook', 'instagram'],
  postIds: {
    facebook: '123456',
    instagram: '789012'
  },
  postedAt: Date,
  success: Boolean
}
```

## 🎉 შედეგი

ახლა როცა ადმინი ადასტურებს **ახალ** პროდუქტს:
1. ✅ პოსტდება Facebook Page-ზე
2. ✅ პოსტდება ყველა მითითებულ Facebook ჯგუფში
3. ✅ პოსტდება Instagram-ზე
4. ✅ არ პოსტდება დაედითებული პროდუქტები
5. ✅ ყველაფერი ხდება ავტომატურად background-ში

## 📚 დამატებითი რესურსები

- [Facebook Graph API - Posts](https://developers.facebook.com/docs/graph-api/reference/post/)
- [Facebook Graph API - Groups](https://developers.facebook.com/docs/graph-api/reference/group/)
- [Instagram Graph API - Content Publishing](https://developers.facebook.com/docs/instagram-api/guides/content-publishing)
- [Access Token Debugger](https://developers.facebook.com/tools/debug/accesstoken/)
