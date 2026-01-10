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
  private transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: emailConfig.host, // ✅ `service` არ არის საჭირო
      port: emailConfig.port,
      secure: emailConfig.secure,
      auth: {
        user: emailConfig.auth.user,
        pass: emailConfig.auth.pass,
      },
      tls: {
        rejectUnauthorized: false, // ✅ სერტიფიკატის გადამოწმების გამორთვა
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
  ) {
    const itemsList = orderItems
      .map((item) => `<li>${item.name} x ${item.quantity}</li>`)
      .join('');

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
}
