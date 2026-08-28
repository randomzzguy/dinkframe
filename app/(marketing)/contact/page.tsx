import Link from "next/link";
import { SimplePage } from "@/components/marketing/simple-page";
import { getAppLoginUrl } from "@/lib/auth/urls";

export default function ContactPage() {
  const loginUrl = getAppLoginUrl();

  return (
    <SimplePage eyebrow="Contact" title="LET'S FRAME YOUR NEXT TOURNAMENT.">
      <p>
        Ready to order? Start in the secure order app. For quick questions,
        reach DINKFRAME through Instagram or WhatsApp.
      </p>
      <p>
        <Link
          href={loginUrl}
          className="text-primary font-bold underline underline-offset-4"
        >
          Start an order
        </Link>{" "}
        ·{" "}
        <Link
          href="https://instagram.com/dinkframe"
          className="text-primary font-bold underline underline-offset-4"
        >
          Instagram
        </Link>
      </p>
    </SimplePage>
  );
}
