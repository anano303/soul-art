import nodemailer from "nodemailer";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { name, phone, email, question, productName, productId } =
      await req.json();

    if (!name || !phone) {
      return NextResponse.json(
        { success: false, message: "Name and phone are required" },
        { status: 400 }
      );
    }

    // Nodemailer transporter
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    const now = new Date().toLocaleString("ka-GE", {
      timeZone: "Asia/Tbilisi",
    });

    // ადმინისტრატორის მეილზე გაგზავნა
    const adminEmail = process.env.CALL_REQUEST_EMAIL || process.env.EMAIL_USER;

    const isProductRequest = !!productName;
    const subject = isProductRequest
      ? `🛍️ პროდუქტის შესახებ მოთხოვნა - ${productName}`
      : `🔔 ზარის მოთხოვნა - ${name}`;
    const headerTitle = isProductRequest
      ? "🛍️ პროდუქტის შესახებ მოთხოვნა"
      : "📞 ახალი ზარის მოთხოვნა";
    const headerSubtitle = isProductRequest
      ? `SoulArt - მომხმარებელს აინტერესებს პროდუქტი`
      : "SoulArt - მომხმარებელს ესაჭიროება დახმარება";

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: adminEmail,
      subject,
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 500px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
          <div style="background: linear-gradient(135deg, ${isProductRequest ? "#1e3a5f, #2563eb" : "#065f46, #059669"}); padding: 24px; text-align: center;">
            <h2 style="color: white; margin: 0; font-size: 20px;">${headerTitle}</h2>
            <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0; font-size: 14px;">${headerSubtitle}</p>
          </div>
          <div style="padding: 24px;">
            <table style="width: 100%; border-collapse: collapse;">
              ${
                isProductRequest
                  ? `<tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280; font-size: 14px; width: 120px;">პროდუქტი</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; font-weight: 600; font-size: 15px;">
                  <a href="https://soulart.ge/products/${productId}" style="color: #2563eb; text-decoration: none;">${productName}</a>
                </td>
              </tr>`
                  : ""
              }
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280; font-size: 14px; width: 120px;">სახელი, გვარი</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; font-weight: 600; font-size: 15px;">${name}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280; font-size: 14px;">ტელეფონი</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; font-weight: 600; font-size: 15px;">
                  <a href="tel:${phone}" style="color: #059669; text-decoration: none;">${phone}</a>
                </td>
              </tr>
              ${
                email
                  ? `<tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280; font-size: 14px;">ელ. ფოსტა</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; font-weight: 600; font-size: 15px;">
                  <a href="mailto:${email}" style="color: #059669; text-decoration: none;">${email}</a>
                </td>
              </tr>`
                  : ""
              }
              ${
                question
                  ? `<tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280; font-size: 14px;">შეკითხვა</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; font-size: 15px; line-height: 1.5;">${question}</td>
              </tr>`
                  : ""
              }
              <tr>
                <td style="padding: 10px 0; color: #6b7280; font-size: 14px;">დრო</td>
                <td style="padding: 10px 0; font-size: 14px; color: #9ca3af;">${now}</td>
              </tr>
            </table>
          </div>
          <div style="background: #f9fafb; padding: 16px; text-align: center;">
            <p style="margin: 0; font-size: 12px; color: #9ca3af;">ეს შეტყობინება ავტომატურად გამოიგზავნა soulart.ge-დან</p>
          </div>
        </div>
      `,
    });

    console.log(
      `[CallRequest] Sent for ${name} - ${phone}${isProductRequest ? ` (Product: ${productName})` : ""}`
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[CallRequest] Error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to send request" },
      { status: 500 }
    );
  }
}
