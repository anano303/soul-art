export const emailConfig = {
  host: 'smtp.gmail.com',
  port: 465, // ⚠️ 465 = SSL, 587 = TLS
  secure: true, // ✅ true SSL-თვის (465), false TLS-თვის (587)
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  from: process.env.EMAIL_FROM || 'no-reply@example.com',
  tls: {
    rejectUnauthorized: false, // ✅ სერტიფიკატის გადამოწმების გამორთვა
  },
};
