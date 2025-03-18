"use client";

import { ToolInvocation } from "ai";
import { motion } from "framer-motion";
import { BotIcon, UserIcon } from "lucide-react";
import { ReactNode } from "react";
import { ProductInfo } from "./tools/product-info";
import { ProductImages } from "./tools/product-images";
import { BrandAssets } from "./tools/brand-assets";
import { ValidationResult } from "./tools/validation-result";
import "./message.css"; // უბრალოდ იმპორტირებულია, მაგრამ `styles.X` აღარ გამოიყენება

interface MessageProps {
  role: string;
  content: string | ReactNode;
  toolInvocations?: Array<ToolInvocation>;
}

export function Message({ role, content, toolInvocations }: MessageProps) {
  return (
    <motion.div className="messageContainer">
      <div className="iconContainer">
        {role === "assistant" ? <BotIcon /> : <UserIcon />}
      </div>

      <div className="messageContent">
        {content && typeof content === "string" && (
          <div className="markdownText">{content}</div>
        )}

        {toolInvocations && (
          <div className="toolContainer">
            {toolInvocations.map((toolInvocation) => {
              const { toolName, toolCallId, state } = toolInvocation;

              if (state === "result") {
                const { result } = toolInvocation;

                return (
                  <div key={toolCallId}>
                    {toolName === "generateBasicInfo" ? (
                      <ProductInfo productInfo={result} />
                    ) : toolName === "handleApproval" ? (
                      result.productInfo ? (
                        <ProductInfo productInfo={result.productInfo} />
                      ) : null
                    ) : toolName === "generateProductImages" ? (
                      <ProductImages images={result.images} />
                    ) : toolName === "generateBrandAssets" ? (
                      <BrandAssets brandLogo={result.brandLogo} />
                    ) : toolName === "validateProduct" ? (
                      <ValidationResult {...result} />
                    ) : (
                      <pre className="preContainer">
                        {JSON.stringify(result, null, 2)}
                      </pre>
                    )}
                  </div>
                );
              } else {
                return (
                  <div key={toolCallId} className="pulse">
                    {toolName === "generateBasicInfo" ? (
                      <ProductInfo />
                    ) : toolName === "generateProductImages" ? (
                      <ProductImages />
                    ) : toolName === "generateBrandAssets" ? (
                      <BrandAssets />
                    ) : toolName === "validateProduct" ? (
                      <ValidationResult
                        isValid={false}
                        missingFields={[]}
                        suggestions={[]}
                        marketFitScore={0}
                        pricingFeedback={""}
                      />
                    ) : null}
                  </div>
                );
              }
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}
