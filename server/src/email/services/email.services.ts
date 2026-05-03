import { emailConfig } from '@/email.config';
import { Injectable } from '@nestjs/common';
import { ShippingDetails } from 'src/interfaces';

import * as nodemailer from 'nodemailer';

interface OrderConfirmationDelivery {
  label: string;
  minDays?: number;
  maxDays?: number;
  deliveryType?: string;
}

interface OrderConfirmationItem {
  name: string;
  quantity: number;
  price: number;
  subtotal: number;
  variantDetails?: string;
  delivery?: OrderConfirmationDelivery;
  imageUrl?: string;
}

interface OrderConfirmationPayload {
  customerName: string;
  orderId: string;
  profileUrl: string;
  orderDetailsUrl?: string; // Direct link to order details (for guest users)
  shippingAddress: string;
  contactPhone?: string;
  totals: {
    itemsPrice: number;
    taxPrice: number;
    shippingPrice: number;
    totalPrice: number;
  };
  orderItems: OrderConfirmationItem[];
  deliverySummary?: string;
  placedAt?: Date | string;
}

interface SellerOrderNotificationPayload {
  orderId: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  shippingAddress: Partial<ShippingDetails>;
  paymentMethod: string;
  totals: {
    itemsPrice: number;
    taxPrice: number;
    shippingPrice: number;
    totalPrice: number;
    sellerSubtotal: number;
  };
  orderItems: Array<{
    name: string;
    quantity: number;
    price: number;
    size?: string;
    color?: string;
    ageGroup?: string;
    subtotal: number;
    imageUrl?: string;
  }>;
}

interface AdminOrderStatusPayload {
  orderId: string;
  status: 'success' | 'failure';
  statusLabel: string;
  reason?: string;
  customer: {
    name: string;
    email?: string;
    phone?: string;
  };
  shippingAddress?: Partial<ShippingDetails>;
  paymentMethod: string;
  totals: {
    itemsPrice: number;
    taxPrice: number;
    shippingPrice: number;
    totalPrice: number;
  };
  createdAt?: Date | string;
  orderItems: Array<{
    name: string;
    quantity: number;
    price: number;
    subtotal: number;
    seller?: {
      name?: string;
      email?: string;
      phoneNumber?: string;
      storeName?: string;
    };
    size?: string;
    color?: string;
    ageGroup?: string;
    imageUrl?: string;
  }>;
}

@Injectable()
export class EmailService {
  private get transporter() {
    return nodemailer.createTransport({
      host: emailConfig.host,
      port: emailConfig.port,
      secure: emailConfig.secure,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });
  }

  /**
   * Generic email გაგზავნა
   */
  async sendMail(options: {
    to: string;
    subject: string;
    html: string;
    text?: string;
  }) {
    const mailOptions = {
      from: emailConfig.from,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    };

    await this.transporter.sendMail(mailOptions);
  }

  async sendPasswordResetEmail(to: string, resetToken: string) {
    const resetLink = `${process.env.ALLOWED_ORIGINS}/reset-password?token=${resetToken}`;

    const mailOptions = {
      from: emailConfig.from,
      to,
      subject: 'Password Reset Request',
      html: `
        <p>თქვენს ანგარიშზე პაროლის აღდგენის მოთხოვნა შევიდა.</p>
        <p>პაროლის აღსადგენად დააჭირეთ ქვემოთ მოცემულ ბმულს:</p>
        <a href="${resetLink}">${resetLink}</a>
        <p>თუ ეს თქვენ არ გაგიგზავნიათ, უბრალოდ არ იმოქმედოთ.</p>
      `,
    };

    await this.transporter.sendMail(mailOptions);
  }

  /**
   * სელერისთვის ახალი შეკვეთის შეტყობინება
   */
  async sendNewOrderNotificationToSeller(
    to: string,
    sellerName: string,
    payload: SellerOrderNotificationPayload,
  ) {
    const {
      orderId,
      customerName,
      customerEmail,
      customerPhone,
      shippingAddress,
      paymentMethod,
      totals,
      orderItems,
    } = payload;

    const safeValue = (value: number) =>
      typeof value === 'number' && Number.isFinite(value) ? value : 0;

    const sanitizeAttr = (value?: string) =>
      typeof value === 'string' ? value.replace(/"/g, '&quot;') : '';

    const itemsList = orderItems.map((item) => {
      const variantDetails = [item.size, item.color, item.ageGroup]
        .filter((value) => !!value)
        .join(' • ');

      const variantHtml = variantDetails
        ? `<div style="color:#6b7280; font-size: 13px; margin-top: 4px;">${variantDetails}</div>`
        : '';

      const quantity = safeValue(item.quantity);
      const price = safeValue(item.price);
      const subtotalSource =
        typeof item.subtotal === 'number' && Number.isFinite(item.subtotal)
          ? item.subtotal
          : price * quantity;
      const subtotal = safeValue(subtotalSource);

      return `
        <li style="margin-bottom: 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-spacing: 0; width: 100%;">
            <tr>
              ${
                item.imageUrl
                  ? `<td style="width: 96px; padding-right: 12px; vertical-align: top;">
                      <img src="${sanitizeAttr(item.imageUrl)}" alt="${sanitizeAttr(item.name)}" style="display: block; width: 100%; max-width: 96px; height: auto; border-radius: 8px;" />
                    </td>`
                  : ''
              }
              <td style="vertical-align: top;">
                <div style="font-weight: 600; color: #012645;">${item.name}</div>
                ${variantHtml}
                <div style="margin-top: 6px; color: #374151;">
                  რაოდენობა: <strong>${quantity}</strong> • ერთეულის ფასი: <strong>${price.toFixed(2)} ₾</strong>
                </div>
                <div style="margin-top: 4px; color: #111827;">
                  სულ: <strong>${subtotal.toFixed(2)} ₾</strong>
                </div>
              </td>
            </tr>
          </table>
        </li>
      `;
    });

    const itemsHtml = itemsList.length
      ? itemsList.join('')
      : `<li style="margin-bottom: 16px; color: #9ca3af;">პროდუქტები არ მოიძებნა.</li>`;

    const shippingInfo = [
      shippingAddress?.address,
      shippingAddress?.city,
      shippingAddress?.postalCode,
      shippingAddress?.country,
    ]
      .filter((value) => !!value)
      .join(', ');

    const mailOptions = {
      from: emailConfig.from,
      to,
      subject: `ახალი შეკვეთა #${orderId} - SoulArt`,
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #0f172a;">
          <h2 style="color: #012645; margin-bottom: 8px;">მოგესალმებით ${sellerName}!</h2>
          <p style="margin: 0 0 16px;">თქვენს პროდუქციაზე ახალი შეკვეთა დაფიქსირდა. იხილეთ დეტალები ქვემოთ:</p>

          <section style="background: #f8fafc; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
            <h3 style="margin: 0 0 12px; color: #012645;">შეკვეთის ინფორმაცია</h3>
            <p style="margin: 4px 0; color: #334155;">
              <strong>შეკვეთის ნომერი:</strong> #${orderId}<br />
              <strong>გადახდის მეთოდი:</strong> ${paymentMethod}<br />
              <strong>თქვენი ჯამური გაყიდვა:</strong> ${safeValue(totals.sellerSubtotal).toFixed(2)} ₾
            </p>
          </section>

          <section style="background: #f1f5f9; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
            <h3 style="margin: 0 0 12px; color: #012645;">მყიდველისა და მიტანის დეტალები</h3>
            <p style="margin: 4px 0; color: #334155;">
              <strong>მყიდველი:</strong> ${customerName}
              ${customerEmail ? `<br /><strong>ელ-ფოსტა:</strong> ${customerEmail}` : ''}
              ${customerPhone ? `<br /><strong>ტელეფონი:</strong> ${customerPhone}` : ''}
              ${shippingAddress?.phoneNumber ? `<br /><strong>მიტანის ტელეფონი:</strong> ${shippingAddress.phoneNumber}` : ''}
            </p>
            ${shippingInfo ? `<p style="margin: 12px 0 0; color: #334155;"><strong>მისამართი:</strong> ${shippingInfo}</p>` : ''}
          </section>

          <section style="border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
            <h3 style="margin: 0 0 12px; color: #012645;">შეძენილი პროდუქტები</h3>
            <ul style="list-style: none; padding: 0; margin: 0;">
              ${itemsHtml}
            </ul>
          </section>

          <section style="background: #f8fafc; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
           
            <p style="margin: 12px 0 0; font-size: 13px; color: #475569;">
              * საბოლოო დარიცხვა ბალანსზე მოხდება შეკვეთის წარმატებით ჩაბარების შემდეგ, soulart-ის საკომისიოს, და მიტანის საფასურის გამოკლებით (თუ ასეთი არსებობს).
            </p>
          </section>

          <p style="color: #475569; font-size: 14px;">
            სრული შეკვეთების ისტორია და სტატუსები ხელმისაწვდომია <a href="${process.env.ALLOWED_ORIGINS}/admin/orders" style="color: #012645; font-weight: 600;">თქვენს კაბინეტში</a>.
          </p>

          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e2e8f0;" />
          <p style="color: #94a3b8; font-size: 12px; text-align: center;">SoulArt Team</p>
        </div>
      `,
    };

    await this.transporter.sendMail(mailOptions);
  }

  /**
   * სელერისთვის pending withdrawal notification
   */
  async sendWithdrawalPendingNotification(
    to: string,
    sellerName: string,
    amount: number,
    accountNumber: string,
  ) {
    const mailOptions = {
      from: emailConfig.from,
      to,
      subject: 'თანხის გატანის მოთხოვნა მიღებულია - SoulArt',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: var(--primary-color, #012645);">მოგესალმებით ${sellerName}!</h2>
          
          <p>თქვენი თანხის გატანის მოთხოვნა წარმატებით მიღებულია და მუშავდება.</p>
          
          <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
            <h3 style="color: #856404; margin-top: 0;">მოთხოვნის დეტალები:</h3>
            <p><strong>თანხა:</strong> ${amount.toFixed(2)} ₾</p>
            <p><strong>ანგარიშის ნომერი:</strong> ${accountNumber}</p>
            <p><strong>მოთხოვნის თარიღი:</strong> ${new Date().toLocaleDateString('ka-GE')}</p>
            <p><strong>გადარიცხვის ვადა:</strong> 5 სამუშაო დღე</p>
          </div>
          
          <div style="background: #d1ecf1; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #17a2b8;">
            <p style="margin: 0; color: #0c5460;">
              <strong>📅 მნიშვნელოვანი:</strong> თანხა ჩაირიცხება თქვენს ანგარიშზე 5 სამუშაო დღის განმავლობაში. 
              გადარიცხვა ხორციელდება ბანკის სამუშაო საათებში.
            </p>
          </div>
          
          <p style="color: #666; font-size: 14px;">
            თანხის გატანის ისტორია შეგიძლიათ ნახოთ 
            <a href="${process.env.ALLOWED_ORIGINS}/profile/balance" style="color: var(--primary-color, #012645);">ჩემი ბალანსი</a> გვერდზე.
          </p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="color: #999; font-size: 12px;">SoulArt Team</p>
        </div>
      `,
    };

    await this.transporter.sendMail(mailOptions);
  }

  /**
   * ადმინისთვის withdrawal request notification
   */
  async sendWithdrawalAdminNotification(
    sellerName: string,
    amount: number,
    sellerEmail: string,
    transactionId: string,
  ) {
    const adminEmail = process.env.ADMIN_EMAIL || emailConfig.from;

    const mailOptions = {
      from: emailConfig.from,
      to: adminEmail,
      subject: `ახალი თანხის გადარიცხვა - ${sellerName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: var(--primary-color, #012645);">ახალი თანხის გადარიცხვა</h2>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: var(--primary-color, #012645); margin-top: 0;">ხელოვანის/ავტორის ინფორმაცია:</h3>
            <p><strong>სახელი:</strong> ${sellerName}</p>
            <p><strong>ელ-ფოსტა:</strong> ${sellerEmail}</p>
            <p><strong>თანხა:</strong> ${amount.toFixed(2)} ₾</p>
            <p><strong>ტრანზაქციის ID:</strong> ${transactionId}</p>
            <p><strong>თარიღი:</strong> ${new Date().toLocaleDateString('ka-GE')}</p>
          </div>
          
          <p>თანხა წარმატებით გადაირიცხა ხელოვანის ანგარიშზე BOG-ის API-ით.</p>
          
          <p style="color: #666; font-size: 14px;">
            სრული ინფორმაცია ხელმისაწვდომია 
          </p>
        </div>
      `,
    };

    await this.transporter.sendMail(mailOptions);
  }

  /**
   * მყიდველისთვის შეკვეთის დადასტურება
   */
  async sendOrderConfirmation(to: string, payload: OrderConfirmationPayload) {
    const {
      customerName,
      orderId,
      profileUrl,
      orderDetailsUrl,
      shippingAddress,
      contactPhone,
      totals,
      orderItems,
      deliverySummary,
      placedAt,
    } = payload;

    const safeTotal = (value: number) =>
      typeof value === 'number' && Number.isFinite(value) ? value : 0;

    const orderDate = placedAt
      ? new Date(placedAt).toLocaleString('ka-GE', {
          dateStyle: 'medium',
          timeStyle: 'short',
        })
      : undefined;

    const sanitizeAttr = (value?: string) =>
      typeof value === 'string' ? value.replace(/"/g, '&quot;') : '';

    // Use orderDetailsUrl for guest users, profileUrl for registered users
    const viewOrderUrl = orderDetailsUrl || profileUrl;
    const viewOrderText = orderDetailsUrl
      ? 'შეკვეთის დეტალების ნახვა'
      : 'პროფილიდან';

    const itemsList = (orderItems || []).map((item) => {
      const quantity = safeTotal(item.quantity);
      const price = safeTotal(item.price);
      const subtotalSource =
        typeof item.subtotal === 'number' && Number.isFinite(item.subtotal)
          ? item.subtotal
          : price * quantity;
      const subtotal = safeTotal(subtotalSource);

      const variantHtml = item.variantDetails
        ? `<div style="color:#64748b; font-size: 13px; margin-top: 4px;">${item.variantDetails}</div>`
        : '';

      const deliveryHtml = item.delivery?.label
        ? `<div style="margin-top: 6px; color: #0f172a;"><strong>მიტანის ვადა:</strong> ${item.delivery.label}</div>`
        : '';

      return `
        <li style="padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-spacing: 0; width: 100%;">
            <tr>
              ${
                item.imageUrl
                  ? `<td style="width: 96px; padding-right: 12px; vertical-align: top;">
                      <img src="${sanitizeAttr(item.imageUrl)}" alt="${sanitizeAttr(item.name)}" style="display: block; width: 100%; max-width: 96px; height: auto; border-radius: 8px;" />
                    </td>`
                  : ''
              }
              <td style="vertical-align: top;">
                <div style="font-weight: 600; color: #0f172a;">${item.name}</div>
                ${variantHtml}
                <div style="margin-top: 6px; color: #334155;">
                  რაოდენობა: <strong>${quantity}</strong> • ერთეულის ფასი: <strong>${price.toFixed(2)} ₾</strong>
                </div>
                <div style="margin-top: 4px; color: #111827;">
                  სულ: <strong>${subtotal.toFixed(2)} ₾</strong>
                </div>
                ${deliveryHtml}
              </td>
            </tr>
          </table>
        </li>
      `;
    });

    const itemsHtml = itemsList.length
      ? itemsList.join('')
      : `<li style="padding: 12px 0; color: #94a3b8;">შეკვეთილი პროდუქტები არ არის მითითებული.</li>`;

    const totalsHtml = `
      <p style="margin: 4px 0; color: #334155;">
        <strong>პროდუქტების ღირებულება:</strong> ${safeTotal(totals.itemsPrice).toFixed(2)} ₾<br />
        <strong>მიტანის ღირებულება:</strong> ${safeTotal(totals.shippingPrice).toFixed(2)} ₾<br />
        <strong>გადასახადები:</strong> ${safeTotal(totals.taxPrice).toFixed(2)} ₾<br />
        <strong>სრული თანხა:</strong> ${safeTotal(totals.totalPrice).toFixed(2)} ₾
      </p>
    `;

    const mailOptions = {
      from: emailConfig.from,
      to,
      subject: `მადლობა შეძენისთვის #${orderId} - SoulArt`,
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #0f172a;">
          <h2 style="color: #012645; margin-bottom: 12px;">მადლობა შეძენისთვის, ${customerName}!</h2>
          <p style="margin: 0 0 16px; color: #334155;">
            მადლობა შეძენისთვის, შეკვეთის დეტალები შეგიძლიათ აკონტროლოთ
            <a href="${viewOrderUrl}" style="color: #012645; font-weight: 600;">${viewOrderText}</a>,
            პრობლემების შემთხვევაში მოგვწერეთ.
          </p>

          <section style="background: #f8fafc; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
            <h3 style="margin: 0 0 12px; color: #012645;">შეკვეთის ინფორმაცია</h3>
            <p style="margin: 4px 0; color: #334155;">
              <strong>შეკვეთის ნომერი:</strong> #${orderId}<br />
              ${orderDate ? `<strong>შეძენის თარიღი:</strong> ${orderDate}<br />` : ''}
              <strong>მიტანის მისამართი:</strong> ${shippingAddress}
              ${contactPhone ? `<br /><strong>საკონტაქტო ნომერი:</strong> ${contactPhone}` : ''}
            </p>
            ${deliverySummary ? `<p style="margin: 12px 0 0; color: #0f172a;"><strong>მიტანის საერთო ვადა:</strong> ${deliverySummary}</p>` : ''}
          </section>

          <section style="border-radius: 12px; padding: 20px; border: 1px solid #e2e8f0; margin-bottom: 24px;">
            <h3 style="margin: 0 0 12px; color: #012645;">შეძენილი პროდუქტები</h3>
            <ul style="list-style: none; padding: 0; margin: 0;">
              ${itemsHtml}
            </ul>
          </section>

          <section style="background: #f8fafc; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
            <h3 style="margin: 0 0 12px; color: #012645;">ფინანსური შეჯამება</h3>
            ${totalsHtml}
          </section>

          <div style="text-align: center; margin-bottom: 24px;">
            <a href="${viewOrderUrl}" style="display: inline-block; background: #012645; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none;">
              ნახეთ შეკვეთა
            </a>
          </div>

          <p style="color: #64748b; font-size: 13px;">
            თუ გესაჭიროებათ დახმარება, გვიპასუხეთ ამ წერილზე ან დაგვიკავშირდით SoulArt-ის ჩატიდან.
          </p>

          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e2e8f0;" />
          <p style="color: #94a3b8; font-size: 12px; text-align: center;">SoulArt Team</p>
        </div>
      `,
    };

    await this.transporter.sendMail(mailOptions);
  }

  /**
   * მიტანის დასრულების შეტყობინება მყიდველისთვის
   */
  async sendDeliveryConfirmation(
    to: string,
    customerName: string,
    orderId: string,
    orderItems: any[],
    artists?: Array<{ name: string; slug: string }>,
    auctionImage?: string,
  ) {
    const itemsList = orderItems
      .map((item) => `<li>${item.name} x ${item.quantity}</li>`)
      .join('');

    // Image section for auction orders
    const imageSection = auctionImage
      ? `<div style="text-align: center; margin-bottom: 20px;">
           <img src="${auctionImage}" alt="შეკვეთის სურათი" 
                style="max-width: 100%; max-height: 300px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
         </div>`
      : '';

    // Generate artist rating links section
    const artistRatingSection =
      artists && artists.length > 0
        ? `
          <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #ffc107;">
            <h3 style="color: #012645; margin-top: 0;">⭐ გთხოვთ შეაფასოთ ხელოვანი</h3>
            <p style="margin-bottom: 16px;">თქვენი შეფასება დაეხმარება სხვა მყიდველებს და წაახალისებს ხელოვანს!</p>
            ${artists
              .map(
                (artist) => `
              <a href="https://soulart.ge/@${artist.slug}" 
                 style="display: inline-block; background: #012645; color: white; padding: 12px 24px; 
                        text-decoration: none; border-radius: 8px; margin: 4px 8px 4px 0;">
                შეაფასე ${artist.name}
              </a>
            `,
              )
              .join('')}
          </div>
        `
        : '';

    const mailOptions = {
      from: emailConfig.from,
      to,
      subject: `შეკვეთა მიტანილია #${orderId} - SoulArt`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #012645;">მადლობა ${customerName}!</h2>
          
          <p>თქვენი შეკვეთა მიტანილია წარმატებით.</p>
          
          ${imageSection}
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #012645; margin-top: 0;">მიტანილი პროდუქტები:</h3>
            <p><strong>შეკვეთის ნომერი:</strong> #${orderId}</p>
            
            <ul style="list-style-type: none; padding: 0;">
              ${itemsList}
            </ul>
          </div>
          
          <p>იმედი გვაქვს, კმაყოფილი ხართ შენაძენით!</p>
          
          ${artistRatingSection}
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="color: #999; font-size: 12px;">SoulArt Team</p>
        </div>
      `,
    };

    await this.transporter.sendMail(mailOptions);
  }

  // სელერისთვის მიტანის დადასტურების მეილი (ჩვეულებრივი შეკვეთისთვის)
  async sendDeliveryNotificationToSeller(
    to: string,
    sellerName: string,
    orderId: string,
    orderItems: Array<{ name: string; quantity: number }>,
  ) {
    const itemsList = orderItems
      .map((item) => `<li>${item.name} x ${item.quantity}</li>`)
      .join('');

    const mailOptions = {
      from: emailConfig.from,
      to,
      subject: `შეკვეთა ჩაბარებულია #${orderId} - SoulArt`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #16a34a;">✅ შეკვეთა ჩაბარებულია!</h2>
          
          <p>მოგესალმებით ${sellerName}!</p>
          
          <p>შეკვეთა <strong>#${orderId}</strong> წარმატებით ჩაბარდა მყიდველს.</p>
          
          <div style="background: #dcfce7; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #166534; margin-top: 0;">ჩაბარებული პროდუქტები:</h3>
            <ul style="list-style-type: none; padding: 0; margin: 0;">
              ${itemsList}
            </ul>
          </div>
          
          <div style="background: #f0f9ff; padding: 15px; border-radius: 8px; border-left: 4px solid #3b82f6;">
            <p style="margin: 0; color: #0369a1;">
              💰 თანხა დაემატა თქვენს ბალანსს. შეგიძლიათ გატანოთ 
              <a href="${process.env.ALLOWED_ORIGINS}/profile/balance" style="color: #012645; font-weight: 600;">ბალანსის გვერდიდან</a>.
            </p>
          </div>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="color: #999; font-size: 12px;">SoulArt Team</p>
        </div>
      `,
    };

    await this.transporter.sendMail(mailOptions);
  }

  // აუქციონის სელერისთვის მიტანის დადასტურების მეილი
  async sendAuctionDeliveryConfirmationToSeller(
    to: string,
    auctionTitle: string,
    buyerName: string,
    auctionImage?: string,
  ) {
    const imageSection = auctionImage
      ? `<div style="text-align: center; margin-bottom: 20px;">
           <img src="${auctionImage}" alt="${auctionTitle}" 
                style="max-width: 100%; max-height: 300px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
         </div>`
      : '';

    const mailOptions = {
      from: emailConfig.from,
      to,
      subject: `აუქციონის ნახატი ჩაბარებულია - ${auctionTitle} - SoulArt`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #16a34a;">✅ აუქციონის ნახატი ჩაბარებულია!</h2>
          
          ${imageSection}
          
          <p>თქვენი აუქციონის ნახატი <strong>"${auctionTitle}"</strong> წარმატებით ჩაბარდა მყიდველს <strong>${buyerName}</strong>.</p>
          
          <div style="background: #dcfce7; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #166534; margin-top: 0;">🎉 გილოცავთ გაყიდვას!</h3>
            <p style="margin: 0;">თანხა დაემატა თქვენს ბალანსს.</p>
          </div>
          
          <div style="background: #f0f9ff; padding: 15px; border-radius: 8px; border-left: 4px solid #3b82f6;">
            <p style="margin: 0; color: #0369a1;">
              💰 შეგიძლიათ თანხის გატანა 
              <a href="${process.env.ALLOWED_ORIGINS}/profile/balance" style="color: #012645; font-weight: 600;">ბალანსის გვერდიდან</a>.
            </p>
          </div>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="color: #999; font-size: 12px;">SoulArt Team</p>
        </div>
      `,
    };

    await this.transporter.sendMail(mailOptions);
  }

  async sendAdminOrderStatusEmail(
    to: string,
    payload: AdminOrderStatusPayload,
  ) {
    const {
      orderId,
      status,
      statusLabel,
      reason,
      customer,
      shippingAddress,
      paymentMethod,
      totals,
      createdAt,
      orderItems,
    } = payload;

    const safeTotal = (value: number) =>
      typeof value === 'number' && Number.isFinite(value) ? value : 0;

    const statusMeta =
      status === 'success'
        ? {
            icon: '✅',
            accent: '#16a34a',
            background: '#dcfce7',
          }
        : {
            icon: '⚠️',
            accent: '#dc2626',
            background: '#fee2e2',
          };

    const orderDate = createdAt
      ? new Date(createdAt).toLocaleString('ka-GE', {
          dateStyle: 'medium',
          timeStyle: 'short',
        })
      : undefined;

    const shippingLines = shippingAddress
      ? [
          shippingAddress.address,
          shippingAddress.city,
          shippingAddress.postalCode,
          shippingAddress.country,
        ]
          .filter((value) => !!value)
          .join(', ')
      : undefined;
    const shippingContact = shippingAddress?.phoneNumber || customer?.phone;

    const sanitizeAttr = (value?: string) =>
      typeof value === 'string' ? value.replace(/"/g, '&quot;') : '';

    const itemsList = (orderItems || []).map((item, index) => {
      const quantity = safeTotal(item.quantity);
      const price = safeTotal(item.price);
      const subtotalSource =
        typeof item.subtotal === 'number' && Number.isFinite(item.subtotal)
          ? item.subtotal
          : price * quantity;
      const subtotal = safeTotal(subtotalSource);

      const sellerDetails = item.seller
        ? `
          <div style="margin-top: 6px; color: #475569; font-size: 13px;">
            <strong>ხელოვანი/ავტორი:</strong> ${item.seller.name || 'უცნობია'}
            ${item.seller.email ? `<br /><strong>ელ-ფოსტა:</strong> ${item.seller.email}` : ''}
            ${item.seller.phoneNumber ? `<br /><strong>ტელეფონი:</strong> ${item.seller.phoneNumber}` : ''}
            ${item.seller.storeName ? `<br /><strong>მაღაზია:</strong> ${item.seller.storeName}` : ''}
          </div>
        `
        : '';

      const variants = [item.size, item.color, item.ageGroup]
        .filter((value) => !!value)
        .join(' • ');

      const variantHtml = variants
        ? `<div style="color:#6b7280; font-size: 13px; margin-top: 4px;">${variants}</div>`
        : '';

      return `
        <li style="padding: 14px 0; border-bottom: 1px solid #e2e8f0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-spacing: 0; width: 100%;">
            <tr>
              ${
                item.imageUrl
                  ? `<td style="width: 96px; padding-right: 12px; vertical-align: top;">
                      <img src="${sanitizeAttr(item.imageUrl)}" alt="${sanitizeAttr(item.name)}" style="display: block; width: 100%; max-width: 96px; height: auto; border-radius: 8px;" />
                    </td>`
                  : ''
              }
              <td style="vertical-align: top;">
                <div style="font-weight: 600; color: #0f172a;">${index + 1}. ${item.name}</div>
                ${variantHtml}
                <div style="margin-top: 6px; color: #334155;">
                  რაოდენობა: <strong>${quantity}</strong> • ერთეულის ფასი: <strong>${price.toFixed(2)} ₾</strong>
                </div>
                <div style="margin-top: 4px; color: #111827;">
                  სულ: <strong>${subtotal.toFixed(2)} ₾</strong>
                </div>
                ${sellerDetails}
              </td>
            </tr>
          </table>
        </li>
      `;
    });

    const itemsHtml = itemsList.length
      ? itemsList.join('')
      : `<li style="padding: 14px 0; color: #9ca3af;">პროდუქტები ვერ მოიძებნა.</li>`;

    const mailOptions = {
      from: emailConfig.from,
      to,
      subject: `${statusMeta.icon} შეკვეთის სტატუსი #${orderId} - ${statusLabel}`,
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 720px; margin: 0 auto; color: #0f172a;">
          <div style="background: ${statusMeta.background}; padding: 20px; border-radius: 12px; margin-bottom: 24px;">
            <h2 style="color: ${statusMeta.accent}; margin: 0 0 8px;">${statusMeta.icon} ${statusLabel}</h2>
            <p style="margin: 0; color: #334155;">
              შეკვეთის ნომერი: <strong>#${orderId}</strong>
              ${orderDate ? `<br />\n              შეძენის თარიღი: <strong>${orderDate}</strong>` : ''}
            </p>
          </div>

          ${
            reason
              ? `
            <section style="background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 12px; padding: 16px 20px; margin-bottom: 24px; color: #92400e;">
              <strong>დეტალური მიზეზი:</strong> ${reason}
            </section>
          `
              : ''
          }

          <section style="background: #f8fafc; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
            <h3 style="margin: 0 0 12px; color: #012645;">მყიდველის ინფორმაცია</h3>
            <p style="margin: 4px 0; color: #334155;">
              <strong>სახელი:</strong> ${customer?.name || 'უცნობია'}
              ${customer?.email ? `<br />\n              <strong>ელ-ფოსტა:</strong> ${customer.email}` : ''}
              ${customer?.phone ? `<br />\n              <strong>ტელეფონი:</strong> ${customer.phone}` : ''}
            </p>
            ${shippingLines ? `<p style="margin: 12px 0 0; color: #334155;"><strong>მიტანის მისამართი:</strong> ${shippingLines}</p>` : ''}
            ${shippingContact ? `<p style="margin: 4px 0 0; color: #334155;"><strong>მიწოდების საკონტაქტო:</strong> ${shippingContact}</p>` : ''}
          </section>

          <section style="border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
            <h3 style="margin: 0 0 12px; color: #012645;">პროდუქტების დეტალები</h3>
            <ul style="list-style: none; padding: 0; margin: 0;">
              ${itemsHtml}
            </ul>
          </section>

          <section style="background: #f8fafc; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
            <h3 style="margin: 0 0 12px; color: #012645;">ფინანსური შეჯამება</h3>
            <p style="margin: 4px 0; color: #334155;">
              <strong>პროდუქტების ღირებულება:</strong> ${safeTotal(totals.itemsPrice).toFixed(2)} ₾<br />
              <strong>მიტანის ღირებულება:</strong> ${safeTotal(totals.shippingPrice).toFixed(2)} ₾<br />
              <strong>გადასახადები:</strong> ${safeTotal(totals.taxPrice).toFixed(2)} ₾<br />
              <strong>სრული თანხა:</strong> ${safeTotal(totals.totalPrice).toFixed(2)} ₾
            </p>
          </section>

          <section style="border-radius: 12px; padding: 20px; border: 1px dashed ${statusMeta.accent};">
            <h3 style="margin: 0 0 12px; color: ${statusMeta.accent};">გადახდის მეთოდი</h3>
            <p style="margin: 0; color: #334155;">${paymentMethod}</p>
          </section>

          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e2e8f0;" />
          <p style="color: #94a3b8; font-size: 12px; text-align: center;">SoulArt Automations</p>
        </div>
      `,
    };

    await this.transporter.sendMail(mailOptions);
  }

  /**
   * სელერისთვის withdrawal completion notification
   */
  async sendWithdrawalCompletedNotification(
    to: string,
    sellerName: string,
    amount: number,
  ) {
    const mailOptions = {
      from: emailConfig.from,
      to,
      subject: 'თანხის გატანა დასრულდა - SoulArt',
      html: `
        <div style="max-width: 600px; margin: 0 auto; font-family: 'Segoe UI', Arial, sans-serif;">
          <div style="background: linear-gradient(135deg, #22c55e, #16a34a); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">✅ თანხის გატანა დასრულდა</h1>
          </div>
          
          <div style="padding: 30px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
            <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
              გამარჯობა <strong>${sellerName}</strong>,
            </p>
            
            <p style="color: #374151; line-height: 1.6;">
              თქვენი თანხის გატანის მოთხოვნა წარმატებით დასრულდა!
            </p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #22c55e;">
              <p style="margin: 0; font-size: 18px; color: #374151;">
                <strong>გადარიცხული თანხა: ${amount} ₾</strong>
              </p>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
              თანხა გადარიცხულია თქვენს მითითებულ ბანკის ანგარიშზე. 
              გადარიცხვის ნახვა შეგიძლიათ 1-2 სამუშაო დღის განმავლობაში.
            </p>
            
            <p style="color: #374151; margin-top: 20px;">
              გმადლობთ SoulArt-თან თანამშრომლობისთვის!
            </p>
            
            <div style="text-align: center; margin-top: 30px;">
              <a href="${process.env.ALLOWED_ORIGINS}/profile/balance" 
                 style="background: #22c55e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                ბალანსის გვერდზე გადასვლა
              </a>
            </div>
          </div>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="color: #999; font-size: 12px; text-align: center;">SoulArt Team</p>
        </div>
      `,
    };

    await this.transporter.sendMail(mailOptions);
  }

  /**
   * სელერისთვის withdrawal rejection notification
   */
  async sendWithdrawalRejectedNotification(
    to: string,
    sellerName: string,
    amount: number,
    reason: string,
  ) {
    const mailOptions = {
      from: emailConfig.from,
      to,
      subject: 'თანხის გატანა უარყოფილია - SoulArt',
      html: `
        <div style="max-width: 600px; margin: 0 auto; font-family: 'Segoe UI', Arial, sans-serif;">
          <div style="background: linear-gradient(135deg, #ef4444, #dc2626); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">❌ თანხის გატანა უარყოფილია</h1>
          </div>
          
          <div style="padding: 30px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
            <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
              გამარჯობა <strong>${sellerName}</strong>,
            </p>
            
            <p style="color: #374151; line-height: 1.6;">
              სამწუხაროდ, თქვენი თანხის გატანის მოთხოვნა უარყოფილია.
            </p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
              <p style="margin: 0 0 10px 0; font-size: 16px; color: #374151;">
                <strong>თანხა: ${amount} ₾</strong>
              </p>
              <p style="margin: 0; color: #6b7280; font-size: 14px;">
                <strong>მიზეზი:</strong> ${reason}
              </p>
            </div>
            
            <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
              <p style="margin: 0; color: #92400e; font-size: 14px;">
                ⚠️ თანხა დაბრუნებულია თქვენს ბალანსზე და შეგიძლიათ ხელახლა მოითხოვოთ გატანა.
              </p>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
              თუ კითხვები გაქვთ, გთხოვთ დაუკავშირდეთ ჩვენს მხარდაჭერის გუნდს.
            </p>
            
            <div style="text-align: center; margin-top: 30px;">
              <a href="${process.env.ALLOWED_ORIGINS}/profile/balance" 
                 style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                ბალანსის გვერდზე გადასვლა
              </a>
            </div>
          </div>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="color: #999; font-size: 12px; text-align: center;">SoulArt Team</p>
        </div>
      `,
    };

    await this.transporter.sendMail(mailOptions);
  }

  /**
   * ადმინის შეტყობინება სელერებისთვის (ინდივიდუალური გაგზავნა)
   */
  async sendBulkMessageToSeller(
    to: string,
    sellerName: string,
    subject: string,
    message: string,
    artistSlug?: string,
  ): Promise<void> {
    const profileUrl = artistSlug
      ? `https://soulart.ge/@${artistSlug}`
      : 'https://soulart.ge';

    const mailOptions = {
      from: emailConfig.from,
      to, // ინდივიდუალურად იგზავნება ყველა სელერს
      subject: `SoulArt: ${subject}`,
      html: `
        <div style="font-family: 'FiraGO', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #012645, #0f4f75); padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 22px; font-weight: 600;">SoulArt</h1>
          </div>
          
          <!-- Content -->
          <div style="padding: 24px;">
            <p style="color: #374151; font-size: 15px; margin: 0 0 16px;">
              გამარჯობა, <strong>${sellerName}</strong>!
            </p>
            
            <div style="color: #374151; font-size: 14px; line-height: 1.6; white-space: pre-line; margin-bottom: 20px;">
${message}
            </div>
            
            <a href="${profileUrl}" 
               style="background: #012645; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; display: inline-block; font-size: 14px;">
              SoulArt.ge
            </a>
          </div>
          
          <!-- Footer -->
          <div style="background: #f3f4f6; padding: 16px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 12px; margin: 0;">
              © ${new Date().getFullYear()} SoulArt
            </p>
          </div>
        </div>
      `,
    };

    await this.transporter.sendMail(mailOptions);
  }

  /**
   * Withdrawal request notification for admin
   */
  async sendWithdrawalRequestNotification(data: {
    adminEmail: string;
    requesterName: string;
    requesterEmail: string;
    requesterType: 'seller' | 'sales_manager';
    amount: number;
    accountNumber?: string;
  }) {
    const typeLabel =
      data.requesterType === 'seller' ? 'სელერი' : 'Sales Manager';

    const mailOptions = {
      from: emailConfig.from,
      to: data.adminEmail,
      subject: `SoulArt: ახალი გატანის მოთხოვნა - ${data.amount.toFixed(2)} ₾`,
      html: `
        <div style="font-family: 'FiraGO', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #ff600a, #ff6c1d); padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 22px; font-weight: 600;">💰 გატანის მოთხოვნა</h1>
          </div>
          
          <!-- Content -->
          <div style="padding: 24px;">
            <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
              <p style="color: #92400e; font-size: 14px; margin: 0; font-weight: 600;">
                ⚠️ ახალი გატანის მოთხოვნა მოელოდება დადასტურებას!
              </p>
            </div>
            
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">ტიპი:</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #1f2937; font-weight: 600;">${typeLabel}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">სახელი:</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #1f2937;">${data.requesterName}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">ელ-ფოსტა:</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #1f2937;">${data.requesterEmail}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">ანგარიში:</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #1f2937;">${data.accountNumber || 'არ არის მითითებული'}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; color: #6b7280;">თანხა:</td>
                <td style="padding: 10px 0; color: #dc2626; font-size: 20px; font-weight: 700;">${data.amount.toFixed(2)} ₾</td>
              </tr>
            </table>
            
            <a href="https://soulart.ge/admin/bog-transfers" 
               style="background: #ff600a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; font-size: 14px; font-weight: 600;">
              გადარიცხვების გვერდი →
            </a>
          </div>
          
          <!-- Footer -->
          <div style="background: #f3f4f6; padding: 16px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 12px; margin: 0;">
              © ${new Date().getFullYear()} SoulArt Admin
            </p>
          </div>
        </div>
      `,
    };

    await this.transporter.sendMail(mailOptions);
  }

  /**
   * საკონტაქტო ფორმიდან მეილის გაგზავნა ადმინისტრატორთან
   */
  async sendContactFormEmail(data: {
    name: string;
    email: string;
    subject: string;
    message: string;
  }) {
    const adminEmail = process.env.ADMIN_EMAIL || 'info@soulart.ge';

    const mailOptions = {
      from: emailConfig.from,
      to: adminEmail,
      replyTo: data.email,
      subject: `[საკონტაქტო ფორმა] ${data.subject}`,
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #012645 0%, #1a365d 100%); padding: 24px; text-align: center;">
            <h1 style="color: #ffffff; font-size: 24px; margin: 0;">📧 ახალი შეტყობინება</h1>
            <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0; font-size: 14px;">საკონტაქტო ფორმიდან</p>
          </div>
          
          <!-- Content -->
          <div style="padding: 24px;">
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
              <tr>
                <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280; width: 120px; font-weight: 600;">სახელი:</td>
                <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #1f2937;">${data.name}</td>
              </tr>
              <tr>
                <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-weight: 600;">ელ-ფოსტა:</td>
                <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #1f2937;">
                  <a href="mailto:${data.email}" style="color: #2563eb; text-decoration: none;">${data.email}</a>
                </td>
              </tr>
              <tr>
                <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-weight: 600;">თემა:</td>
                <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #1f2937; font-weight: 600;">${data.subject}</td>
              </tr>
            </table>
            
            <div style="background: #f8fafc; border-radius: 8px; padding: 16px; margin-top: 16px;">
              <h3 style="color: #374151; margin: 0 0 12px; font-size: 14px; font-weight: 600;">შეტყობინება:</h3>
              <p style="color: #1f2937; margin: 0; line-height: 1.6; white-space: pre-wrap;">${data.message}</p>
            </div>
            
            <div style="margin-top: 24px; text-align: center;">
              <a href="mailto:${data.email}?subject=Re: ${encodeURIComponent(data.subject)}" 
                 style="background: #012645; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; font-size: 14px; font-weight: 600;">
                პასუხის გაგზავნა →
              </a>
            </div>
          </div>
          
          <!-- Footer -->
          <div style="background: #f3f4f6; padding: 16px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 12px; margin: 0;">
              © ${new Date().getFullYear()} SoulArt - საკონტაქტო ფორმა
            </p>
          </div>
        </div>
      `,
      text: `
ახალი შეტყობინება საკონტაქტო ფორმიდან

სახელი: ${data.name}
ელ-ფოსტა: ${data.email}
თემა: ${data.subject}

შეტყობინება:
${data.message}
      `,
    };

    await this.transporter.sendMail(mailOptions);
  }

  // აუქციონის მოგების ნოტიფიკაცია
  async sendAuctionWinnerNotification(
    email: string,
    auctionTitle: string,
    finalPrice: number,
    paymentDeadline: Date,
    auctionImage?: string,
    deliveryType?: string, // 'SOULART' or 'ARTIST'
  ) {
    const imageSection = auctionImage
      ? `<div style="text-align: center; margin-bottom: 20px;">
           <img src="${auctionImage}" alt="${auctionTitle}" 
                style="max-width: 100%; max-height: 300px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
         </div>`
      : '';

    // მიტანის ტექსტი deliveryType-ის მიხედვით
    const deliveryText =
      deliveryType === 'ARTIST'
        ? 'გადახდის შემდეგ ხელოვანი თავად მოგიტანთ ნახატს'
        : 'გადახდის შემდეგ ჩვენ დაგიკავშირდებით მიტანის დეტალებზე';

    const mailOptions = {
      from: emailConfig.from,
      to: email,
      subject: `🎉 გამარჯობა! გილოცავთ! თქვენ მოიგეთ აუქციონი - ${auctionTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9;">
          <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h1 style="color: #16a34a; text-align: center; margin-bottom: 30px;">🎉 გილოცავთ მოგებას!</h1>
            
            ${imageSection}
            
            <p style="font-size: 16px; line-height: 1.6; color: #333;">
              თქვენ მოიგეთ აუქციონი: <strong>${auctionTitle}</strong>
            </p>
            
            <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin: 0 0 10px 0; color: #0369a1;">აუქციონის დეტალები:</h3>
              <p style="margin: 5px 0;"><strong>ნამუშევარი:</strong> ${auctionTitle}</p>
              <p style="margin: 5px 0;"><strong>მოგებული ფასი:</strong> ${finalPrice} ₾</p>
              <p style="margin: 5px 0;"><strong>გადახდის ვადა:</strong> ${paymentDeadline.toLocaleDateString('ka-GE')} ${paymentDeadline.toLocaleTimeString('ka-GE', { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
            
            <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
              <h4 style="margin: 0 0 10px 0; color: #92400e;">⚠️ მნიშვნელოვანი ინფორმაცია:</h4>
              <ul style="margin: 0; padding-left: 20px; color: #92400e;">
                <li>თანხა უნდა ჩარიცხოთ 24 საათის განმავლობაში</li>
                <li>${deliveryText}</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin-top: 30px;">
              <a href="${process.env.ALLOWED_ORIGINS}/auctions" 
                 style="background: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                აუქციონზე გადასვლა
              </a>
            </div>
          </div>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="color: #999; font-size: 12px; text-align: center;">SoulArt Team</p>
        </div>
      `,
    };

    await this.transporter.sendMail(mailOptions);
  }

  // სელერისთვის აუქციონის დასრულების ნოტიფიკაცია
  async sendAuctionSellerNotification(
    email: string,
    auctionTitle: string,
    finalPrice: number,
    sellerEarnings: number,
    auctionImage?: string,
    deliveryType?: string, // 'SOULART' or 'ARTIST'
  ) {
    const commission = finalPrice - sellerEarnings;

    const imageSection = auctionImage
      ? `<div style="text-align: center; margin-bottom: 20px;">
           <img src="${auctionImage}" alt="${auctionTitle}" 
                style="max-width: 100%; max-height: 300px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
         </div>`
      : '';

    // მიტანის ტექსტი deliveryType-ის მიხედვით
    const deliveryText =
      deliveryType === 'ARTIST'
        ? 'გადახდის შემდეგ თქვენ თავად უნდა მიუტანოთ ნახატი მყიდველს'
        : 'დაგიკავშირდებით ნამუშევრის წასაღებად. ნამუშევრის ჩაბარებისთანავე აგესახებათ თანხა ბალანსზე გასატანად';

    const mailOptions = {
      from: emailConfig.from,
      to: email,
      subject: `🎯 თქვენი აუქციონი დასრულდა - ${auctionTitle}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>აუქციონი დასრულდა</title>
        </head>
        <body style="margin: 0; padding: 0; background: #f9f9f9;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #f9f9f9;">
          <tr>
            <td style="padding: 8px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
                <tr>
                  <td style="background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <h1 style="color: #3b82f6; text-align: center; margin: 0 0 20px 0; font-size: 22px;">🎯 აუქციონი დასრულდა</h1>
                    
                    ${imageSection}
                    
                    <p style="font-size: 15px; line-height: 1.5; color: #333; margin: 0 0 15px 0;">
                      თქვენი აუქციონი <strong>"${auctionTitle}"</strong> წარმატებით დასრულდა!
                    </p>
                    
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #f0f9ff; border-radius: 8px; margin: 15px 0;">
                      <tr>
                        <td style="padding: 15px;">
                          <h3 style="margin: 0 0 12px 0; color: #0369a1; font-size: 16px;">ფინანსური დეტალები:</h3>
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="padding: 8px 0; border-bottom: 1px solid #e0e7ff; font-size: 14px;">
                                <span style="color: #666;">საბოლოო ფასი:</span>
                              </td>
                              <td style="padding: 8px 0; border-bottom: 1px solid #e0e7ff; text-align: right; font-weight: bold; font-size: 14px;">${finalPrice} ₾</td>
                            </tr>
                            <tr>
                              <td style="padding: 8px 0; border-bottom: 1px solid #e0e7ff; font-size: 14px;">
                                <span style="color: #666;">საკომისიო:</span>
                              </td>
                              <td style="padding: 8px 0; border-bottom: 1px solid #e0e7ff; text-align: right; color: #dc2626; font-size: 14px;">-${commission} ₾</td>
                            </tr>
                            <tr>
                              <td style="padding: 10px 0 0 0; border-top: 2px solid #3b82f6; font-size: 14px;">
                                <span style="color: #3b82f6; font-weight: bold;">თქვენი შემოსავალი:</span>
                              </td>
                              <td style="padding: 10px 0 0 0; border-top: 2px solid #3b82f6; text-align: right; font-weight: bold; color: #16a34a; font-size: 16px;">${sellerEarnings} ₾</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                    
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #dcfce7; border-radius: 8px; border-left: 4px solid #16a34a; margin: 15px 0;">
                      <tr>
                        <td style="padding: 12px;">
                          <h4 style="margin: 0 0 8px 0; color: #166534; font-size: 14px;">✅ შემდეგი ნაბიჯები:</h4>
                          <ul style="margin: 0; padding-left: 18px; color: #166534; font-size: 13px;">
                            <li style="margin-bottom: 4px;">მყიდველმა უნდა ჩარიცხოს თანხა 24 საათის განმავლობაში</li>
                            <li style="margin-bottom: 4px;">${deliveryText}</li>
                            <li>შემოსავალი ბალანსზე ჩაირიცხება გადახდის დადასტურების შემდეგ</li>
                          </ul>
                        </td>
                      </tr>
                    </table>
                    
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="text-align: center; padding-top: 20px;">
                          <a href="${process.env.ALLOWED_ORIGINS}/profile/balance" 
                             style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-size: 14px;">
                            ბალანსის გვერდზე გადასვლა
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 20px 0; text-align: center;">
                    <p style="color: #999; font-size: 12px; margin: 0;">SoulArt Team</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        </body>
        </html>
      `,
    };

    await this.transporter.sendMail(mailOptions);
  }

  // აუქციონის ადმინისთვის შეტყობინება (მხოლოდ საკომისიო)
  async sendAuctionAdminNotification(
    email: string,
    auctionTitle: string,
    finalPrice: number,
    adminCommission: number,
    auctionImage?: string,
  ) {
    const imageSection = auctionImage
      ? `<div style="text-align: center; margin-bottom: 20px;">
           <img src="${auctionImage}" alt="${auctionTitle}" 
                style="max-width: 100%; max-height: 300px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
         </div>`
      : '';

    const mailOptions = {
      from: emailConfig.from,
      to: email,
      subject: `💰 აუქციონი დასრულდა - ${auctionTitle}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>აუქციონი დასრულდა</title>
        </head>
        <body style="margin: 0; padding: 0; background: #f9f9f9;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #f9f9f9;">
          <tr>
            <td style="padding: 8px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
                <tr>
                  <td style="background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <h1 style="color: #8b5cf6; text-align: center; margin: 0 0 20px 0; font-size: 22px;">💰 აუქციონი დასრულდა</h1>
                    
                    ${imageSection}
                    
                    <p style="font-size: 15px; line-height: 1.5; color: #333; margin: 0 0 15px 0;">
                      აუქციონი <strong>"${auctionTitle}"</strong> წარმატებით დასრულდა!
                    </p>
                    
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #f5f3ff; border-radius: 8px; margin: 15px 0;">
                      <tr>
                        <td style="padding: 15px;">
                          <h3 style="margin: 0 0 12px 0; color: #6d28d9; font-size: 16px;">თქვენი საკომისიო:</h3>
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="padding: 8px 0; border-bottom: 1px solid #ddd6fe; font-size: 14px;">
                                <span style="color: #666;">გაიყიდა:</span>
                              </td>
                              <td style="padding: 8px 0; border-bottom: 1px solid #ddd6fe; text-align: right; font-weight: bold; font-size: 14px;">${finalPrice} ₾</td>
                            </tr>
                            <tr>
                              <td style="padding: 10px 0 0 0; border-top: 2px solid #8b5cf6; font-size: 14px;">
                                <span style="color: #8b5cf6; font-weight: bold;">თქვენი საკომისიო:</span>
                              </td>
                              <td style="padding: 10px 0 0 0; border-top: 2px solid #8b5cf6; text-align: right; font-weight: bold; color: #16a34a; font-size: 16px;">${adminCommission} ₾</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                    
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #fef3c7; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 15px 0;">
                      <tr>
                        <td style="padding: 12px;">
                          <h4 style="margin: 0 0 8px 0; color: #92400e; font-size: 14px;">📌 მნიშვნელოვანი:</h4>
                          <p style="margin: 0; color: #92400e; font-size: 13px;">
                            თანხის გატანას შეძლებთ მას შემდეგ რაც მყიდველი ჩაიბარებს ნახატს.
                          </p>
                        </td>
                      </tr>
                    </table>
                    
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="text-align: center; padding-top: 20px;">
                          <a href="${process.env.ALLOWED_ORIGINS}/auction-admin" 
                             style="background: #8b5cf6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-size: 14px;">
                            აუქციონის პანელზე გადასვლა
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 20px 0; text-align: center;">
                    <p style="color: #999; font-size: 12px; margin: 0;">SoulArt Team</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        </body>
        </html>
      `,
    };

    await this.transporter.sendMail(mailOptions);
  }

  // მთავარი ადმინისთვის სრული ინფორმაცია
  async sendMainAdminAuctionNotification(
    email: string,
    auctionTitle: string,
    finalPrice: number,
    sellerEarnings: number,
    auctionAdminCommission: number,
    platformCommission: number,
    deliveryFee: number,
    deliveryType: string,
    auctionImage?: string,
    sellerName?: string,
    winnerName?: string,
  ) {
    const imageSection = auctionImage
      ? `<div style="text-align: center; margin-bottom: 20px;">
           <img src="${auctionImage}" alt="${auctionTitle}" 
                style="max-width: 100%; max-height: 300px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
         </div>`
      : '';

    // მიტანის ინფო მხოლოდ თუ SOULART მიტანისაა და აქვს მიტანის საფასური
    const deliverySection =
      deliveryType === 'SOULART' && deliveryFee > 0
        ? `<div style="border-bottom: 1px solid #e0e7ff; padding-bottom: 10px; margin-bottom: 10px;">
             <span style="color: #666;">მიტანის საფასური:</span>
             <span style="float: right; font-weight: bold;">${deliveryFee} ₾</span>
           </div>`
        : '';

    const mailOptions = {
      from: emailConfig.from,
      to: email,
      subject: `📊 აუქციონი დასრულდა - ${auctionTitle} - სრული ანგარიში`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>აუქციონის სრული ანგარიში</title>
        </head>
        <body style="margin: 0; padding: 0; background: #f9f9f9;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #f9f9f9;">
          <tr>
            <td style="padding: 8px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
                <tr>
                  <td style="background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <h1 style="color: #dc2626; text-align: center; margin: 0 0 20px 0; font-size: 22px;">📊 აუქციონის სრული ანგარიში</h1>
                    
                    ${imageSection}
                    
                    <p style="font-size: 15px; line-height: 1.5; color: #333; margin: 0 0 15px 0;">
                      აუქციონი <strong>"${auctionTitle}"</strong> წარმატებით დასრულდა!
                    </p>
                    
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #fef2f2; border-radius: 8px; margin: 15px 0;">
                      <tr>
                        <td style="padding: 15px;">
                          <h3 style="margin: 0 0 12px 0; color: #dc2626; font-size: 16px;">მონაწილეები:</h3>
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="padding: 8px 0; border-bottom: 1px solid #fecaca; font-size: 14px;">
                                <span style="color: #666;">გამყიდველი:</span>
                              </td>
                              <td style="padding: 8px 0; border-bottom: 1px solid #fecaca; text-align: right; font-weight: bold; font-size: 14px;">${sellerName || 'უცნობი'}</td>
                            </tr>
                            <tr>
                              <td style="padding: 8px 0; border-bottom: 1px solid #fecaca; font-size: 14px;">
                                <span style="color: #666;">გამარჯვებული:</span>
                              </td>
                              <td style="padding: 8px 0; border-bottom: 1px solid #fecaca; text-align: right; font-weight: bold; font-size: 14px;">${winnerName || 'უცნობი'}</td>
                            </tr>
                            <tr>
                              <td style="padding: 8px 0; font-size: 14px;">
                                <span style="color: #666;">მიტანის ტიპი:</span>
                              </td>
                              <td style="padding: 8px 0; text-align: right; font-weight: bold; font-size: 14px;">${deliveryType === 'SOULART' ? 'SoulArt მიტანა' : 'სელერის მიტანა'}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                    
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #f0f9ff; border-radius: 8px; margin: 15px 0;">
                      <tr>
                        <td style="padding: 15px;">
                          <h3 style="margin: 0 0 12px 0; color: #0369a1; font-size: 16px;">ფინანსური დეტალები:</h3>
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="padding: 8px 0; border-bottom: 1px solid #e0e7ff; font-size: 14px;">
                                <span style="color: #666;">საბოლოო ფასი:</span>
                              </td>
                              <td style="padding: 8px 0; border-bottom: 1px solid #e0e7ff; text-align: right; font-weight: bold; font-size: 14px;">${finalPrice} ₾</td>
                            </tr>
                            ${
                              deliveryType === 'SOULART' && deliveryFee > 0
                                ? `
                            <tr>
                              <td style="padding: 8px 0; border-bottom: 1px solid #e0e7ff; font-size: 14px;">
                                <span style="color: #666;">მიტანის საფასური:</span>
                              </td>
                              <td style="padding: 8px 0; border-bottom: 1px solid #e0e7ff; text-align: right; font-weight: bold; font-size: 14px;">${deliveryFee} ₾</td>
                            </tr>
                            `
                                : ''
                            }
                            <tr>
                              <td style="padding: 8px 0; border-bottom: 1px solid #e0e7ff; font-size: 14px;">
                                <span style="color: #666;">გამყიდველის შემოსავალი:</span>
                              </td>
                              <td style="padding: 8px 0; border-bottom: 1px solid #e0e7ff; text-align: right; font-weight: bold; font-size: 14px;">${sellerEarnings} ₾</td>
                            </tr>
                            <tr>
                              <td style="padding: 8px 0; border-bottom: 1px solid #e0e7ff; font-size: 14px;">
                                <span style="color: #666;">აუქციონის ადმინის საკომისიო:</span>
                              </td>
                              <td style="padding: 8px 0; border-bottom: 1px solid #e0e7ff; text-align: right; font-weight: bold; font-size: 14px;">${auctionAdminCommission} ₾</td>
                            </tr>
                            <tr>
                              <td style="padding: 10px 0 0 0; border-top: 2px solid #3b82f6; font-size: 14px;">
                                <span style="color: #3b82f6; font-weight: bold;">პლატფორმის საკომისიო:</span>
                              </td>
                              <td style="padding: 10px 0 0 0; border-top: 2px solid #3b82f6; text-align: right; font-weight: bold; color: #16a34a; font-size: 16px;">${platformCommission} ₾</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                    
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="text-align: center; padding-top: 20px;">
                          <a href="${process.env.ALLOWED_ORIGINS}/admin" 
                             style="background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-size: 14px;">
                            ადმინ პანელზე გადასვლა
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 20px 0; text-align: center;">
                    <p style="color: #999; font-size: 12px; margin: 0;">SoulArt Team</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        </body>
        </html>
      `,
    };

    await this.transporter.sendMail(mailOptions);
  }

  // გადახდის დადასტურების მეილი მყიდველს
  async sendAuctionPaymentConfirmationToBuyer(
    email: string,
    auctionTitle: string,
    artworkPrice: number,
    deliveryFee: number,
    totalPaid: number,
    deliveryType: string,
    auctionImage?: string,
  ) {
    const imageSection = auctionImage
      ? `<div style="text-align: center; margin-bottom: 20px;">
           <img src="${auctionImage}" alt="${auctionTitle}" 
                style="max-width: 100%; max-height: 300px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
         </div>`
      : '';

    const deliveryText =
      deliveryType === 'ARTIST'
        ? 'ხელოვანი თავად დაგიკავშირდებათ ნახატის მიტანასთან დაკავშირებით.'
        : 'ჩვენ დაგიკავშირდებით ნახატის მიტანის დეტალებზე.';

    const mailOptions = {
      from: emailConfig.from,
      to: email,
      subject: `✅ გადახდა წარმატებულია - ${auctionTitle}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>გადახდა დადასტურებულია</title>
        </head>
        <body style="margin: 0; padding: 0; background: #f9f9f9;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #f9f9f9;">
          <tr>
            <td style="padding: 8px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
                <tr>
                  <td style="background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <h1 style="color: #16a34a; text-align: center; margin: 0 0 20px 0; font-size: 22px;">✅ გადახდა წარმატებულია!</h1>
                    
                    ${imageSection}
                    
                    <p style="font-size: 15px; line-height: 1.5; color: #333; margin: 0 0 15px 0;">
                      თქვენი გადახდა ნახატზე <strong>"${auctionTitle}"</strong> წარმატებით დადასტურდა!
                    </p>
                    
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #f0f9ff; border-radius: 8px; margin: 15px 0;">
                      <tr>
                        <td style="padding: 15px;">
                          <h3 style="margin: 0 0 12px 0; color: #0369a1; font-size: 16px;">გადახდის დეტალები:</h3>
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="padding: 8px 0; border-bottom: 1px solid #e0e7ff; font-size: 14px;">
                                <span style="color: #666;">ნახატის ფასი:</span>
                              </td>
                              <td style="padding: 8px 0; border-bottom: 1px solid #e0e7ff; text-align: right; font-weight: bold; font-size: 14px;">${artworkPrice} ₾</td>
                            </tr>
                            ${
                              deliveryFee > 0
                                ? `
                            <tr>
                              <td style="padding: 8px 0; border-bottom: 1px solid #e0e7ff; font-size: 14px;">
                                <span style="color: #666;">მიტანის საფასური:</span>
                              </td>
                              <td style="padding: 8px 0; border-bottom: 1px solid #e0e7ff; text-align: right; font-weight: bold; font-size: 14px;">${deliveryFee} ₾</td>
                            </tr>
                            `
                                : ''
                            }
                            <tr>
                              <td style="padding: 10px 0 0 0; border-top: 2px solid #16a34a; font-size: 14px;">
                                <span style="color: #16a34a; font-weight: bold;">სულ გადახდილი:</span>
                              </td>
                              <td style="padding: 10px 0 0 0; border-top: 2px solid #16a34a; text-align: right; font-weight: bold; color: #16a34a; font-size: 16px;">${totalPaid} ₾</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                    
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #dcfce7; border-radius: 8px; border-left: 4px solid #16a34a; margin: 15px 0;">
                      <tr>
                        <td style="padding: 12px;">
                          <h4 style="margin: 0 0 8px 0; color: #166534; font-size: 14px;">📦 შემდეგი ნაბიჯი:</h4>
                          <p style="margin: 0; color: #166534; font-size: 13px;">
                            ${deliveryText} ნახატი ჩაბარდება თქვენს მითითებულ მისამართზე.
                          </p>
                        </td>
                      </tr>
                    </table>
                    
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="text-align: center; padding-top: 20px;">
                          <a href="${process.env.ALLOWED_ORIGINS}/profile/orders" 
                             style="background: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-size: 14px;">
                            ჩემი შეკვეთები
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 20px 0; text-align: center;">
                    <p style="color: #999; font-size: 12px; margin: 0;">SoulArt Team</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        </body>
        </html>
      `,
    };

    await this.transporter.sendMail(mailOptions);
  }

  // გადახდის დადასტურების მეილი გამყიდველს
  async sendAuctionPaymentConfirmationToSeller(
    email: string,
    auctionTitle: string,
    sellerEarnings: number,
    deliveryType: string,
    buyerName?: string,
    shippingAddress?: string,
    auctionImage?: string,
  ) {
    const imageSection = auctionImage
      ? `<div style="text-align: center; margin-bottom: 20px;">
           <img src="${auctionImage}" alt="${auctionTitle}" 
                style="max-width: 100%; max-height: 300px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
         </div>`
      : '';

    const deliveryText =
      deliveryType === 'ARTIST'
        ? 'თქვენ თავად უნდა მიუტანოთ ნახატი მყიდველს. მისამართი იხილეთ ქვემოთ.'
        : 'ჩვენ დაგიკავშირდებით ნამუშევრის წასაღებად. ნამუშევრის ჩაბარებისთანავე აგესახებათ თანხა ბალანსზე გასატანად.';

    const addressSection =
      deliveryType === 'ARTIST' && shippingAddress
        ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #fef3c7; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 15px 0;">
          <tr>
            <td style="padding: 12px;">
              <h4 style="margin: 0 0 8px 0; color: #92400e; font-size: 14px;">📍 მიტანის მისამართი:</h4>
              <p style="margin: 0; color: #92400e; font-size: 13px;">
                <strong>მყიდველი:</strong> ${buyerName || 'უცნობი'}<br/>
                <strong>მისამართი:</strong> ${shippingAddress}
              </p>
            </td>
          </tr>
        </table>`
        : '';

    const mailOptions = {
      from: emailConfig.from,
      to: email,
      subject: `💰 გადახდა დადასტურდა - ${auctionTitle}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>გადახდა დადასტურებულია</title>
        </head>
        <body style="margin: 0; padding: 0; background: #f9f9f9;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #f9f9f9;">
          <tr>
            <td style="padding: 8px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
                <tr>
                  <td style="background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <h1 style="color: #16a34a; text-align: center; margin: 0 0 20px 0; font-size: 22px;">💰 გადახდა დადასტურდა!</h1>
                    
                    ${imageSection}
                    
                    <p style="font-size: 15px; line-height: 1.5; color: #333; margin: 0 0 15px 0;">
                      მყიდველმა წარმატებით გადაიხადა ნახატზე <strong>"${auctionTitle}"</strong>!
                    </p>
                    
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #dcfce7; border-radius: 8px; margin: 15px 0;">
                      <tr>
                        <td style="padding: 15px; text-align: center;">
                          <p style="margin: 0 0 5px 0; color: #166534; font-size: 14px;">თქვენი შემოსავალი:</p>
                          <p style="margin: 0; color: #16a34a; font-size: 28px; font-weight: bold;">${sellerEarnings} ₾</p>
                        </td>
                      </tr>
                    </table>
                    
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #f0f9ff; border-radius: 8px; border-left: 4px solid #3b82f6; margin: 15px 0;">
                      <tr>
                        <td style="padding: 12px;">
                          <h4 style="margin: 0 0 8px 0; color: #0369a1; font-size: 14px;">📦 შემდეგი ნაბიჯი:</h4>
                          <p style="margin: 0; color: #0369a1; font-size: 13px;">
                            ${deliveryText}
                          </p>
                        </td>
                      </tr>
                    </table>
                    
                    ${addressSection}
                    
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="text-align: center; padding-top: 20px;">
                          <a href="${process.env.ALLOWED_ORIGINS}/profile/balance" 
                             style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-size: 14px;">
                            ბალანსის გვერდზე გადასვლა
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 20px 0; text-align: center;">
                    <p style="color: #999; font-size: 12px; margin: 0;">SoulArt Team</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        </body>
        </html>
      `,
    };

    await this.transporter.sendMail(mailOptions);
  }

  // გადახდის დადასტურების მეილი აუქციონის ადმინს
  async sendAuctionPaymentConfirmationToAdmin(
    email: string,
    auctionTitle: string,
    adminCommission: number,
    auctionImage?: string,
  ) {
    const imageSection = auctionImage
      ? `<div style="text-align: center; margin-bottom: 20px;">
           <img src="${auctionImage}" alt="${auctionTitle}" 
                style="max-width: 100%; max-height: 300px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
         </div>`
      : '';

    const mailOptions = {
      from: emailConfig.from,
      to: email,
      subject: `✅ გადახდა დადასტურდა - ${auctionTitle}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>გადახდა დადასტურებულია</title>
        </head>
        <body style="margin: 0; padding: 0; background: #f9f9f9;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #f9f9f9;">
          <tr>
            <td style="padding: 8px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
                <tr>
                  <td style="background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <h1 style="color: #16a34a; text-align: center; margin: 0 0 20px 0; font-size: 22px;">✅ გადახდა დადასტურდა!</h1>
                    
                    ${imageSection}
                    
                    <p style="font-size: 15px; line-height: 1.5; color: #333; margin: 0 0 15px 0;">
                      აუქციონზე <strong>"${auctionTitle}"</strong> გადახდა დადასტურდა!
                    </p>
                    
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #dcfce7; border-radius: 8px; margin: 15px 0;">
                      <tr>
                        <td style="padding: 15px; text-align: center;">
                          <p style="margin: 0 0 5px 0; color: #166534; font-size: 14px;">თქვენი საკომისიო:</p>
                          <p style="margin: 0; color: #16a34a; font-size: 28px; font-weight: bold;">${adminCommission} ₾</p>
                        </td>
                      </tr>
                    </table>
                    
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #fef3c7; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 15px 0;">
                      <tr>
                        <td style="padding: 12px;">
                          <p style="margin: 0; color: #92400e; font-size: 13px;">
                            📌 თანხის გატანას შეძლებთ მას შემდეგ რაც მყიდველი ჩაიბარებს ნახატს.
                          </p>
                        </td>
                      </tr>
                    </table>
                    
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="text-align: center; padding-top: 20px;">
                          <a href="${process.env.ALLOWED_ORIGINS}/auction-admin" 
                             style="background: #8b5cf6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-size: 14px;">
                            აუქციონის პანელზე გადასვლა
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 20px 0; text-align: center;">
                    <p style="color: #999; font-size: 12px; margin: 0;">SoulArt Team</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        </body>
        </html>
      `,
    };

    await this.transporter.sendMail(mailOptions);
  }

  // მოგებულმა არ გადაიხადა - ახალ მოგებულზე გადატანის მეილი (გამყიდველს და ადმინებს)
  async sendAuctionTransferNotification(
    email: string,
    auctionTitle: string,
    previousWinnerName: string,
    newWinnerName: string,
    newPrice: number,
    newSellerEarnings: number,
    paymentDeadline: Date,
    recipientType: 'seller' | 'auctionAdmin' | 'mainAdmin',
    auctionImage?: string,
    adminCommission?: number,
  ) {
    const imageSection = auctionImage
      ? `<div style="text-align: center; margin-bottom: 20px;">
           <img src="${auctionImage}" alt="${auctionTitle}" 
                style="max-width: 100%; max-height: 300px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
         </div>`
      : '';

    let title = '';
    let subtitle = '';
    let financialInfo = '';
    let buttonUrl = '';
    let buttonText = '';
    let headerColor = '';

    switch (recipientType) {
      case 'seller':
        title = '🔄 აუქციონის მოგებული შეიცვალა';
        subtitle = `წინა მოგებულმა <strong>${previousWinnerName}</strong> არ გადაიხადა 24 საათში. აუქციონი გადაეცა ახალ მოგებულს.`;
        financialInfo = `
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e0e7ff; font-size: 14px;">
                <span style="color: #666;">ახალი მოგებული:</span>
              </td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e0e7ff; text-align: right; font-weight: bold; font-size: 14px;">${newWinnerName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e0e7ff; font-size: 14px;">
                <span style="color: #666;">ახალი ფასი:</span>
              </td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e0e7ff; text-align: right; font-weight: bold; font-size: 14px;">${newPrice} ₾</td>
            </tr>
            <tr>
              <td style="padding: 10px 0 0 0; border-top: 2px solid #3b82f6; font-size: 14px;">
                <span style="color: #3b82f6; font-weight: bold;">თქვენი ახალი შემოსავალი:</span>
              </td>
              <td style="padding: 10px 0 0 0; border-top: 2px solid #3b82f6; text-align: right; font-weight: bold; color: #16a34a; font-size: 16px;">${newSellerEarnings} ₾</td>
            </tr>
          </table>`;
        buttonUrl = `${process.env.ALLOWED_ORIGINS}/profile/balance`;
        buttonText = 'ბალანსის გვერდზე გადასვლა';
        headerColor = '#3b82f6';
        break;
      case 'auctionAdmin':
        title = '🔄 აუქციონის მოგებული შეიცვალა';
        subtitle = `წინა მოგებულმა <strong>${previousWinnerName}</strong> არ გადაიხადა 24 საათში. აუქციონი გადაეცა ახალ მოგებულს.`;
        financialInfo = `
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #ddd6fe; font-size: 14px;">
                <span style="color: #666;">ახალი მოგებული:</span>
              </td>
              <td style="padding: 8px 0; border-bottom: 1px solid #ddd6fe; text-align: right; font-weight: bold; font-size: 14px;">${newWinnerName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #ddd6fe; font-size: 14px;">
                <span style="color: #666;">ახალი ფასი:</span>
              </td>
              <td style="padding: 8px 0; border-bottom: 1px solid #ddd6fe; text-align: right; font-weight: bold; font-size: 14px;">${newPrice} ₾</td>
            </tr>
            <tr>
              <td style="padding: 10px 0 0 0; border-top: 2px solid #8b5cf6; font-size: 14px;">
                <span style="color: #8b5cf6; font-weight: bold;">თქვენი ახალი საკომისიო:</span>
              </td>
              <td style="padding: 10px 0 0 0; border-top: 2px solid #8b5cf6; text-align: right; font-weight: bold; color: #16a34a; font-size: 16px;">${adminCommission || 0} ₾</td>
            </tr>
          </table>`;
        buttonUrl = `${process.env.ALLOWED_ORIGINS}/auction-admin`;
        buttonText = 'აუქციონის პანელზე გადასვლა';
        headerColor = '#8b5cf6';
        break;
      case 'mainAdmin':
        title = '🔄 აუქციონის მოგებული შეიცვალა';
        subtitle = `წინა მოგებულმა <strong>${previousWinnerName}</strong> არ გადაიხადა 24 საათში. აუქციონი გადაეცა ახალ მოგებულს.`;
        financialInfo = `
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #fecaca; font-size: 14px;">
                <span style="color: #666;">წინა მოგებული (არ გადაიხადა):</span>
              </td>
              <td style="padding: 8px 0; border-bottom: 1px solid #fecaca; text-align: right; font-weight: bold; color: #dc2626; font-size: 14px;">${previousWinnerName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #fecaca; font-size: 14px;">
                <span style="color: #666;">ახალი მოგებული:</span>
              </td>
              <td style="padding: 8px 0; border-bottom: 1px solid #fecaca; text-align: right; font-weight: bold; font-size: 14px;">${newWinnerName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #fecaca; font-size: 14px;">
                <span style="color: #666;">ახალი ფასი:</span>
              </td>
              <td style="padding: 8px 0; border-bottom: 1px solid #fecaca; text-align: right; font-weight: bold; font-size: 14px;">${newPrice} ₾</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-size: 14px;">
                <span style="color: #666;">გადახდის ვადა:</span>
              </td>
              <td style="padding: 8px 0; text-align: right; font-weight: bold; font-size: 14px;">${paymentDeadline.toLocaleDateString('ka-GE')} ${paymentDeadline.toLocaleTimeString('ka-GE', { hour: '2-digit', minute: '2-digit' })}</td>
            </tr>
          </table>`;
        buttonUrl = `${process.env.ALLOWED_ORIGINS}/admin`;
        buttonText = 'ადმინ პანელზე გადასვლა';
        headerColor = '#dc2626';
        break;
    }

    const mailOptions = {
      from: emailConfig.from,
      to: email,
      subject: `🔄 აუქციონის მოგებული შეიცვალა - ${auctionTitle}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>მოგებული შეიცვალა</title>
        </head>
        <body style="margin: 0; padding: 0; background: #f9f9f9;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #f9f9f9;">
          <tr>
            <td style="padding: 8px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
                <tr>
                  <td style="background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <h1 style="color: ${headerColor}; text-align: center; margin: 0 0 20px 0; font-size: 22px;">${title}</h1>
                    
                    ${imageSection}
                    
                    <p style="font-size: 15px; line-height: 1.5; color: #333; margin: 0 0 15px 0;">
                      აუქციონი: <strong>"${auctionTitle}"</strong>
                    </p>
                    <p style="font-size: 14px; line-height: 1.5; color: #666; margin: 0 0 15px 0;">
                      ${subtitle}
                    </p>
                    
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #f0f9ff; border-radius: 8px; margin: 15px 0;">
                      <tr>
                        <td style="padding: 15px;">
                          <h3 style="margin: 0 0 12px 0; color: #0369a1; font-size: 16px;">ახალი დეტალები:</h3>
                          ${financialInfo}
                        </td>
                      </tr>
                    </table>
                    
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #fef3c7; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 15px 0;">
                      <tr>
                        <td style="padding: 12px;">
                          <p style="margin: 0; color: #92400e; font-size: 13px;">
                            ⏱️ ახალ მოგებულს აქვს <strong>24 საათი</strong> გადახდისთვის.
                          </p>
                        </td>
                      </tr>
                    </table>
                    
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="text-align: center; padding-top: 20px;">
                          <a href="${buttonUrl}" 
                             style="background: ${headerColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-size: 14px;">
                            ${buttonText}
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 20px 0; text-align: center;">
                    <p style="color: #999; font-size: 12px; margin: 0;">SoulArt Team</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        </body>
        </html>
      `,
    };

    await this.transporter.sendMail(mailOptions);
  }

  // აუქციონი დასრულდა ბიდერების გარეშე ან ყველამ გადაუხდელობით
  async sendAuctionNoWinnerNotification(
    email: string,
    auctionTitle: string,
    reason: 'no_bids' | 'all_defaulted',
    recipientType: 'seller' | 'auctionAdmin' | 'mainAdmin',
    auctionImage?: string,
  ) {
    const imageSection = auctionImage
      ? `<div style="text-align: center; margin-bottom: 20px;">
           <img src="${auctionImage}" alt="${auctionTitle}" 
                style="max-width: 100%; max-height: 300px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
         </div>`
      : '';

    const reasonText =
      reason === 'no_bids'
        ? 'აუქციონზე არავინ მიიღო მონაწილეობა.'
        : 'ყველა მოგებულმა გადაუხდელობით დატოვა აუქციონი.';

    const buttonUrl =
      recipientType === 'seller'
        ? `${process.env.ALLOWED_ORIGINS}/profile`
        : recipientType === 'auctionAdmin'
          ? `${process.env.ALLOWED_ORIGINS}/auction-admin`
          : `${process.env.ALLOWED_ORIGINS}/admin`;

    const buttonText =
      recipientType === 'seller'
        ? 'პროფილზე გადასვლა'
        : recipientType === 'auctionAdmin'
          ? 'აუქციონის პანელზე გადასვლა'
          : 'ადმინ პანელზე გადასვლა';

    const mailOptions = {
      from: emailConfig.from,
      to: email,
      subject: `❌ აუქციონი დასრულდა უშედეგოდ - ${auctionTitle}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>აუქციონი დასრულდა უშედეგოდ</title>
        </head>
        <body style="margin: 0; padding: 0; background: #f9f9f9;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #f9f9f9;">
          <tr>
            <td style="padding: 8px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
                <tr>
                  <td style="background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <h1 style="color: #dc2626; text-align: center; margin: 0 0 20px 0; font-size: 22px;">❌ აუქციონი დასრულდა უშედეგოდ</h1>
                    
                    ${imageSection}
                    
                    <p style="font-size: 15px; line-height: 1.5; color: #333; margin: 0 0 15px 0;">
                      აუქციონი: <strong>"${auctionTitle}"</strong>
                    </p>
                    
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #fef2f2; border-radius: 8px; border-left: 4px solid #dc2626; margin: 15px 0;">
                      <tr>
                        <td style="padding: 12px;">
                          <p style="margin: 0; color: #991b1b; font-size: 14px;">
                            ${reasonText}
                          </p>
                        </td>
                      </tr>
                    </table>
                    
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #f0f9ff; border-radius: 8px; border-left: 4px solid #3b82f6; margin: 15px 0;">
                      <tr>
                        <td style="padding: 12px;">
                          <p style="margin: 0; color: #0369a1; font-size: 13px;">
                            💡 ${recipientType === 'seller' ? 'შეგიძლიათ აუქციონი თავიდან განათავსოთ.' : 'აუქციონი შეიძლება თავიდან დაინიშნოს.'}
                          </p>
                        </td>
                      </tr>
                    </table>
                    
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="text-align: center; padding-top: 20px;">
                          <a href="${buttonUrl}" 
                             style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-size: 14px;">
                            ${buttonText}
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 20px 0; text-align: center;">
                    <p style="color: #999; font-size: 12px; margin: 0;">SoulArt Team</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        </body>
        </html>
      `,
    };

    await this.transporter.sendMail(mailOptions);
  }

  /**
   * ვაუჩერის დადასტურება მყიდველისთვის (კოდი + QR + print ღილაკი)
   */
  async sendVoucherConfirmation(data: {
    to: string;
    customerName: string;
    voucherCode: string;
    amount: number;
    currency: string;
    orderDetailsUrl: string;
  }) {
    const { to, customerName, voucherCode, amount, currency, orderDetailsUrl } =
      data;

    const currencyLabel =
      currency === 'USD' ? `$${amount}` : `${amount} ${currency === 'EUR' ? '€' : '₾'}`;

    // QR code via Google Charts API (works in all email clients)
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(voucherCode)}&bgcolor=1a1a2e&color=ffffff&margin=8`;

    const mailOptions = {
      from: emailConfig.from,
      to,
      subject: `🎟 შენი SoulArt ვაუჩერი — ${currencyLabel}`,
      html: `
<!DOCTYPE html>
<html lang="ka">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
    @media only screen and (max-width: 600px) {
      .email-wrap { padding: 12px 8px !important; }
      .email-body { border-radius: 12px !important; }
      .email-header { padding: 22px 20px !important; }
      .email-header div:first-child { font-size: 22px !important; }
      .email-pad { padding-left: 16px !important; padding-right: 16px !important; }
      .card-inner { padding: 18px 16px 16px !important; }
      .card-amount { font-size: 38px !important; }
      .card-code-text { font-size: 14px !important; letter-spacing: 0.06em !important; }
      .qr-cell { display: block !important; width: 100% !important; text-align: center; padding-bottom: 12px; }
      .qr-spacer { display: none !important; }
      .code-cell { display: block !important; width: 100% !important; text-align: center; }
      .code-highlight { font-size: 20px !important; }
      .cta-btn { padding: 12px 24px !important; font-size: 14px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" class="email-wrap" style="background:#f3f4f6;padding:32px 16px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" class="email-body" style="max-width:600px;width:100%;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.10);">

      <!-- Header -->
      <tr>
        <td class="email-header" style="background:linear-gradient(135deg,#0f0c29 0%,#302b63 55%,#1a1060 100%);padding:28px 32px;text-align:center;">
          <div style="font-size:26px;font-weight:900;color:#fff;letter-spacing:0.06em;">SoulArt</div>
          <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.18em;color:rgba(255,255,255,0.5);margin-top:4px;">Gift Voucher · საჩუქრის ვაუჩერი</div>
        </td>
      </tr>

      <!-- Greeting -->
      <tr>
        <td class="email-pad" style="padding:24px 32px 0;">
          <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.7;">
            გამარჯობა, <strong style="color:#111827;">${customerName}</strong>! 🎉<br/>
            შენი გადახდა წარმატებით დადასტურდა.<br/>
            ქვემოთ მოცემულია შენი ვაუჩერი.
          </p>
        </td>
      </tr>

      <!-- Gift card -->
      <tr>
        <td class="email-pad" style="padding:0 32px 20px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(145deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%);border-radius:18px;overflow:hidden;">
            <tr>
              <td class="card-inner" style="padding:22px 24px 18px;">
                <!-- brand row -->
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="font-weight:900;font-size:18px;color:#fff;letter-spacing:0.04em;">SoulArt</td>
                    <td align="right" style="font-size:10px;text-transform:uppercase;letter-spacing:0.15em;color:rgba(255,255,255,0.4);">საჩუქრის ვაუჩერი</td>
                  </tr>
                </table>
                <!-- amount -->
                <div class="card-amount" style="font-size:48px;font-weight:900;color:#fff;line-height:1;margin:14px 0 16px;letter-spacing:-0.02em;">${currencyLabel}</div>
                <!-- divider -->
                <div style="border-top:1px solid rgba(255,255,255,0.12);margin-bottom:16px;"></div>
                <!-- QR + code row — stacks on mobile -->
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td class="qr-cell" width="108" valign="middle" style="padding-right:0;">
                      <img src="${qrUrl}" width="96" height="96" alt="QR" style="display:block;border-radius:8px;"/>
                    </td>
                    <td class="qr-spacer" width="14"></td>
                    <td class="code-cell" valign="middle">
                      <div class="card-code-text" style="font-family:'Courier New',monospace;font-size:17px;font-weight:700;letter-spacing:0.1em;color:#fff;background:rgba(255,255,255,0.1);border:1px dashed rgba(255,255,255,0.3);border-radius:8px;padding:9px 13px;display:inline-block;">${voucherCode}</div>
                      <div style="font-size:11px;color:rgba(255,255,255,0.38);margin-top:7px;">მოქმედი · 1 თვე · ერთჯერადი · soulart.ge</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Code highlight -->
      <tr>
        <td class="email-pad" style="padding:0 32px 16px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border:2px solid #86efac;border-radius:12px;">
            <tr>
              <td style="padding:14px 16px;text-align:center;">
                <div style="font-size:12px;font-weight:700;color:#15803d;margin-bottom:5px;">✅ ვაუჩერის კოდი</div>
                <div class="code-highlight" style="font-family:'Courier New',monospace;font-size:24px;font-weight:700;color:#111827;letter-spacing:0.14em;">${voucherCode}</div>
                <div style="font-size:11px;color:#6b7280;margin-top:5px;">შეინახე ეს კოდი — გამოიყენე checkout-ზე</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- How to use -->
      <tr>
        <td class="email-pad" style="padding:0 32px 20px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:12px;">
            <tr>
              <td style="padding:18px 20px;">
                <div style="font-size:14px;font-weight:700;color:#111827;margin-bottom:10px;">როგორ გამოვიყენო?</div>
                <div style="color:#374151;font-size:13px;line-height:2.0;">
                  1 · შედი soulart.ge-ზე და აირჩიე პროდუქტი<br/>
                  2 · გადადი შეკვეთის გვერდზე (Checkout)<br/>
                  3 · შეიყვანე კოდი <strong>${voucherCode}</strong> "ვაუჩერი" ველში<br/>
                  4 · ფასდაკლება ავტომატურად გამოიქვითება ✓
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- CTA -->
      <tr>
        <td class="email-pad" style="padding:0 32px 28px;text-align:center;">
          <a href="${orderDetailsUrl}" class="cta-btn"
            style="display:inline-block;background:linear-gradient(135deg,#0f0c29,#302b63);color:#fff;padding:13px 32px;border-radius:50px;text-decoration:none;font-weight:700;font-size:15px;letter-spacing:0.02em;">
            შეკვეთის ნახვა →
          </a>
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:16px 32px;text-align:center;">
          <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.8;">
            SoulArt Team · <a href="https://soulart.ge" style="color:#9ca3af;text-decoration:none;">soulart.ge</a><br/>
            ვაუჩერი მოქმედებს 1 თვე შეძენიდან. ერთჯერადი გამოყენება.
          </p>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>
      `,
    };

    await this.transporter.sendMail(mailOptions);
  }

  /**
   * ვაუჩერის შეძენის ადმინ-შეტყობინება
   */
  async sendVoucherAdminNotification(data: {
    voucherCode: string;
    amount: number;
    currency: string;
    buyerEmail: string;
    buyerName: string;
    orderId: string;
  }) {
    const { voucherCode, amount, currency, buyerEmail, buyerName, orderId } =
      data;
    const adminEmail =
      process.env.ADMIN_EMAIL ||
      emailConfig.from;
    const currencyLabel =
      currency === 'USD' ? `$${amount}` : `${amount} ${currency === 'EUR' ? '€' : '₾'}`;

    const mailOptions = {
      from: emailConfig.from,
      to: adminEmail,
      subject: `🎟 ვაუჩერი გაიყიდა: ${currencyLabel} — ${buyerEmail}`,
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 500px; margin: 0 auto; color: #111827;">
          <h2 style="color: #012645;">🎟 ახალი ვაუჩერი გაიყიდა</h2>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr><td style="padding: 6px 0; color: #6b7280; width: 140px;">კოდი:</td><td style="font-family: monospace; font-weight: 700; font-size: 16px; letter-spacing: 0.1em;">${voucherCode}</td></tr>
            <tr><td style="padding: 6px 0; color: #6b7280;">ნომინალი:</td><td><strong>${currencyLabel}</strong></td></tr>
            <tr><td style="padding: 6px 0; color: #6b7280;">მყიდველი:</td><td>${buyerName} (${buyerEmail})</td></tr>
            <tr><td style="padding: 6px 0; color: #6b7280;">შეკვეთის ID:</td><td>${orderId}</td></tr>
            <tr><td style="padding: 6px 0; color: #6b7280;">თარიღი:</td><td>${new Date().toLocaleString('ka-GE')}</td></tr>
          </table>
        </div>
      `,
    };

    await this.transporter.sendMail(mailOptions);
  }
}
