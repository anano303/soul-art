"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useEffect } from "react";
import * as z from "zod";
import { useCheckout } from "../context/checkout-context";
import { apiClient } from "@/lib/axios";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/LanguageContext";
import { FaPaypal } from "react-icons/fa";
// import { CreditCard } from "lucide-react";
import "./payment-form.css";

const formSchema = z.object({
  paymentMethod: z.enum(["PayPal", "Stripe", "BOG"], {
    required_error: "Please select a payment method.",
  }),
});

export function PaymentForm() {
  const { setPaymentMethod, paymentMethod: currentPaymentMethod } =
    useCheckout();
  const { toast } = useToast();
  const { t } = useLanguage();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      paymentMethod:
        (currentPaymentMethod as "PayPal" | "Stripe" | "BOG") || "BOG",
    },
  });

  const watchedPaymentMethod = form.watch("paymentMethod");

  useEffect(() => {
    // Save initial value if not already set
    if (!currentPaymentMethod && watchedPaymentMethod) {
      form.handleSubmit(onSubmit)();
    }
  }, []);

  useEffect(() => {
    if (watchedPaymentMethod && watchedPaymentMethod !== currentPaymentMethod) {
      form.handleSubmit(onSubmit)();
    }
  }, [watchedPaymentMethod]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const response = await apiClient.post("/cart/payment", {
        paymentMethod: values.paymentMethod,
      });
      const paymentMethod = response.data;
      console.log(paymentMethod);
      setPaymentMethod(paymentMethod);
      toast({
        title: t("checkout.shippingSaved"),
        description: t("checkout.shippingDetailsSaved"),
      });
    } catch (error) {
      console.log(error);
      toast({
        title: t("checkout.errorSavingShipping"),
        description: t("checkout.tryAgain"),
        variant: "destructive",
      });
    }
  }

  return (
    <div className="card p-6">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">
            {t("checkout.steps.payment")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("checkout.stepIndicators.payment.description")}
          </p>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="form-item">
            <label className="form-label">{t("checkout.steps.payment")}</label>
            <div className="form-control">
              <div className="grid grid-cols-1 gap-4">
                {/* PayPal Option - Temporarily Commented */}
                {/* <div className="form-item">
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
                        {...form.register("paymentMethod")}
                      />
                      <div className="flex flex-col items-center space-y-2">
                        <FaPaypal className="h-6 w-6" />
                        <span className="text-sm font-medium">PayPal</span>
                      </div>
                    </label>
                  </div>
                </div> */}

                {/* Stripe Option - Temporarily Commented */}
                {/* <div className="form-item">
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
                        {...form.register("paymentMethod")}
                      />
                      <div className="flex flex-col items-center space-y-2">
                        <CreditCard className="h-6 w-6" />
                        <span className="text-sm font-medium">Card</span>
                      </div>
                    </label>
                  </div>
                </div> */}
                <div className="form-item">
                  <div className="form-control">
                    <label
                      htmlFor="BOG"
                      className="border rounded-lg p-4 cursor-pointer hover:border-primary [&:has(:checked)]:border-primary [&:has(:checked)]:bg-gradient-to-r [&:has(:checked)]:from-red-600 [&:has(:checked)]:to-pink-600 [&:has(:checked)]:text-white block transition-all duration-300"
                      style={{
                        fontFamily: "FiraGo, serif",
                      }}
                    >
                      <input
                        type="radio"
                        value="BOG"
                        id="BOG"
                        className="sr-only"
                        {...form.register("paymentMethod")}
                      />
                      <div className="flex flex-col items-center space-y-2">
                        <svg
                          className="h-6 w-6"
                          viewBox="0 0 24 24"
                          fill="green"
                          width={20}
                          height={20}
                        >
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                        </svg>
                        <span className="text-sm font-medium">
                          {t("checkout.continueToPayment")}
                        </span>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
