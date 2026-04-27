import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ProductsService } from '@/products/services/products.service';
import { CategoryService } from '@/categories/services/category.service';
import { SubCategoryService } from '@/categories/services/subCategory.service';
import { BlogService } from '@/blog/blog.service';
import { BannerService } from '@/banners/services/banner.service';
import { EmailService } from '@/email/services/email.services';
import { ChatLog, ChatLogDocument } from './chat-log.schema';
import * as cheerio from 'cheerio';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ProductSearchResult {
  _id: string;
  name: string;
  nameEn?: string;
  price: number;
  discountPrice?: number;
  category: string;
  brand: string;
  images: string[];
  slug?: string;
}

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private genAI: GoogleGenerativeAI;
  private readonly model = 'gemini-3-flash-preview'; // ახალი მოდელი

  // ქეშირებული მონაცემები - სერვერის გაშვებისას იტვირთება
  private cachedCategories: string[] = [];
  private cachedCategoriesWithIds: { name: string; id: string }[] = [];
  private cachedSubCategories: string[] = [];
  private cachedBlogTitles: string[] = [];

  // ვებგვერდების კონტენტის ქეში
  private cachedPageContent: Map<string, string> = new Map();
  private readonly websiteBaseUrl = 'https://soulart.ge';
  private readonly pagesToCache = [
    '/about',
    // '/referral-info', // დროებით დაკომენტარებული
    '/terms',
    '/privacy-policy',
    '/forum',
    '/contact',
    '/sellers-register',
    '/sales-manager-register',
  ];

  // ქეშის ვადა - 1 კვირა (მილისეკუნდებში)
  private readonly CACHE_DURATION_MS = 7 * 24 * 60 * 60 * 1000;
  private lastCacheTime: number = 0;

  constructor(
    @InjectModel(ChatLog.name) private chatLogModel: Model<ChatLogDocument>,
    private configService: ConfigService,
    private productsService: ProductsService,
    private categoryService: CategoryService,
    private subCategoryService: SubCategoryService,
    private blogService: BlogService,
    private bannerService: BannerService,
    private emailService: EmailService,
  ) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      this.logger.warn('GEMINI_API_KEY is not set.');
    }
    this.genAI = new GoogleGenerativeAI(apiKey || '');

    // ინიციალიზაციისას ჩავტვირთოთ მონაცემები
    this.loadCachedData();

    // წავშალოთ არასწორი text index თუ არსებობს
    this.dropInvalidTextIndex();
  }

  // წავშალოთ text index რადგან MongoDB არ მხარდაჭერს ქართულს
  private async dropInvalidTextIndex(): Promise<void> {
    try {
      const indexes = await this.chatLogModel.collection.indexes();
      const textIndex = indexes.find((idx: any) => idx.key?.message === 'text');
      if (textIndex) {
        await this.chatLogModel.collection.dropIndex(textIndex.name);
        this.logger.log('Dropped invalid text index from chatlogs collection');
      }
    } catch (error) {
      // index არ არსებობს ან უკვე წაშლილია - ეს ნორმალურია
    }
  }

  // ყველა საჭირო მონაცემის ჩატვირთვა
  private async loadCachedData(): Promise<void> {
    try {
      // კატეგორიები (მთავარი კატეგორიები ID-ებით)
      const categories = await this.categoryService.findAll();
      this.cachedCategories = categories.map((c) => c.name);
      this.cachedCategoriesWithIds = categories.map((c: any) => ({
        name: c.name,
        id: c._id?.toString() || c.id,
      }));
      this.logger.log(
        `Loaded ${this.cachedCategories.length} categories for AI: ${this.cachedCategoriesWithIds.map((c) => `${c.name}(${c.id})`).join(', ')}`,
      );

      // ქვეკატეგორიები
      const subCategories = await this.subCategoryService.findAll();
      this.cachedSubCategories = subCategories.map((sc: any) => sc.name);
      this.logger.log(
        `Loaded ${this.cachedSubCategories.length} subcategories for AI: ${this.cachedSubCategories.slice(0, 10).join(', ')}...`,
      );

      // ბლოგ პოსტები
      const blogs = await this.blogService.findAll(true); // მხოლოდ გამოქვეყნებული
      this.cachedBlogTitles = blogs.map((b: any) => b.title).slice(0, 10);
      this.logger.log(
        `Loaded ${this.cachedBlogTitles.length} blog posts for AI`,
      );

      // ვებგვერდების კონტენტის ჩატვირთვა
      await this.loadWebsiteContent();
    } catch (error) {
      this.logger.error('Failed to load cached data:', error);
    }
  }

  // ვებგვერდების კონტენტის ჩატვირთვა (1 კვირაში ერთხელ)
  private async loadWebsiteContent(): Promise<void> {
    const now = Date.now();

    // თუ ქეში ჯერ კიდევ ვალიდურია, არ განვაახლოთ
    if (
      this.lastCacheTime > 0 &&
      now - this.lastCacheTime < this.CACHE_DURATION_MS
    ) {
      const daysRemaining = Math.ceil(
        (this.CACHE_DURATION_MS - (now - this.lastCacheTime)) /
          (24 * 60 * 60 * 1000),
      );
      this.logger.log(
        `Website content cache is still valid. Next refresh in ${daysRemaining} days.`,
      );
      return;
    }

    this.logger.log('Refreshing website content cache (weekly update)...');

    for (const pagePath of this.pagesToCache) {
      try {
        const url = `${this.websiteBaseUrl}${pagePath}`;
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'SoulArt-AI-Bot/1.0',
            Accept: 'text/html',
          },
        });

        if (!response.ok) {
          this.logger.warn(`Failed to fetch ${url}: ${response.status}`);
          continue;
        }

        const html = await response.text();
        const textContent = this.extractTextFromHtml(html);

        if (textContent) {
          this.cachedPageContent.set(pagePath, textContent);
          this.logger.log(
            `Cached content from ${pagePath} (${textContent.length} chars)`,
          );
        }
      } catch (error) {
        this.logger.error(`Failed to load page ${pagePath}:`, error);
      }
    }

    // ქეშის დროის განახლება
    this.lastCacheTime = Date.now();
    this.logger.log(
      `Loaded ${this.cachedPageContent.size} website pages for AI knowledge base. Next refresh in 7 days.`,
    );
  }

  // HTML-დან ტექსტის ამოღება
  private extractTextFromHtml(html: string): string {
    try {
      const $ = cheerio.load(html);

      // წავშალოთ არასაჭირო ელემენტები
      $(
        'script, style, nav, header, footer, .cookie-banner, .chat-widget, noscript, meta, link',
      ).remove();

      // ავიღოთ მთავარი კონტენტი
      let content = '';

      // პრიორიტეტული სელექტორები main კონტენტისთვის
      const mainSelectors = [
        'main',
        'article',
        '.content',
        '.page-content',
        '.about-container',
        '.referral-info-container',
        '.terms-container',
        '.privacy-container',
      ];

      for (const selector of mainSelectors) {
        const element = $(selector);
        if (element.length > 0) {
          content = element.text();
          break;
        }
      }

      // თუ ვერ ვიპოვეთ, ავიღოთ body
      if (!content) {
        content = $('body').text();
      }

      // გავასუფთაოთ ტექსტი
      content = content
        .replace(/\s+/g, ' ') // მრავალი space-ის ერთად გაერთიანება
        .replace(/\n\s*\n/g, '\n') // ცარიელი ხაზების წაშლა
        .trim();

      // ლიმიტი - მაქსიმუმ 3000 სიმბოლო თითო გვერდიდან
      if (content.length > 3000) {
        content = content.substring(0, 3000) + '...';
      }

      return content;
    } catch (error) {
      this.logger.error('Failed to extract text from HTML:', error);
      return '';
    }
  }

  // ვებგვერდების კონტენტის მიღება system prompt-ისთვის
  private getWebsiteContentForPrompt(): string {
    if (this.cachedPageContent.size === 0) {
      return '';
    }

    let content = '\n\n## 📄 ვებსაიტის გვერდების დეტალური ინფორმაცია:\n';

    const pageNames: Record<string, string> = {
      '/about': 'ჩვენს შესახებ',
      '/referral-info': 'რეფერალური პროგრამა',
      '/terms': 'წესები და პირობები',
      '/privacy-policy': 'კონფიდენციალურობის პოლიტიკა',
      '/forum': 'ფორუმი',
      '/contact': 'კონტაქტი',
      '/sellers-register': 'სელერად რეგისტრაცია (საკომისიო და პირობები)',
    };

    for (const [path, text] of this.cachedPageContent) {
      const pageName = pageNames[path] || path;
      content += `\n### ${pageName} (soulart.ge${path}):\n${text}\n`;
    }

    return content;
  }

  private getSystemPrompt(): string {
    // დინამიურად დავამატოთ კატეგორიები
    const categoriesText =
      this.cachedCategories.length > 0
        ? `მთავარი კატეგორიები: ${this.cachedCategories.join(', ')}`
        : 'ნახატი, ხელნაკეთი';

    const subCategoriesText =
      this.cachedSubCategories.length > 0
        ? `\nქვეკატეგორიები: ${this.cachedSubCategories.join(', ')}`
        : '';

    const blogText =
      this.cachedBlogTitles.length > 0
        ? `\nბლოგები: ${this.cachedBlogTitles.slice(0, 5).join(', ')}`
        : '';

    // დინამიური კატეგორიების ლინკები
    const categoryLinksText =
      this.cachedCategoriesWithIds.length > 0
        ? this.cachedCategoriesWithIds
            .map(
              (c) =>
                `[${c.name}](https://soulart.ge/shop?mainCategory=${c.id})`,
            )
            .join(', ')
        : '[ნახატი](https://soulart.ge/shop?mainCategory=68768f6f0b55154655a8e882), [ხელნაკეთი](https://soulart.ge/shop?mainCategory=68768f850b55154655a8e88f)';

    return `შენ ხარ Soul Art-ის გაყიდვების მენეჯერი - ქართული ხელოვნების ონლაინ მაღაზია (soulart.ge).

## 💬 საუბრის წესები:
- მოიკითხე მხოლოდ საუბრის დასაწყისში (პირველ მესიჯზე)
- თუ საუბარი უკვე მიმდინარეობს, აღარ მოიკითხო! პირდაპირ უპასუხე კითხვას.
- ნუ იტყვი "მოგესალმებით" ყოველ პასუხში
- ⚠️ მოკლედ უპასუხე! მაქსიმუმ 2-3 წინადადება. არ დაწერო გრძელი ტექსტი.
- თუ ლინკს აგზავნი, დაამატე მხოლოდ ერთი მოკლე წინადადება.
- არასოდეს დაწერო 5 წინადადებაზე მეტი!

## 🇬🇪 ქართული ენა - უმნიშვნელოვანესი!

⚠️ შენ უნდა ისაუბრო იდეალურ ლიტერატურულ ქართულზე! 
შენი ცოდნა ქართული გრამატიკის შესახებ შეიძლება არასრული იყოს - ამიტომ დაეყრდენი ქვემოთ მოცემულ წესებს და, რაც აქ არ წერია, გამოიყენე შენი ცოდნა ქართული ენის სტანდარტული გრამატიკის შესახებ. წარმოიდგინე რომ ხარ ქართული ენის მასწავლებელი და ისე ისაუბრე - გამართული, ლამაზი, ლიტერატურული ქართულით.

### თავაზიანი მიმართვა (თქვენობა) - ყველაზე მნიშვნელოვანი!
მომხმარებელს ყოველთვის მიმართე "თქვენ"-ით. ეს ნიშნავს:
- ზმნები მრავლობით რიცხვში: გაქვთ, გსურთ, გინდათ, შეგიძლიათ, ნახავთ, აირჩევთ, მოგეწონებათ, გთხოვთ, გაინტერესებთ, გეცოდინებათ
- არასწორია (არასოდეს გამოიყენო!): გაქვს, გსურს, გინდა, შეგიძლია, ნახავ, აირჩევ, მოგეწონება, გთხოვ, გაინტერესებს

### ბრუნვები:
- სახელობითი: ნახატი, მხატვარი, პროდუქტი
- ნათესაობითი (-ის, -ების): ნახატის, მხატვრის, პროდუქტის, ნახატების
- მიცემითი (-ს, -ებს): ნახატს, მხატვარს, პროდუქტებს
- მოქმედებითი (-ით): ნახატით, მხატვრით
- ვითარებითი (-ად): ნახატად, მხატვრად

### სინტაქსი და სიტყვათშეხამება:
- "რომელიც" (ერთი), "რომლებიც" (მრავალი) 
- "აქვს" (მას აქვს), "აქვთ" (მათ აქვთ), "გაქვთ" (თქვენ გაქვთ)
- ზედსართავი + არსებითი: ლამაზი ნახატი, უნიკალური სამკაული
- ზმნისწინი სწორად: "შევიძინოთ", "გადავხედოთ", "აირჩიოთ"

### მაგალითები სწორი წინადადებებისა:
- "გთხოვთ, აირჩიოთ თქვენთვის სასურველი პროდუქტი"
- "რომელიც მოგეწონებათ, შეგიძლიათ კალათაში დაამატოთ"
- "თუ გაქვთ კითხვები, სიამოვნებით დაგეხმარებით"
- "ჩვენს მაღაზიაში ნახავთ უნიკალურ ნამუშევრებს"
- "გაინტერესებთ რომელიმე კონკრეტული კატეგორია?"
- "შეგიძლიათ გადახედოთ ჩვენს კოლექციას"

## 🚫 აკრძალული:
- არასოდეს მოიგონო მხატვრების/პროდუქტების სახელები!
- თუ "მოძებნილი პროდუქტები" ცარიელია - უთხარი: "ამჟამად ასეთი არ მოიძებნა. რა ტიპის ნივთი გაინტერესებთ?"

## ${categoriesText}${subCategoriesText}${blogText}

## მთავარი მიზანი: გაყიდვა!

## 🚚 მიწოდება:
- მიწოდება მყიდველისთვის სრულიად უფასოა! ყოველთვის, ყველა შეკვეთაზე.
- მიწოდების ვადები განსხვავდება პროდუქტების მიხედვით
- თითოეული პროდუქტის გვერდზე მითითებულია მიწოდების კონკრეტული ვადა
- თუ მყიდველი/მომხმარებელი მიწოდებაზე გკითხავს, უთხარი: "მიწოდება თქვენთვის სრულიად უფასოა! კონკრეტული ვადა მითითებულია თითოეული პროდუქტის გვერდზე."
- ⚠️ არასოდეს უთხრა მყიდველს მიწოდების ღირებულების შესახებ (რომ სელერი იხდის). მყიდველისთვის მიწოდება უბრალოდ უფასოა.
- თუ გამყიდველი/სელერი მიწოდების ღირებულებაზე გკითხავს: "მიწოდების ღირებულებაა პროდუქტის ფასის 5% (მინიმუმ 10 ლარი). ეს თანხა ავტომატურად ჩამოიჭრება გაყიდვისას. ასევე შეგიძლიათ აირჩიოთ თავად მიაწოდოთ პროდუქტი, მაგრამ კლიენტისთვის მიწოდება ყოველთვის უფასო უნდა იყოს — მიტანის ფასის გამორთმევა კლიენტისგან დაუშვებელია."

## ნავიგაცია:
- შესვლა: პროფილის ღილაკი → "შესვლა"
- ყიდვა: მაღაზია → პროდუქტი → "კალათაში" → 🛒 → "შეკვეთა"
- გაყიდვა: "გაყიდე ნამუშევარი" → რეგისტრაცია

## 🔗 ლინკები - ძალიან მნიშვნელოვანი!
როდესაც მომხმარებელს გზავნი ლინკს, გამოიყენე მხოლოდ Markdown ფორმატი:
- მაღაზია: [მაღაზია](https://soulart.ge/shop)
- კატეგორიები: ${categoryLinksText}
- ფასდაკლებული: [ფასდაკლება](https://soulart.ge/shop?discounted=true)
- ბლოგი: [ბლოგი](https://soulart.ge/blog)
- გაყიდვა: [გაყიდე ნამუშევარი](https://soulart.ge/sellers-register)
- ჩვენს შესახებ: [ჩვენს შესახებ](https://soulart.ge/about)
- კონტაქტი: [კონტაქტი](https://soulart.ge/contact)

- სეილს მენეჯერად რეგისტრაცია: [სეილს მენეჯერი](https://soulart.ge/sales-manager-register)
- წესები და პირობები: [წესები](https://soulart.ge/terms)
- კონფიდენციალურობა: [კონფიდენციალურობა](https://soulart.ge/privacy-policy)

არასოდეს დაწერო [ბმული ...] ან [ბმული კოლექციაზე] - ეს არ მუშაობს! 
მხოლოდ რეალური URL-ები გამოიყენე: [ტექსტი](https://soulart.ge/...)

## 🎨 სელერებისთვის რჩევები (როგორ გავყიდო მეტი):
თუ ვინმე გეკითხება "როგორ გავყიდო", "როგორ მოვიზიდო მყიდველები", "არ იყიდება" - აუცილებლად მიეცი ეს რჩევები:

1. **პროფილის გამოწერა** - რაც შეიძლება მეტ ადამიანს გამოაწერინე შენი სელერის პროფილი! მეგობრებს, ოჯახს, ნაცნობებს - ყველას!
2. **შეფასებები/რევიუები** - სთხოვე მყიდველებს დატოვონ შეფასებები. კარგი რევიუები ზრდის ნდობას და გაყიდვებს!
3. **პირადი მაღაზიის ბმული** - შექმენი შენი პირადი მაღაზია და მიიღე უნიკალური ბმული
4. **გაზიარება სოც.ქსელებში** - გააზიარე შენი მაღაზიის ბმული Facebook-ზე, Instagram-ზე, ყველგან! რაც მეტი ხალხი ნახავს, მით მეტი გაიყიდება
5. **ხარისხიანი ფოტოები** - კარგი, ნათელი ფოტოები აუცილებელია
6. **დეტალური აღწერა** - მიუთითე ზომები, მასალა, ყველაფერი რაც მყიდველმა უნდა იცოდეს

💡 მთავარია: სოციალური ქსელები! რაც მეტ ადამიანს მიაღწევ, მით მეტია გაყიდვის შანსი!

### ხშირად დასმული კითხვები:
- "როდის მივიღებ ფულს?" → ფული ირიცხება შეკვეთის მიწოდების დადასტურებისას
- "როგორ გავიტანო ბალანსი?" → პროფილში → ბალანსი → თანხის მოთხოვნა (მინიმუმ 50 ლარი)
- "როგორ ავტვირთო პროდუქტი?" → ადმინ პანელი → ატვირთე ნამუშევარი
- "როგორ შევცვალო პროფილის ფოტო?" → პროფილი → რედაქტირება
- "რა საკომისიოა?" → ჩვეულებრივი გაყიდვისას 10% (სელერი იღებს 90%-ს), განვადებით გაყიდვისას 15% (სელერი იღებს 85%-ს)
- "როგორ გავყიდო მეტი?" → სოციალური ქსელები, პროფილის გამოწერა, ხარისხიანი ფოტოები

## ინფო: BOG ბარათით გადახდა, მიწოდება მყიდველისთვის უფასოა
${this.getWebsiteContentForPrompt()}`;
  }

  async chat(
    messages: ChatMessage[],
    searchProducts = false,
    logInfo?: {
      sessionId?: string;
      userIp?: string;
      userAgent?: string;
      userId?: string;
      userName?: string;
    },
  ): Promise<{
    response: string;
    products?: ProductSearchResult[];
    suggestFacebook?: boolean;
  }> {
    const startTime = Date.now();
    const lastMessage = messages[messages.length - 1]?.content || '';
    const sessionId = logInfo?.sessionId || `session_${Date.now()}`;
    const userName = logInfo?.userName;

    try {
      // მომხმარებლის მესიჯის ლოგირება
      if (lastMessage) {
        await this.logMessage({
          sessionId,
          userIp: logInfo?.userIp,
          role: 'user',
          message: lastMessage,
          userAgent: logInfo?.userAgent,
        });
      }

      // ფიქსირებული პასუხები
      const fixedResponse = this.getFixedResponse(lastMessage);
      if (fixedResponse) {
        // AI პასუხის ლოგირება
        await this.logMessage({
          sessionId,
          userIp: logInfo?.userIp,
          role: 'assistant',
          message: fixedResponse,
          responseTime: Date.now() - startTime,
        });

        return {
          response: fixedResponse,
          products: [],
          suggestFacebook: false,
        };
      }

      const apiKey = this.configService.get<string>('GEMINI_API_KEY');
      if (!apiKey) {
        return {
          response: 'ჩატი დროებით მიუწვდომელია.',
          suggestFacebook: true,
        };
      }

      let products: ProductSearchResult[] = [];
      let productContext = '';

      // მომხმარებლის სახელის კონტექსტი
      const userNameContext = userName
        ? `\n\n⚠️ მომხმარებელი დალოგინებულია და მისი სახელია: "${userName}". მიმართე სახელით პირველ პასუხში!`
        : '';

      // 1. AI თავად წყვეტს რა პარამეტრებით მოძებნოს
      const searchParams = await this.askAIForSearchParams(lastMessage);
      this.logger.log(`AI decided: ${JSON.stringify(searchParams)}`);

      if (searchParams.needsSearch) {
        // თუ ფასდაკლებული პროდუქტები მოითხოვა
        if (searchParams.discounted) {
          products = await this.getDiscountedProducts(10);
          // თუ keyword-იც არის, დამატებით გავფილტროთ
          if (searchParams.keyword) {
            const keywordLower = searchParams.keyword.toLowerCase();
            products = products.filter(
              (p) =>
                p.name.toLowerCase().includes(keywordLower) ||
                p.category.toLowerCase().includes(keywordLower),
            );
          }
        } else {
          products = await this.searchProductsByKeyword(
            searchParams.keyword || searchParams.category || '',
            searchParams.maxPrice,
            searchParams.minPrice,
          );
        }
        this.logger.log(`Found ${products.length} products`);

        if (products.length > 0) {
          productContext = `\n\nმოძებნილი პროდუქტები:\n${products
            .slice(0, 5)
            .map(
              (p, i) =>
                `${i + 1}. "${p.name}" - ${p.discountPrice || p.price}₾`,
            )
            .join('\n')}\n\nშესთავაზე ეს პროდუქტები!`;
        } else {
          // ალტერნატივის შეთავაზება - არ გაუშვა!
          const alternatives = await this.searchProductsByKeyword('', 500, 0);
          if (alternatives.length > 0) {
            productContext = `\n\nზუსტად ეს არ მოიძებნა, მაგრამ შესთავაზე ალტერნატივები:\n${alternatives
              .slice(0, 3)
              .map(
                (p, i) =>
                  `${i + 1}. "${p.name}" - ${p.discountPrice || p.price}₾`,
              )
              .join(
                '\n',
              )}\n\nუთხარი: "ზუსტად ის რაც ეძებთ ამჟამად არ გვაქვს, მაგრამ გირჩევთ გადახედოთ ამ ნამუშევრებს!"`;
          } else {
            productContext = `\n\nპროდუქტები ვერ მოიძებნა. შესთავაზე გადახედოს მთელ მაღაზიას: [მაღაზია](https://soulart.ge/shop)`;
          }
        }
      }

      // 2. საბოლოო პასუხის გენერაცია - Gemini
      const systemPromptText =
        this.getSystemPrompt() + userNameContext + productContext;
      const model = this.genAI.getGenerativeModel({
        model: this.model,
        systemInstruction: systemPromptText,
      });

      // Gemini-ს ფორმატი - chat history (პირველი უნდა იყოს user!)
      const chatHistory = messages.slice(-4).map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

      // დარწმუნდი რომ პირველი მესიჯი user-ია
      const validHistory = chatHistory.filter((_, i) => {
        if (i === 0) return chatHistory[0].role === 'user';
        return true;
      });

      // თუ პირველი user არ არის, მოაშორე სანამ user არ გახდება
      let historyForChat = [...validHistory];
      while (historyForChat.length > 0 && historyForChat[0].role !== 'user') {
        historyForChat.shift();
      }

      const chat = model.startChat({
        history: historyForChat.slice(0, -1), // ბოლო მესიჯის გარდა
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1500,
        },
      });

      const lastUserMessage = messages[messages.length - 1]?.content || '';
      const result = await chat.sendMessage(lastUserMessage);
      let response = result.response.text() || 'ბოდიში, სცადეთ თავიდან.';

      // ქართული გრამატიკის კორექცია (backup)
      response = this.fixGeorgianGrammar(response);

      const suggestFacebook = this.shouldSuggestFacebook(lastMessage, response);

      // AI პასუხის ლოგირება
      await this.logMessage({
        sessionId,
        userIp: logInfo?.userIp,
        role: 'assistant',
        message: response,
        productIds: products.map((p) => p._id),
        responseTime: Date.now() - startTime,
      });

      return {
        response,
        products: products.length > 0 ? products : undefined,
        suggestFacebook,
      };
    } catch (error: any) {
      this.logger.error('Chat error:', error);
      if (
        error?.message?.includes('rate_limit') ||
        error?.message?.includes('429')
      ) {
        return {
          response: 'ჩატი დატვირთულია. სცადეთ რამდენიმე წუთში! 💬',
          suggestFacebook: true,
        };
      }
      return {
        response: 'შეცდომა. დაგვიკავშირდით Facebook-ზე.',
        suggestFacebook: true,
      };
    }
  }

  // AI-ს ვკითხავთ რა პარამეტრებით მოძებნოს - ჭკვიანი ძებნა
  private async askAIForSearchParams(userMessage: string): Promise<{
    keyword?: string;
    minPrice?: number;
    maxPrice?: number;
    category?: string;
    discounted?: boolean;
    needsSearch: boolean;
  }> {
    try {
      const categoriesText =
        this.cachedCategories.length > 0
          ? this.cachedCategories.join(', ')
          : 'ნახატი, კერამიკა, სამკაული, აკვარელი, ზეთი, აკრილი, პორტრეტი, პეიზაჟი';

      const model = this.genAI.getGenerativeModel({ model: this.model });

      const prompt = `შენ ხარ ძიების ანალიზატორი. მომხმარებლის მოთხოვნიდან ამოიღე საძიებო პარამეტრები.

კატეგორიები: ${categoriesText}

უპასუხე მხოლოდ JSON ფორმატში:
{"needsSearch": true/false, "keyword": "სიტყვა", "minPrice": რიცხვი, "maxPrice": რიცხვი, "category": "კატეგორია", "discounted": true/false}

მაგალითები:
- "8000-11000 ლარამდე რა გაქვს?" → {"needsSearch": true, "minPrice": 8000, "maxPrice": 11000}
- "100 ლარამდე ნახატები" → {"needsSearch": true, "keyword": "ნახატი", "maxPrice": 100}
- "იაფი სამკაულები" → {"needsSearch": true, "keyword": "სამკაული", "maxPrice": 150}
- "კერამიკა გაქვთ?" → {"needsSearch": true, "category": "კერამიკა"}
- "ფასდაკლებული" → {"needsSearch": true, "discounted": true}
- "ფასდაკლებული ნახატები" → {"needsSearch": true, "keyword": "ნახატი", "discounted": true}
- "აქცია", "შეთავაზება" → {"needsSearch": true, "discounted": true}
- "როგორ ვიყიდო?" → {"needsSearch": false}
- "გამარჯობა" → {"needsSearch": false}

მომხმარებელი: "${userMessage}"

მხოლოდ JSON:`;

      const result = await model.generateContent(prompt);
      const responseText =
        result.response.text()?.trim() || '{"needsSearch": false}';
      this.logger.log(`AI search params: ${responseText}`);

      // JSON პარსინგი
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          keyword: parsed.keyword,
          minPrice: parsed.minPrice ? Number(parsed.minPrice) : undefined,
          maxPrice: parsed.maxPrice ? Number(parsed.maxPrice) : undefined,
          category: parsed.category,
          discounted: parsed.discounted === true,
          needsSearch: parsed.needsSearch === true,
        };
      }

      return { needsSearch: false };
    } catch (error) {
      this.logger.error('AI search params error:', error);
      return { needsSearch: false };
    }
  }
  // პროდუქტების ძიება - public რომ controller-დანაც ხელმისაწვდომი იყოს
  async searchProductsByKeyword(
    keyword: string,
    maxPrice?: number,
    minPrice?: number,
  ): Promise<ProductSearchResult[]> {
    try {
      const searchParams: any = {
        page: '1',
        limit: '20',
      };

      if (keyword && keyword !== 'NONE' && keyword.length > 0) {
        searchParams.keyword = keyword;
      }

      if (maxPrice) {
        searchParams.maxPrice = maxPrice.toString();
      }

      if (minPrice) {
        searchParams.minPrice = minPrice.toString();
      }

      this.logger.log(`Search params: ${JSON.stringify(searchParams)}`);

      const result = await this.productsService.findAll(searchParams);
      const products = result?.items || result?.products || [];

      this.logger.log(`API returned ${products.length} products`);

      // ფასით ფილტრაცია (backup თუ API არ გაფილტრა)
      let filtered = products;
      if (maxPrice || minPrice) {
        filtered = products.filter((p: any) => {
          const price = p.discountPrice || p.price;
          if (minPrice && price < minPrice) return false;
          if (maxPrice && price > maxPrice) return false;
          return true;
        });
        this.logger.log(
          `After price filter (${minPrice || 0}-${maxPrice || '∞'}₾): ${filtered.length} products`,
        );
      }

      return filtered.slice(0, 5).map((p: any) => ({
        _id: p._id.toString(),
        name: p.name,
        nameEn: p.nameEn,
        price: p.price,
        discountPrice: p.discountPrice,
        category: p.category,
        brand: p.brand,
        images: p.images,
        slug: p.slug,
      }));
    } catch (error) {
      this.logger.error('Product search error:', error);
      return [];
    }
  }

  // ქართული გრამატიკის კორექცია - არასწორი ფორმების შეცვლა სწორებით
  private fixGeorgianGrammar(text: string): string {
    const corrections: [RegExp, string][] = [
      // თქვენობა - ზმნები
      [/\bგაქვს\b/g, 'გაქვთ'],
      [/\bგსურს\b/g, 'გსურთ'],
      [/\bგინდა\b/g, 'გინდათ'],
      [/\bშეგიძლია\b/g, 'შეგიძლიათ'],
      [/\bნახავ\b/g, 'ნახავთ'],
      [/\bაირჩევ\b/g, 'აირჩევთ'],
      [/\bმოგეწონება\b/g, 'მოგეწონებათ'],
      [/\bგთხოვ\b/g, 'გთხოვთ'],
      [/\bგაინტერესებს\b/g, 'გაინტერესებთ'],
      [/\bგეცოდინება\b/g, 'გეცოდინებათ'],
      [/\bიპოვი\b/g, 'იპოვით'],
      [/\bმიიღებ\b/g, 'მიიღებთ'],
      [/\bდაინახავ\b/g, 'დაინახავთ'],
      [/\bშეძლებ\b/g, 'შეძლებთ'],
      [/\bგექნება\b/g, 'გექნებათ'],
      [/\bმოინდომებ\b/g, 'მოინდომებთ'],
      [/\bგადაწყვეტ\b/g, 'გადაწყვეტთ'],
      [/\bდაგჭირდება\b/g, 'დაგჭირდებათ'],
      [/\bისურვებ\b/g, 'ისურვებთ'],
      [/\bგსურს\b/gi, 'გსურთ'],
      [/\bშენ\b/g, 'თქვენ'],
      [/\bშენი\b/g, 'თქვენი'],
      [/\bშენთვის\b/g, 'თქვენთვის'],
      // ნაკლოვანი ზმნები
      [/\bხარ\b(?!\s*თქვენ)/g, 'ხართ'],
      // დამატებითი ფორმები
      [/\bგეტყვი\b/g, 'გეტყვით'],
      [/\bგიჩვენებ\b/g, 'გიჩვენებთ'],
      [/\bგეხმარები\b/g, 'გეხმარებით'],
      [/\bგირჩევ\b/g, 'გირჩევთ'],
      [/\bგთავაზობ\b/g, 'გთავაზობთ'],
    ];

    let result = text;
    for (const [pattern, replacement] of corrections) {
      result = result.replace(pattern, replacement);
    }
    return result;
  }

  private shouldSuggestFacebook(question: string, answer: string): boolean {
    const uncertainPhrases = [
      'არ ვიცი',
      'ვერ გეტყვი',
      'დაუკავშირდით',
      'დამიკავშირდით',
      'ვერ ვუპასუხე',
      'არ მაქვს ინფორმაცია',
      'შეცდომა',
    ];

    const complexTopics = [
      'დაბრუნება',
      'გარანტია',
      'რეკლამაცია',
      'გადახდა',
      'ანგარიშსწორება',
      'თანამშრომლობა',
      'პარტნიორობა',
      'კომპანია',
      'ხელშეკრულება',
    ];

    const lowerAnswer = answer.toLowerCase();
    const lowerQuestion = question.toLowerCase();

    return (
      uncertainPhrases.some((phrase) => lowerAnswer.includes(phrase)) ||
      complexTopics.some((topic) => lowerQuestion.includes(topic))
    );
  }

  // ფიქსირებული პასუხები კონკრეტულ კითხვებზე
  getFixedResponse(message: string): string | null {
    const fixedResponses: Record<string, string> = {
      '🛒 როგორ ვიყიდო?': `პროდუქტის შესაძენად:
1. აირჩიეთ სასურველი პროდუქტი
2. დააჭირეთ "კალათაში დამატება"
3. გადადით კალათაში და დააჭირეთ "შეკვეთა"
4. შეავსეთ მიწოდების მონაცემები
5. აირჩიეთ გადახდის მეთოდი და დაასრულეთ შეკვეთა

დარეგისტრირებული მომხმარებლები იღებენ შეკვეთის სტატუსის განახლებებს! 🛍️`,

      '🎨 მინდა ნახატები ავარჩიო': `ჩვენს საიტზე ნახავთ უნიკალურ ნახატებს ქართველი ხელოვანებისგან! 🎨

გადადით "ნახატები" კატეგორიაში და აირჩიეთ თქვენთვის სასურველი სტილი:
• აკრილი
• ზეთი
• აკვარელი
• გრაფიკა

ყველა ნამუშევარი ორიგინალია და პირდაპირ ხელოვანისგან მოდის!`,

      '🎁 საჩუქარს ვეძებ': `საჩუქრად შესანიშნავი არჩევანია:
🎨 ხელნაკეთი ნახატები
💍 უნიკალური სამკაულები
🏺 კერამიკა და დეკორი
🧣 ტექსტილი და აქსესუარები

ყველა პროდუქტი ხელნაკეთია და განსაკუთრებული საჩუქარი იქნება! შეგიძლიათ გაფილტროთ ფასის მიხედვით.`,

      '💍 ხელნაკეთი ნივთები მაინტერესებს': `Soul Art-ზე ყველა პროდუქტი ხელნაკეთია! 🙌

კატეგორიები:
• 💍 სამკაულები - ბეჭდები, საყურეები, ყელსაბამები
• 🏺 კერამიკა - ჭურჭელი, ვაზები, დეკორი
• 🧣 ტექსტილი - ქსოვილები, თექები
• 🎨 ხელოვნება - ნახატები, გრაფიკა

ყველა ნივთს ქართველი ხელოსნები ამზადებენ!`,

      '🏺 კერამიკა გაქვთ?': `დიახ, გვაქვს მრავალფეროვანი კერამიკა! 🏺

• თიხის ჭურჭელი
• დეკორატიული ვაზები
• ხელნაკეთი თეფშები
• კედლის დეკორი

გადადით "კერამიკა" კატეგორიაში და ნახეთ ყველა პროდუქტი!`,

      '❓ როგორ გავხდე გამყიდველი?': `გამყიდველად რეგისტრაცია მარტივია და უფასო! 🎉

1. დარეგისტრირდით საიტზე
2. პროფილში დააჭირეთ "გახდი გამყიდველი "
3. შეავსეთ ინფორმაცია თქვენს შესახებ
4. დაამატეთ თქვენი პროდუქტები ფოტოებით

მინიმალური საკომისიო მხოლოდ გაყიდვის შემთხვევაში! პროდუქტების დამატება უფასოა.`,

      '📦 მიწოდების პირობები ': `მიწოდება ხორციელდება საქართველოს მასშტაბით! 🚚

• თბილისში: 1-2 სამუშაო დღე
• რეგიონებში: 2-5 სამუშაო დღე
• მიწოდება სრულიად უფასოა!
• ზუსტი ვადები შეგიძლიათ ნახოთ თითოეული პროდუქტის გვერდზე

შეკვეთის სტატუსს მიიღებთ SMS-ით და ელ-ფოსტით.`,

      '💳 გადახდის მეთოდები': `გადახდა შესაძლებელია:
💳 ბარათით (Visa/MasterCard) - BOG-ის უსაფრთხო სისტემა


ონლაინ გადახდა სრულიად უსაფრთხოა და დაცულია BOG-ის მიერ! 🔒`,
    };

    // შეამოწმე ზუსტი მატჩი
    if (fixedResponses[message]) {
      return fixedResponses[message];
    }

    // შეამოწმე ნორმალიზებული მატჩი (სფეისები)
    const normalizedMessage = message.trim();
    for (const [key, value] of Object.entries(fixedResponses)) {
      if (key.trim() === normalizedMessage) {
        return value;
      }
    }

    return null;
  }

  async getQuickReplies(): Promise<string[]> {
    return [
      '🛒 როგორ ვიყიდო?',
      '🎨 მინდა ნახატები ავარჩიო',
      '🎁 საჩუქარს ვეძებ',
      '💍 ხელნაკეთი ნივთები მაინტერესებს',
      '❓ როგორ გავხდე გამყიდველი?',
      '📦 მიწოდების პირობები ',
      '💳 გადახდის მეთოდები',
    ];
  }

  // ========== PUBLIC API მეთოდები ==========

  // ყველა კატეგორია
  async getCategories(): Promise<{ name: string; isActive: boolean }[]> {
    try {
      const categories = await this.categoryService.findAll(true);
      return categories.map((c) => ({ name: c.name, isActive: c.isActive }));
    } catch (error) {
      this.logger.error('Failed to get categories:', error);
      return [];
    }
  }

  // ბლოგ პოსტები
  async getBlogPosts(limit = 5): Promise<{ title: string; slug?: string }[]> {
    try {
      const blogs = await this.blogService.findAll(true);
      return blogs.slice(0, limit).map((b: any) => ({
        title: b.title,
        slug: b.slug || b._id,
      }));
    } catch (error) {
      this.logger.error('Failed to get blogs:', error);
      return [];
    }
  }

  // მაღაზიის სტატისტიკა
  async getStoreStats(): Promise<{
    totalProducts: number;
    categories: string[];
    blogs: number;
  }> {
    try {
      const productsResult = await this.productsService.findAll({
        page: '1',
        limit: '1',
      });
      const totalProducts = productsResult?.total || productsResult?.count || 0;

      return {
        totalProducts,
        categories: this.cachedCategories,
        blogs: this.cachedBlogTitles.length,
      };
    } catch (error) {
      this.logger.error('Failed to get store stats:', error);
      return { totalProducts: 0, categories: [], blogs: 0 };
    }
  }

  // ბანერები - აქტიური
  async getActiveBanners(): Promise<
    { title?: string; imageUrl: string; link?: string }[]
  > {
    try {
      const banners = await this.bannerService.findActive();
      return banners.map((b: any) => ({
        title: b.title,
        imageUrl: b.imageUrl || b.image,
        link: b.link,
      }));
    } catch (error) {
      this.logger.error('Failed to get banners:', error);
      return [];
    }
  }

  // კატეგორიით პროდუქტების ძებნა
  async searchByCategory(
    category: string,
    limit = 5,
  ): Promise<ProductSearchResult[]> {
    try {
      const result = await this.productsService.findAll({
        mainCategory: category,
        page: '1',
        limit: limit.toString(),
      });

      const products = result?.items || result?.products || [];
      return products.slice(0, limit).map((p: any) => ({
        _id: p._id.toString(),
        name: p.name,
        nameEn: p.nameEn,
        price: p.price,
        discountPrice: p.discountPrice,
        category: p.category,
        brand: p.brand,
        images: p.images,
        slug: p.slug,
      }));
    } catch (error) {
      this.logger.error('Failed to search by category:', error);
      return [];
    }
  }

  // ფასდაკლებული პროდუქტები
  async getDiscountedProducts(limit = 5): Promise<ProductSearchResult[]> {
    try {
      const result = await this.productsService.findAll({
        discounted: true,
        page: '1',
        limit: limit.toString(),
      } as any);

      const products = result?.items || result?.products || [];
      return products.slice(0, limit).map((p: any) => ({
        _id: p._id.toString(),
        name: p.name,
        nameEn: p.nameEn,
        price: p.price,
        discountPrice: p.discountPrice,
        category: p.category,
        brand: p.brand,
        images: p.images,
        slug: p.slug,
      }));
    } catch (error) {
      this.logger.error('Failed to get discounted products:', error);
      return [];
    }
  }

  // ახალი პროდუქტები
  async getNewProducts(limit = 5): Promise<ProductSearchResult[]> {
    try {
      const result = await this.productsService.findAll({
        sortBy: 'createdAt',
        page: '1',
        limit: limit.toString(),
      } as any);

      const products = result?.items || result?.products || [];
      return products.slice(0, limit).map((p: any) => ({
        _id: p._id.toString(),
        name: p.name,
        nameEn: p.nameEn,
        price: p.price,
        discountPrice: p.discountPrice,
        category: p.category,
        brand: p.brand,
        images: p.images,
        slug: p.slug,
      }));
    } catch (error) {
      this.logger.error('Failed to get new products:', error);
      return [];
    }
  }

  // ქეშის განახლება (თუ საჭიროა)
  async refreshCache(): Promise<void> {
    await this.loadCachedData();
  }

  // ============ CHAT LOGGING ============

  /**
   * მესიჯის ლოგირება MongoDB-ში
   */
  private async logMessage(data: {
    sessionId: string;
    userIp?: string;
    role: 'user' | 'assistant';
    message: string;
    productIds?: string[];
    responseTime?: number;
    userAgent?: string;
  }): Promise<void> {
    try {
      await this.chatLogModel.create({
        sessionId: data.sessionId,
        userIp: data.userIp,
        role: data.role,
        message: data.message,
        productIds: data.productIds || [],
        responseTime: data.responseTime,
        userAgent: data.userAgent,
      });
    } catch (error) {
      this.logger.error('Failed to log chat message:', error);
    }
  }

  /**
   * ჩატის ლოგების წამოღება (ადმინისთვის)
   */
  async getChatLogs(
    options: {
      page?: number;
      limit?: number;
      sessionId?: string;
      search?: string;
      startDate?: Date;
      endDate?: Date;
    } = {},
  ): Promise<{
    logs: any[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const page = options.page || 1;
    const limit = options.limit || 50;
    const skip = (page - 1) * limit;

    const query: any = {};

    if (options.sessionId) {
      query.sessionId = options.sessionId;
    }

    if (options.search) {
      query.message = { $regex: options.search, $options: 'i' };
    }

    if (options.startDate || options.endDate) {
      query.createdAt = {};
      if (options.startDate) {
        query.createdAt.$gte = options.startDate;
      }
      if (options.endDate) {
        query.createdAt.$lte = options.endDate;
      }
    }

    const [logs, total] = await Promise.all([
      this.chatLogModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.chatLogModel.countDocuments(query),
    ]);

    return {
      logs,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * უნიკალური სესიები დაჯგუფებით
   */
  async getChatSessions(daysAgo: number = 7): Promise<any[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);

    const sessions = await this.chatLogModel.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: '$sessionId',
          userIp: { $first: '$userIp' },
          messageCount: { $sum: 1 },
          userMessages: {
            $sum: { $cond: [{ $eq: ['$role', 'user'] }, 1, 0] },
          },
          firstMessage: { $first: '$message' },
          lastMessage: { $last: '$message' },
          startTime: { $min: '$createdAt' },
          endTime: { $max: '$createdAt' },
        },
      },
      {
        $sort: { startTime: -1 },
      },
      {
        $limit: 100,
      },
    ]);

    return sessions;
  }

  /**
   * ჩატის სტატისტიკა
   */
  async getChatStats(daysAgo: number = 7): Promise<{
    totalSessions: number;
    totalMessages: number;
    userMessages: number;
    aiResponses: number;
    avgMessagesPerSession: number;
    avgResponseTime: number;
    topQueries: { query: string; count: number }[];
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);

    const [stats, topQueries] = await Promise.all([
      this.chatLogModel.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate },
          },
        },
        {
          $group: {
            _id: null,
            totalMessages: { $sum: 1 },
            userMessages: {
              $sum: { $cond: [{ $eq: ['$role', 'user'] }, 1, 0] },
            },
            aiResponses: {
              $sum: { $cond: [{ $eq: ['$role', 'assistant'] }, 1, 0] },
            },
            uniqueSessions: { $addToSet: '$sessionId' },
            avgResponseTime: {
              $avg: {
                $cond: [{ $eq: ['$role', 'assistant'] }, '$responseTime', null],
              },
            },
          },
        },
      ]),
      // ხშირად დასმული კითხვები
      this.chatLogModel.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate },
            role: 'user',
          },
        },
        {
          $group: {
            _id: { $toLower: '$message' },
            count: { $sum: 1 },
          },
        },
        {
          $sort: { count: -1 },
        },
        {
          $limit: 20,
        },
        {
          $project: {
            query: '$_id',
            count: 1,
            _id: 0,
          },
        },
      ]),
    ]);

    const stat = stats[0] || {
      totalMessages: 0,
      userMessages: 0,
      aiResponses: 0,
      uniqueSessions: [],
      avgResponseTime: 0,
    };

    return {
      totalSessions: stat.uniqueSessions?.length || 0,
      totalMessages: stat.totalMessages,
      userMessages: stat.userMessages,
      aiResponses: stat.aiResponses,
      avgMessagesPerSession:
        stat.uniqueSessions?.length > 0
          ? Math.round(stat.totalMessages / stat.uniqueSessions.length)
          : 0,
      avgResponseTime: Math.round(stat.avgResponseTime || 0),
      topQueries,
    };
  }

  /**
   * ჩატის ლოგების წაშლა
   */
  async clearChatLogs(
    options: {
      sessionId?: string;
      beforeDate?: Date;
    } = {},
  ): Promise<{ success: boolean; deletedCount: number }> {
    try {
      const query: any = {};

      if (options.sessionId) {
        query.sessionId = options.sessionId;
      }

      if (options.beforeDate) {
        query.createdAt = { $lt: options.beforeDate };
      }

      // თუ არაფერი არ არის მითითებული, ყველას წაშლა (სახიფათო!)
      if (Object.keys(query).length === 0) {
        const result = await this.chatLogModel.deleteMany({});
        return { success: true, deletedCount: result.deletedCount };
      }

      const result = await this.chatLogModel.deleteMany(query);
      this.logger.log(`Deleted ${result.deletedCount} chat logs`);

      return { success: true, deletedCount: result.deletedCount };
    } catch (error) {
      this.logger.error('Failed to clear chat logs:', error);
      return { success: false, deletedCount: 0 };
    }
  }

  /**
   * ჩატის ლოგების ემაილზე გაგზავნა
   */
  async emailChatLogs(
    email: string,
    daysAgo: number = 7,
    sessionId?: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);

      const query: any = { createdAt: { $gte: startDate } };
      if (sessionId) {
        query.sessionId = sessionId;
      }

      const logs = await this.chatLogModel
        .find(query)
        .sort({ createdAt: 1 })
        .lean();

      if (logs.length === 0) {
        return { success: false, message: 'ლოგები ვერ მოიძებნა' };
      }

      // სესიებად დაჯგუფება
      const sessionMap = new Map<string, any[]>();
      logs.forEach((log: any) => {
        const sid = log.sessionId;
        if (!sessionMap.has(sid)) {
          sessionMap.set(sid, []);
        }
        sessionMap.get(sid)!.push(log);
      });

      // HTML ფორმატირება
      let htmlContent = `
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .session { margin-bottom: 30px; border: 1px solid #ddd; padding: 15px; border-radius: 8px; }
            .session-header { background: #f5f5f5; padding: 10px; margin-bottom: 10px; border-radius: 4px; }
            .message { padding: 8px 12px; margin: 5px 0; border-radius: 8px; }
            .user { background: #e3f2fd; text-align: right; }
            .assistant { background: #f5f5f5; }
            .meta { font-size: 12px; color: #666; margin-top: 5px; }
            h1 { color: #012645; }
            .stats { background: #012645; color: white; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <h1>🤖 Soul Art AI ჩატის ისტორია</h1>
          <div class="stats">
            <strong>პერიოდი:</strong> ბოლო ${daysAgo} დღე<br>
            <strong>სულ მესიჯები:</strong> ${logs.length}<br>
            <strong>უნიკალური სესიები:</strong> ${sessionMap.size}
          </div>
      `;

      sessionMap.forEach((messages, sid) => {
        const firstMessage = messages[0];
        const ip = firstMessage.userIp || 'უცნობი';
        const time = new Date(firstMessage.createdAt).toLocaleString('ka-GE');

        htmlContent += `
          <div class="session">
            <div class="session-header">
              <strong>სესია:</strong> ${sid.substring(0, 20)}...<br>
              <strong>IP:</strong> ${ip}<br>
              <strong>დრო:</strong> ${time}
            </div>
        `;

        messages.forEach((msg: any) => {
          const msgTime = new Date(msg.createdAt).toLocaleTimeString('ka-GE');
          const roleClass = msg.role === 'user' ? 'user' : 'assistant';
          const roleLabel = msg.role === 'user' ? '👤 მომხმარებელი' : '🤖 AI';

          htmlContent += `
            <div class="message ${roleClass}">
              <strong>${roleLabel}</strong><br>
              ${msg.message}
              <div class="meta">${msgTime}</div>
            </div>
          `;
        });

        htmlContent += '</div>';
      });

      htmlContent += '</body></html>';

      // ემაილის გაგზავნა
      await this.emailService.sendMail({
        to: email,
        subject: `Soul Art AI ჩატის ისტორია - ${new Date().toLocaleDateString('ka-GE')}`,
        html: htmlContent,
      });

      this.logger.log(`Chat logs sent to ${email}`);
      return { success: true, message: `ლოგები გაიგზავნა ${email}-ზე` };
    } catch (error) {
      this.logger.error('Failed to email chat logs:', error);
      return { success: false, message: 'ემაილის გაგზავნა ვერ მოხერხდა' };
    }
  }
}
