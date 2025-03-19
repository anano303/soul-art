import nodemailer from "nodemailer";
import dotenv from "dotenv";
import { database } from "@/database/database";
dotenv.config();

// Verification code generation function
const generateVerificationCode = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

const EXPIRATION = +(process.env.EXPIRATION || 60000);

export async function POST(req: Request) {
  const { email } = await req.json();
  console.log("EMAIL_USER:", process.env.EMAIL_USER); // Log email username
  console.log("EMAIL_PASS:", process.env.EMAIL_PASS); // Log email password
  // Validate email format
  if (!email || !/\S+@\S+\.\S+/.test(email)) {
    console.log("Invalid email address:", req.body);
    return new Response(
      JSON.stringify({ success: false, message: "Invalid email address" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const verificationCode = generateVerificationCode();

  // Nodemailer transporter setup
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER, // Your email (e.g., "your-email@gmail.com")
      pass: process.env.EMAIL_PASS, // Your email password or App password
    },
    tls: {
      rejectUnauthorized: false, // disable certificate validation (use with caution)
    },
  });
  transporter.verify(function (error) {
    if (error) {
      console.error("Transporter verification failed:", error);
    } else {
      console.log("Server is ready to send emails");
    }
  });

  // Log the email details for debugging purposes
  // Never log your actual email password

  const mailOptions = {
    // from: process.env.EMAIL_USER,
    from: `"SoulArt" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Your Verification Code",
    text: `Your verification code is: ${verificationCode}`,
  };

  try {
    await database.addEntry({
      email,
      code: verificationCode,
      expiration: Date.now() + EXPIRATION,
    });
    // Send the email
    await transporter.sendMail(mailOptions);
    // Respond with a success message and verification code
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    // Log the error and return failure response
    if (error instanceof Error) {
      console.error("Error sending email:", error.message);
      return new Response(
        JSON.stringify({
          success: false,
          message: "Failed to send email",
          error: error.message,
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    } else {
      console.error("Unknown error:", error);
      return new Response(
        JSON.stringify({ success: false, message: "Failed to send email" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }
}
