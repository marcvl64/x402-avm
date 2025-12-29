import Link from "next/link";
import {
  QuestionMarkCircleIcon,
  ArrowDownTrayIcon,
  BriefcaseIcon,
} from "@heroicons/react/24/outline";
import GithubIcon from "../assets/github.svg";
// import DiscordIcon from "../assets/discord.svg";
import LogoIcon from "../assets/logo.svg";
import AlgoIcon from "../assets/algorand-logomark-white-RGB.svg";

const NavBar = () => {
  return (
    <section className="max-w-6xl mx-auto px-4 pt-4 relative z-20">
      <div className="flex gap-4 md:gap-8 justify-between sm:justify-end">
        <Link
          href="https://goplausible.com"
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono hover:text-blue-400 transition-colors flex items-center gap-1 text-sm"
        >
          <LogoIcon className="w-4 h-4 mr-1" />
          GoPlausible
        </Link>
        <Link
          href="/x402.pdf"
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono hover:text-blue-400 transition-colors flex items-center gap-1 text-sm"
        >
          <ArrowDownTrayIcon className="w-4 h-4 mr-1" />
          One-pager
        </Link>
        {/* <Link
          href="/x402_brand_kit.zip"
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono hover:text-blue-400 transition-colors flex items-center gap-1 text-sm"
        >
          <BriefcaseIcon className="w-4 h-4 mr-1" />
          Brand kit
        </Link> */}
        <Link
          href="https://github.com/GoPlausible"
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono hover:text-blue-400 transition-colors flex items-center gap-2 text-sm"
        >
          <GithubIcon className="w-4 h-4 mr-1" fill="currentColor" />
          GitHub
        </Link>
        <Link
          href="https://algorand.co"
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono hover:text-blue-400 transition-colors flex items-center gap-2 text-sm"
        >
          <AlgoIcon className="w-10 h-10 mr-1" />
          Algorand
        </Link>
      </div>
    </section>
  );
};

export default NavBar;
