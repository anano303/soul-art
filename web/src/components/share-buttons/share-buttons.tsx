import { useState } from 'react';
import { Copy, Share2, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import {
  FacebookShareButton,
  // FacebookMessengerShareButton, // Commented out messenger
  TelegramShareButton,
  TwitterShareButton,
  ViberShareButton,
  WhatsappShareButton,
  LinkedinShareButton,
  EmailShareButton,
  FacebookIcon,
  // FacebookMessengerIcon, // Commented out messenger icon
  TelegramIcon,
  TwitterIcon,
  ViberIcon,
  WhatsappIcon,
  LinkedinIcon,
  EmailIcon,
} from 'react-share';
import './share-buttons.css';

interface ShareButtonsProps {
  url: string;
  title: string;
}

export function ShareButtons({ url, title }: ShareButtonsProps) {
  const [showMore, setShowMore] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast({
        title: "წარმატებით დაკოპირდა!",
        description: "ბმული დაკოპირებულია",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
        console.log(error)
      toast({
        variant: "destructive",
        title: "შეცდომა",
        description: "ბმულის დაკოპირება ვერ მოხერხდა",
      });
    }
  };

  const mainButtons = [
    {
      Button: FacebookShareButton,
      Icon: FacebookIcon,
      label: 'Facebook',
      props: {
        url: url,
        quote: title,
        hashtag: '#SoulArt',
        appId: process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || '',
      }
    },
    /* Removed Messenger button
    {
      Button: FacebookMessengerShareButton,
      Icon: FacebookMessengerIcon,
      label: 'Messenger',
      props: {
        url: url,
        appId: process.env.NEXT_PUBLIC_FACEBOOK_APP_ID,
        redirectUri: url,
      }
    },
    */
    {
      Button: TwitterShareButton,
      Icon: TwitterIcon,
      label: 'Twitter',
      props: {
        url: url,
        title: title,
        hashtags: ['SoulArt', 'Art']
      }
    },
  ];

  const moreButtons = [
    {
      Button: TelegramShareButton,
      Icon: TelegramIcon,
      label: 'Telegram',
      props: {
        url: url,
        title: title
      }
    },
    {
      Button: WhatsappShareButton,
      Icon: WhatsappIcon,
      label: 'WhatsApp',
      props: {
        url: url,
        title: title
      }
    },
    {
      Button: LinkedinShareButton,
      Icon: LinkedinIcon,
      label: 'LinkedIn',
      props: {
        url: url,
        title: title
      }
    },
    {
      Button: EmailShareButton,
      Icon: EmailIcon,
      label: 'Email',
      props: {
        url: url,
        subject: title
      }
    },
    {
      Button: ViberShareButton,
      Icon: ViberIcon,
      label: 'Viber',
      props: {
        url: url,
        title: title
      }
    },
  ];

  return (
    <div className="share-container">
      <div className="share-buttons">
        <button 
          onClick={handleCopy}
          className="share-button copy"
          title="Copy Link"
        >
          {copied ? (
            <span className="copied-message">Copied!</span>
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
          title={showMore ? "Show less" : "Show more"}
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
