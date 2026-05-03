import nodemailer from "nodemailer";
import { database } from "@/database/database";

// Verification code generation function
const generateVerificationCode = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

const EXPIRATION = +(process.env.EXPIRATION || 60000);

export async function POST(req: Request) {
  const { email } = await req.json();
  // Validate email format
  if (!email || !/\S+@\S+\.\S+/.test(email)) {
    console.log("Invalid email address:", req.body);
    return new Response(
      JSON.stringify({ success: false, message: "Invalid email address" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Check if email already registered
  try {
    const apiUrl =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/v1";
    const checkRes = await fetch(`${apiUrl}/auth/check-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (checkRes.ok) {
      const checkData = await checkRes.json();
      if (checkData.exists) {
        return new Response(
          JSON.stringify({
            success: false,
            code: "EMAIL_EXISTS",
            message: "ეს ელფოსტა უკვე რეგისტრირებულია. გთხოვთ გაიაროთ ავტორიზაცია.",
          }),
          { status: 409, headers: { "Content-Type": "application/json" } }
        );
      }
    }
  } catch (err) {
    console.error("Email existence check failed:", err);
    // Continue with sending verification — don't block if check fails
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
