"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useCheckout } from "../context/checkout-context";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import { FaPaypal } from "react-icons/fa";
import { CreditCard } from "lucide-react";
import "./payment-form.css";

const formSchema = z.object({
  paymentMethod: z.enum(["PayPal", "Stripe"], {
    required_error: "Please select a payment method.",
  }),
});

export function PaymentForm() {
  const { setPaymentMethod } = useCheckout();
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      paymentMethod: "PayPal",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const response = await apiClient.post("/cart/payment", {
        paymentMethod: values.paymentMethod,
      });
      const paymentMethod = response.data;
      console.log(paymentMethod);
      setPaymentMethod(paymentMethod);
      router.push("/checkout/review");
    } catch (error) {
      console.log(error);
      toast({
        title: "Error saving payment method",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  }

  return (
    <div className="card p-6">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Payment Method</h1>
          <p className="text-sm text-muted-foreground">
            Choose how you would like to pay
          </p>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="form-item">
            <label className="form-label">Payment Method</label>
            <div className="form-control">
              <div className="grid grid-cols-2 gap-4">
                <div className="form-item">
                  <div className="form-control">
                    <label
                      htmlFor="PayPal"
                      className="border rounded-lg p-4 cursor-pointer hover:border-primary [&:has(:checked)]:border-primary block"
                    >
                      <input
                        type="radio"
                        value="PayPal"
                        id="PayPal"
                        className="sr-only"
                        onChange={form.register("paymentMethod").onChange}
                      />
                      <div className="flex flex-col items-center space-y-2">
                        <FaPaypal className="h-6 w-6" />
                        <span className="text-sm font-medium">PayPal</span>
                      </div>
                    </label>
                  </div>
                </div>
                <div className="form-item">
                  <div className="form-control">
                    <label
                      htmlFor="Stripe"
                      className="border rounded-lg p-4 cursor-pointer hover:border-primary [&:has(:checked)]:border-primary block"
                    >
                      <input
                        type="radio"
                        value="Stripe"
                        id="Stripe"
                        className="sr-only"
                        onChange={form.register("paymentMethod").onChange}
                      />
                      <div className="flex flex-col items-center space-y-2">
                        <CreditCard className="h-6 w-6" />
                        <span className="text-sm font-medium">Card</span>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <button type="submit" className="w-full btn btn-primary">
            Continue to Review
          </button>
        </form>
      </div>
    </div>
  );
}
