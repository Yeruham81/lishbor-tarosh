import { MessageCircle, Facebook, Twitter, Share2, Copy, Check, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface Props {
  text: string;
  url?: string;
  title?: string;
}

export function ShareButtons({ text, url, title = "לשבור ת'ראש" }: Props) {
  const [copied, setCopied] = useState(false);

  const shareUrl = url ?? (typeof window !== "undefined" ? window.location.origin : "");

  const fullText = url ? `${text}\n${url}` : `${text}\n${shareUrl}`;
  const enc = encodeURIComponent;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      toast.success("הקישור הועתק ללוח 📋");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("העתקה נכשלה");
    }
  };

  const native = async () => {
    const nav: any = typeof navigator !== "undefined" ? navigator : null;

    if (nav && typeof nav.share === "function") {
      try {
        await nav.share({
          title,
          text,
          url: shareUrl,
        });
        return;
      } catch (e: any) {
        if (e?.name !== "AbortError") {
          toast.error("שיתוף נכשל");
        }
      }
    } else {
      toast.info("הדפדפן אינו תומך בשיתוף ישיר");
    }
  };

  const links = [
    {
      label: "WhatsApp",
      icon: <MessageCircle className="size-4" />,
      href: `https://wa.me/?text=${enc(fullText)}`,
      cls: "bg-[#25D366] text-white",
    },
    {
      label: "Telegram",
      icon: <Send className="size-4" />,
      href: `https://t.me/share/url?url=${enc(shareUrl)}&text=${enc(text)}`,
      cls: "bg-[#0088cc] text-white",
    },
    {
      label: "Facebook",
      icon: <Facebook className="size-4" />,
      href: `https://www.facebook.com/sharer/sharer.php?u=${enc(shareUrl)}&quote=${enc(text)}`,
      cls: "bg-[#1877F2] text-white",
    },
    {
      label: "X",
      icon: <Twitter className="size-4" />,
      href: `https://twitter.com/intent/tweet?text=${enc(fullText)}`,
      cls: "bg-foreground text-background",
    },
  ];

  return (
    <div className="flex flex-wrap sm:flex-nowrap gap-2 justify-center">
      {/* Native share */}
      <button
        onClick={native}
        className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-2 rounded-xl bg-gradient-sunset text-white text-sm font-semibold shadow-glow hover:opacity-90 transition"
      >
        <Share2 className="size-4" />
        <span className="hidden sm:inline">שיתוף</span>
      </button>

      {/* Social links */}
      {links.map((l) => (
        <a
          key={l.label}
          href={l.href}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-2 rounded-xl text-sm font-semibold hover:opacity-90 transition ${l.cls}`}
        >
          {l.icon}
          <span className="hidden sm:inline">{l.label}</span>
        </a>
      ))}

      {/* Copy */}
      <button
        onClick={copy}
        className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-2 rounded-xl border bg-card text-sm hover:bg-muted transition"
      >
        {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
        <span className="hidden sm:inline">העתקה</span>
      </button>
    </div>
  );
}
