import crypto from "crypto";

const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET || "";

interface SignedRequestPayload {
  user_id: string;
  algorithm: string;
  issued_at: number;
}

function parseSignedRequest(
  signedRequest: string
): SignedRequestPayload | null {
  const [encodedSig, payload] = signedRequest.split(".");

  if (!encodedSig || !payload) {
    return null;
  }

  // Decode the signature
  const sig = Buffer.from(
    encodedSig.replace(/-/g, "+").replace(/_/g, "/"),
    "base64"
  );

  // Decode the payload
  const data = JSON.parse(
    Buffer.from(
      payload.replace(/-/g, "+").replace(/_/g, "/"),
      "base64"
    ).toString("utf8")
  ) as SignedRequestPayload;

  if (data.algorithm?.toUpperCase() !== "HMAC-SHA256") {
    console.error("Unknown algorithm:", data.algorithm);
    return null;
  }

  // Verify the signature
  const expectedSig = crypto
    .createHmac("sha256", FACEBOOK_APP_SECRET)
    .update(payload)
    .digest();

  if (!crypto.timingSafeEqual(sig, expectedSig)) {
    console.error("Invalid signature");
    return null;
  }

  return data;
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const signedRequest = formData.get("signed_request") as string;

    if (!signedRequest) {
      return new Response(
        JSON.stringify({ error: "Missing signed_request" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const data = parseSignedRequest(signedRequest);

    if (!data) {
      return new Response(
        JSON.stringify({ error: "Invalid signed_request" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const userId = data.user_id;

    // Generate a unique confirmation code
    const confirmationCode = crypto.randomBytes(16).toString("hex");

    // Store the deletion request (you can use a database in production)
    // For now, we'll make a request to the backend API to handle the deletion
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/v1";
    
    try {
      // Request user data deletion from the backend
      await fetch(`${apiUrl}/users/facebook-deletion`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Use an internal API key for server-to-server communication
          "X-Internal-Key": process.env.INTERNAL_API_KEY || "",
        },
        body: JSON.stringify({
          facebookUserId: userId,
          confirmationCode,
          requestedAt: new Date().toISOString(),
        }),
      });
    } catch (error) {
      console.error("Failed to notify backend of deletion request:", error);
      // Continue anyway - we'll log the request
    }

    // Log the deletion request for compliance
    console.log(
      `[Facebook Data Deletion] User ID: ${userId}, Confirmation: ${confirmationCode}, Time: ${new Date().toISOString()}`
    );

    // Return the response Facebook expects
    const clientUrl =
      process.env.NEXT_PUBLIC_CLIENT_URL || "https://soulart.ge";
    const statusUrl = `${clientUrl}/data-deletion-status?code=${confirmationCode}`;

    return new Response(
      JSON.stringify({
        url: statusUrl,
        confirmation_code: confirmationCode,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Facebook data deletion error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
