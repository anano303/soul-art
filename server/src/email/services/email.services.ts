import { emailConfig } from '@/email.config';
import { Injectable } from '@nestjs/common';

import * as nodemailer from 'nodemailer';

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
   * სელერისთვის balance withdrawal notification
   */
  async sendWithdrawalNotification(
    to: string,
    sellerName: string,
    amount: number,
    transactionId: string,
    accountNumber: string,
  ) {
    const mailOptions = {
      from: emailConfig.from,
      to,
      subject: 'თანხის გადარიცხვა - SoulArt',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #012645;">მოგესალმებით ${sellerName}!</h2>
          
          <p>წარმატებით გადაირიცხა თანხა თქვენს ბანკის ანგარიშზე:</p>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #012645; margin-top: 0;">გადარიცხვის დეტალები:</h3>
            <p><strong>თანხა:</strong> ${amount.toFixed(2)} ₾</p>
            <p><strong>ანგარიშის ნომერი:</strong> ${accountNumber}</p>
            <p><strong>ტრანზაქციის ID:</strong> ${transactionId}</p>
            <p><strong>თარიღი:</strong> ${new Date().toLocaleDateString('ka-GE')}</p>
          </div>
          
          <p>თანხა 1-3 საბანკო დღეში გამოჩნდება თქვენს ანგარიშზე.</p>
          
          <p style="color: #666; font-size: 14px;">
            შენარჩუნებული შემოსავლების ისტორია შეგიძლიათ ნახოთ 
            <a href="${process.env.ALLOWED_ORIGINS}/profile/balance" style="color: #012645;">ჩემი ბალანსი</a> გვერდზე.
          </p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="color: #999; font-size: 12px;">SoulArt Team</p>
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
          <h2 style="color: #012645;">მოგესალმებით ${sellerName}!</h2>
          
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
            <a href="${process.env.ALLOWED_ORIGINS}/profile/balance" style="color: #012645;">ჩემი ბალანსი</a> გვერდზე.
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
          <h2 style="color: #012645;">ახალი თანხის გადარიცხვა</h2>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #012645; margin-top: 0;">სელერის ინფორმაცია:</h3>
            <p><strong>სახელი:</strong> ${sellerName}</p>
            <p><strong>ელ-ფოსტა:</strong> ${sellerEmail}</p>
            <p><strong>თანხა:</strong> ${amount.toFixed(2)} ₾</p>
            <p><strong>ტრანზაქციის ID:</strong> ${transactionId}</p>
            <p><strong>თარიღი:</strong> ${new Date().toLocaleDateString('ka-GE')}</p>
          </div>
          
          <p>თანხა წარმატებით გადაირიცხა სელერის ანგარიშზე BOG-ის API-ით.</p>
          
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
  async sendOrderConfirmation(
    to: string,
    customerName: string,
    orderId: string,
    orderItems: any[],
    totalPrice: number,
    shippingAddress: string,
  ) {
    const itemsList = orderItems
      .map(
        (item) =>
          `<li>${item.name} x ${item.quantity} - ${(item.price * item.quantity).toFixed(2)} ₾</li>`,
      )
      .join('');

    const mailOptions = {
      from: emailConfig.from,
      to,
      subject: `შეკვეთის დადასტურება #${orderId} - SoulArt`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #012645;">მადლობა შეკვეთისთვის, ${customerName}!</h2>
          
          <p>თქვენი შეკვეთა წარმატებით დადასტურდა და დამუშავების პროცესშია.</p>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #012645; margin-top: 0;">შეკვეთის დეტალები:</h3>
            <p><strong>შეკვეთის ნომერი:</strong> #${orderId}</p>
            <p><strong>სრული ღირებულება:</strong> ${totalPrice.toFixed(2)} ₾</p>
            <p><strong>მიტანის მისამართი:</strong> ${shippingAddress}</p>
            
            <h4 style="color: #012645;">შეკვეთილი პროდუქტები:</h4>
            <ul style="list-style-type: none; padding: 0;">
              ${itemsList}
            </ul>
          </div>
          
          <p>შეკვეთის სტატუსი შეგიძლიათ ნახოთ თქვენს 
            <a href="${process.env.ALLOWED_ORIGINS}/profile/orders" style="color: #012645;">პირად კაბინეტში</a>.
          </p>
          
          <p style="color: #666; font-size: 14px;">
            თუ გაქვთ რაიმე კითხვა, მოგვწერეთ ელ-ფოსტაზე ან დაგვიკავშირდით საიტზე.
          </p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="color: #999; font-size: 12px;">SoulArt Team</p>
        </div>
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
    orderId: string,
    customerName: string,
    orderItems: any[],
    totalAmount: number,
  ) {
    const itemsList = orderItems
      .map(
        (item) =>
          `<li>${item.name} x ${item.quantity} - ${(item.price * item.quantity).toFixed(2)} ₾</li>`,
      )
      .join('');

    const mailOptions = {
      from: emailConfig.from,
      to,
      subject: `ახალი შეკვეთა #${orderId} - SoulArt`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #012645;">მოგესალმებით ${sellerName}!</h2>
          
          <p>თქვენს პროდუქცია/პროდუქტები შეიძინეს!</p>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #012645; margin-top: 0;">შეკვეთის ინფორმაცია:</h3>
            <p><strong>შეკვეთის ნომერი:</strong> #${orderId}</p>
            <p><strong>მყიდველი:</strong> ${customerName}</p>
            <p><strong>თქვენი შემოსავალი:</strong> ${totalAmount.toFixed(2)} ₾</p>
            
            <h4 style="color: #012645;">შეძენილი პროდუქტები:</h4>
            <ul style="list-style-type: none; padding: 0;">
              ${itemsList}
            </ul>
          </div>
          
          <p>მიტანის შემდეგ თანხა ავტომატურად ჩაირიცხება თქვენს ბალანსზე.</p>
          
          <p style="color: #666; font-size: 14px;">
            შეკვეთების მენეჯმენტი და ბალანსი ხელმისაწვდომია 
            <a href="${process.env.ALLOWED_ORIGINS}/profile/balance" style="color: #012645;">თქვენს პირად კაბინეტში</a>.
          </p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="color: #999; font-size: 12px;">SoulArt Team</p>
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
  ) {
    const itemsList = orderItems
      .map((item) => `<li>${item.name} x ${item.quantity}</li>`)
      .join('');

    const mailOptions = {
      from: emailConfig.from,
      to,
      subject: `შეკვეთა მიტანილია #${orderId} - SoulArt`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #012645;">მადლობა ${customerName}!</h2>
          
          <p>თქვენი შეკვეთა წარმატებით მიტანილია.</p>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #012645; margin-top: 0;">მიტანილი პროდუქტები:</h3>
            <p><strong>შეკვეთის ნომერი:</strong> #${orderId}</p>
            
            <ul style="list-style-type: none; padding: 0;">
              ${itemsList}
            </ul>
          </div>
          
          <p>იმედს გამოვთქვამთ, რომ თქვენ ღირსეული ხარისხის პროდუქტები მიიღეთ!</p>
          
          <p style="color: #666; font-size: 14px;">
            გთხოვთ, შეაფასოთ პროდუქტები თქვენს 
            <a href="${process.env.ALLOWED_ORIGINS}/profile/orders" style="color: #012645;">პირად კაბინეტში</a>
            და გაუზიაროთ თქვენი გამოცდილება სხვა მყიდველებს.
          </p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="color: #999; font-size: 12px;">SoulArt Team</p>
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
              გმადლობთ SoulArt-ზე თანამშრომლობისთვის!
            </p>
            
            <div style="text-align: center; margin-top: 30px;">
              <a href="${process.env.ALLOWED_ORIGINS}/seller/balance" 
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
              <a href="${process.env.ALLOWED_ORIGINS}/seller/balance" 
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
}
