const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
require('dotenv').config();

async function sendVoucherEmails() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: { rejectUnauthorized: false },
  });

  // Find paid voucher orders that have a code but haven't emailed yet
  const orderIds = ['69f5bfb85e03108d1a07417d', '69f5c1214c2055b2849858b4'];

  for (const id of orderIds) {
    const order = await mongoose.connection.collection('orders').findOne({
      _id: new mongoose.Types.ObjectId(id),
    });

    if (!order) { console.log(`Order ${id} not found`); continue; }
    if (!order.issuedVoucherCode) { console.log(`Order ${id} has no voucher code`); continue; }

    // Get user email
    const user = await mongoose.connection.collection('users').findOne({ _id: order.user });
    if (!user?.email) { console.log(`No email for order ${id}`); continue; }

    const buyerName = (user.ownerFirstName
      ? `${user.ownerFirstName} ${user.ownerLastName || ''}`.trim()
      : user.name) || 'მყიდველი';

    const amount = order.issuedVoucherAmount;
    const currency = order.issuedVoucherCurrency;
    const voucherCode = order.issuedVoucherCode;
    const currencyLabel = currency === 'USD' ? `$${amount}` : `${amount} ${currency === 'EUR' ? '€' : '₾'}`;
    const baseUrl = (process.env.ALLOWED_ORIGINS || 'https://soulart.ge').split(',')[0].trim();
    const orderDetailsUrl = `${baseUrl}/orders/${order._id}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(voucherCode)}&bgcolor=1a1a2e&color=ffffff&margin=8`;

    const html = `
<!DOCTYPE html>
<html lang="ka">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.10);">
      <tr>
        <td style="background:linear-gradient(135deg,#0f0c29 0%,#302b63 55%,#1a1060 100%);padding:28px 32px;text-align:center;">
          <div style="font-size:26px;font-weight:900;color:#fff;letter-spacing:0.06em;">SoulArt</div>
          <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.22em;color:rgba(255,255,255,0.5);margin-top:4px;">Gift Voucher · საჩუქრის ვაუჩერი</div>
        </td>
      </tr>
      <tr>
        <td style="padding:28px 32px 0;">
          <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.6;">
            გამარჯობა, <strong style="color:#111827;">${buyerName}</strong>!<br/>
            შენი გადახდა წარმატებით დადასტურდა. 🎉<br/>
            ქვემოთ მოცემულია შენი სრულად მზა ვაუჩერი.
          </p>
        </td>
      </tr>
      <tr>
        <td style="padding:0 32px 24px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(145deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%);border-radius:20px;overflow:hidden;">
            <tr>
              <td style="padding:24px 28px 20px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="font-weight:900;font-size:20px;color:#fff;letter-spacing:0.04em;">SoulArt</td>
                    <td align="right" style="font-size:10px;text-transform:uppercase;letter-spacing:0.18em;color:rgba(255,255,255,0.45);">საჩუქრის ვაუჩერი</td>
                  </tr>
                </table>
                <div style="font-size:52px;font-weight:900;color:#fff;line-height:1;margin:18px 0 20px;letter-spacing:-0.02em;">${currencyLabel}</div>
                <div style="border-top:1px solid rgba(255,255,255,0.12);margin-bottom:18px;"></div>
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td width="110" valign="middle">
                      <img src="${qrUrl}" width="100" height="100" alt="QR" style="display:block;border-radius:10px;"/>
                    </td>
                    <td width="16"></td>
                    <td valign="middle">
                      <div style="font-family:'Courier New',monospace;font-size:19px;font-weight:700;letter-spacing:0.12em;color:#fff;background:rgba(255,255,255,0.1);border:1px dashed rgba(255,255,255,0.35);border-radius:10px;padding:10px 14px;display:inline-block;">${voucherCode}</div>
                      <div style="font-size:11px;color:rgba(255,255,255,0.4);margin-top:8px;">მოქმედი · 1 თვე · ერთჯერადი · soulart.ge</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:0 32px 20px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border:2px solid #86efac;border-radius:12px;">
            <tr>
              <td style="padding:16px 20px;text-align:center;">
                <div style="font-size:12px;font-weight:700;color:#15803d;margin-bottom:6px;">✅ ვაუჩერის კოდი</div>
                <div style="font-family:'Courier New',monospace;font-size:26px;font-weight:700;color:#111827;letter-spacing:0.14em;">${voucherCode}</div>
                <div style="font-size:12px;color:#6b7280;margin-top:6px;">შეინახე ეს კოდი — გამოიყენე checkout-ზე</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:0 32px 24px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:12px;">
            <tr>
              <td style="padding:20px 24px;">
                <div style="font-size:15px;font-weight:700;color:#111827;margin-bottom:12px;">როგორ გამოვიყენო?</div>
                <div style="color:#374151;font-size:14px;line-height:2.0;">
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
      <tr>
        <td style="padding:0 32px 32px;text-align:center;">
          <a href="${orderDetailsUrl}" style="display:inline-block;background:linear-gradient(135deg,#0f0c29,#302b63);color:#fff;padding:14px 36px;border-radius:50px;text-decoration:none;font-weight:700;font-size:15px;letter-spacing:0.02em;">შეკვეთის დეტალების ნახვა →</a>
        </td>
      </tr>
      <tr>
        <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:18px 32px;text-align:center;">
          <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.8;">SoulArt Team · soulart.ge<br/>ვაუჩერი მოქმედებს 1 თვე შეძენიდან. ერთჯერადი გამოყენება.</p>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body>
</html>
    `;

    try {
      await transporter.sendMail({
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: user.email,
        subject: `🎟 შენი SoulArt ვაუჩერი - ${currencyLabel}`,
        html,
      });
      console.log(`✅ Email sent to ${user.email} for order ${id} — code: ${voucherCode}`);
    } catch (err) {
      console.error(`❌ Failed to send email for order ${id}:`, err.message);
    }
  }

  await mongoose.disconnect();
  console.log('Done');
}

sendVoucherEmails().catch(console.error);
