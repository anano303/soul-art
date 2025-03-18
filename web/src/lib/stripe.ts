import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  console.log("Stripe API key is missing, skipping Stripe payment process");
  throw new Error("Stripe API key is not provided");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
