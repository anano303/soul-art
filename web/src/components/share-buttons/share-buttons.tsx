import { useState } from "react";
import { Copy, Share2, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/LanguageContext";
import {
  FacebookShareButton,
  TelegramShareButton,
  TwitterShareButton,
  ViberShareButton,
  WhatsappShareButton,
  LinkedinShareButton,
  EmailShareButton,
  FacebookIcon,
  TelegramIcon,
  TwitterIcon,
  ViberIcon,
  WhatsappIcon,
  LinkedinIcon,
  EmailIcon,
} from "react-share";
import "./share-buttons.css";

interface ShareButtonsProps {
  url: string;
  title: string;
  isOriginal?: boolean;
  materials?: string[];
  dimensions?: {
    width?: number;
    height?: number;
    depth?: number;
  };
}

export function ShareButtons({
  url,
  title,
  isOriginal,
  materials,
  dimensions,
}: ShareButtonsProps) {
  const { t, language } = useLanguage();
  const [showMore, setShowMore] = useState(false);
  const [copied, setCopied] = useState(false);

  const buildShareDescription = () => {
    const parts: string[] = [title];

    if (isOriginal !== undefined) {
      const originalText =
        language === "en"
          ? isOriginal
            ? "✅ Original artwork"
            : "🖼️ Print"
          : isOriginal
          ? "✅ ორიგინალი"
          : "🖼️ ასლი";
      parts.push(originalText);
    }

    if (materials && materials.length > 0) {
      const materialsText =
        language === "en"
          ? `🎨 ${materials.slice(0, 2).join(", ")}`
          : `🎨 ${materials.slice(0, 2).join(", ")}`;
      parts.push(materialsText);
    }

    if (dimensions) {
      const { width, height, depth } = dimensions;
      let dimText = "";
      if (width && height) {
        dimText = depth
          ? `📏 ${width}×${height}×${depth} cm`
          : `📏 ${width}×${height} cm`;
      } else if (width) {
        dimText = `📏 ${width} cm`;
      } else if (height) {
        dimText = `📏 ${height} cm`;
      }
      if (dimText) parts.push(dimText);
    }

    return parts.join("\n");
  };

  const shareDescription = buildShareDescription();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast({
        title: t("share.copiedSuccess"),
        description: t("share.linkCopied"),
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.log(error);
      toast({
        variant: "destructive",
        title: t("share.error"),
        description: t("share.copyFailed"),
      });
    }
  };

  const mainButtons = [
    {
      Button: FacebookShareButton,
      Icon: FacebookIcon,
      label: "Facebook",
      props: {
        url: url,
        quote: shareDescription,
        hashtag: "#SoulArt",
      },
    },
    {
      Button: TwitterShareButton,
      Icon: TwitterIcon,
      label: "Twitter",
      props: {
        url: url,
        title: shareDescription,
        hashtags: ["SoulArt", "Art"],
      },
    },
  ];

  const moreButtons = [
    {
      Button: TelegramShareButton,
      Icon: TelegramIcon,
      label: "Telegram",
      props: {
        url: url,
        title: shareDescription,
      },
    },
    {
      Button: WhatsappShareButton,
      Icon: WhatsappIcon,
      label: "WhatsApp",
      props: {
        url: url,
        title: shareDescription,
      },
    },
    {
      Button: LinkedinShareButton,
      Icon: LinkedinIcon,
      label: "LinkedIn",
      props: {
        url: url,
        title: shareDescription,
      },
    },
    {
      Button: EmailShareButton,
      Icon: EmailIcon,
      label: "Email",
      props: {
        url: url,
        subject: title,
        body: shareDescription,
      },
    },
    {
      Button: ViberShareButton,
      Icon: ViberIcon,
      label: "Viber",
      props: {
        url: url,
        title: shareDescription,
      },
    },
  ];

  return (
    <div className="share-container">
      <div className="share-buttons">
        <button
          onClick={handleCopy}
          className="share-button copy"
          title={t("share.copyLink")}
        >
          {copied ? (
            <span className="copied-message">{t("share.copied")}</span>
          ) : (
            <Copy size={20} />
          )}
        </button>

        {mainButtons.map(({ Button, Icon, label, props }) => (
          <Button key={label} {...props} className="share-button">
            <Icon size={36} round />
          </Button>
        ))}

        <button
          className="share-button more"
          onClick={() => setShowMore(!showMore)}
          title={showMore ? t("share.showLess") : t("share.showMore")}
        >
          {showMore ? <X size={20} /> : <Share2 size={20} />}
        </button>
      </div>

      {showMore && (
        <div className="social-menu">
          {moreButtons.map(({ Button, Icon, label, props }) => (
            <Button key={label} {...props} className="share-button">
              <Icon size={36} round />
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
