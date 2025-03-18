import dotenv from "dotenv";
import { database } from "@/database/database";
dotenv.config();

export async function POST(req: Request) {
  const { code, email } = await req.json();

  if (!email || !/\S+@\S+\.\S+/.test(email)) {
    console.log("Invalid email address:", req.body);
    return new Response(
      JSON.stringify({ success: false, message: "Invalid email address" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const verificationEntry = database.getEntry(email);

  if (!verificationEntry) {
    return new Response(
      JSON.stringify({ success: false, message: "Email not found" }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }

  if (verificationEntry.expiration < Date.now()) {
    return new Response(
      JSON.stringify({ success: false, message: "Verification code expired" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  if (verificationEntry.code !== code) {
    return new Response(
      JSON.stringify({ success: false, message: "Invalid verification code" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
