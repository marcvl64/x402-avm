import Link from "next/link";
import Image from "next/image";
import {
  BoltIcon,
  CloudIcon,
  MusicalNoteIcon,
  CheckIcon,
  DocumentTextIcon,
  ArrowDownTrayIcon,
  QuestionMarkCircleIcon,
  CodeBracketIcon,
  BookOpenIcon,
  BriefcaseIcon,
  Squares2X2Icon,
} from "@heroicons/react/24/outline";

import { FeatureItem } from "./components/FeatureItem";
import GithubIcon from "./assets/github.svg";
import DiscordIcon from "./assets/discord.svg";
import LogoIcon from "./assets/logo.svg";
import AlgoIcon from "./assets/algorand-logomark-white-RGB.svg";
import { Section } from "./components/Section";
import { BackgroundVideo } from "./components/BackgroundVideo";
import NavBar from "./components/NavBar";

const whatIsItFeatures = [
  {
    title: "No fees",
    description: "x402 as a protocol has 0 fees for either the customer or the merchant.",
    icon: <CheckIcon className="w-5 h-5 text-indigo-400" />,
  },
  {
    title: "Instant settlement",
    description:
      "Accept payments at the speed of the blockchain. Money in your wallet in 2 seconds, not T+2.",
    icon: <CheckIcon className="w-5 h-5 text-indigo-400" />,
  },
  {
    title: "Blockchain Agnostic",
    description:
      "x402 is not tied to any specific blockchain or token, its a neutral standard open to integration by all.",
    icon: <CheckIcon className="w-5 h-5 text-indigo-400" />,
  },
  {
    title: "Frictionless",
    description:
      "As little as 1 line of middleware code or configuration in your existing web server stack and you can start accepting payments. Customers and agents aren't required to create an account or provide any personal information.",
    icon: <CheckIcon className="w-5 h-5 text-indigo-400" />,
  },

  {
    title: "Security & trust via an open standard",
    description:
      "Anyone can implement or extend x402. It's not tied to any centralized provider, and encourages broad community participation.",
    icon: <CheckIcon className="w-5 h-5 text-indigo-400" />,
  },
  {
    title: "Web native",
    description:
      "Activates the dormant 402 HTTP status code and works with any HTTP stack. It works simply via headers and status codes on your existing HTTP server.",
    icon: <CheckIcon className="w-5 h-5 text-indigo-400" />,
  },
];
const whyItMattersFeatures = [
  {
    title: "AI Agents",
    description: "Agents can use the x402 Protocol to pay for API requests in real-time.",
    icon: <BoltIcon className="w-5 h-5 text-indigo-400" />,
  },
  {
    title: "Cloud Storage Providers",
    description:
      "Using x402, customers can easily access storage services without account creation.",
    icon: <CloudIcon className="w-5 h-5 text-indigo-400" />,
  },
  {
    title: "Content Creators",
    description: "x402 unlocks instant transactions, enabling true micropayments for content.",
    icon: <MusicalNoteIcon className="w-5 h-5 text-indigo-400" />,
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-800 to-black text-white relative overflow-hidden">
      {/* Video Background */}
      <div className="fixed w-full z-0">
        <div className="fixed w-full bg-gradient-to-t from-black" />
        <BackgroundVideo src="/banner.mp4" />
      </div>

      <div className="relative z-10">
        {/* Top nav */}
        <NavBar />
        {/* Hero Section */}
        <section className="max-w-6xl mx-auto px-4 py-20 lg:py-28">
          <div className="text-center">
            <div className="mb-6 flex items-center justify-center gap-4">
              <Image
                src="/x402-logo.png"
                alt="x402 logo"
                width={320}
                height={160}
                className="inline-block"
              />
              <Image
                src="/algorand-logomark-white-RGB.png"
                alt="Algorand logo"
                width={100}
                height={100}
                className="inline-block"
              />
            </div>

            <p className="text-xl text-gray-400 mb-8 font-mono">
              x402 internet-native protocol for Algorand Blockchain
            </p>
            <div className="flex flex-wrap gap-4 mb-6 justify-center">
              <Link
                href="/protected"
                className="px-6 py-4 bg-blue-600 hover:bg-blue-700 rounded-lg font-mono transition-colors flex items-center gap-2 text-lg"
              >
                <CodeBracketIcon className="w-5 h-5 mr-1" />
                Live Demo Instance (TestNet)
              </Link>
            </div>
            <div className="flex flex-wrap gap-4 mb-8 justify-center">
              <Link
                href="/x402-whitepaper.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-3 border-2 border-transparent hover:border-blue-600 rounded-lg font-mono transition-colors flex items-center gap-2 text-sm"
              >
                <DocumentTextIcon className="w-5 h-5 mr-1" />
                Read x402 whitepaper
              </Link>
              <Link
                href="https://x402.gitbook.io/x402"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-3 border-2 border-transparent hover:border-blue-600 rounded-lg font-mono transition-colors flex items-center gap-2 text-sm"
              >
                <BookOpenIcon className="w-5 h-5 mr-1" />
                Read x402 docs
              </Link>
              <Link
                href="https://github.com/GoPlausible/.github/blob/main/profile/algorand-x402-guide/README.md"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-3 border-2 border-transparent hover:border-blue-600 rounded-lg font-mono transition-colors flex items-center gap-2 text-sm"
              >
                <AlgoIcon className="w-10 h-10 mr-1" />
                Read Algorand x402 docs
              </Link>
              <Link
                href="/ecosystem"
                target="_self"
                rel="noopener noreferrer"
                className="px-4 py-3 border-2 border-transparent hover:border-blue-600 rounded-lg font-mono transition-colors flex items-center gap-2 text-sm"
              >
                <Squares2X2Icon className="w-5 h-5 mr-1" />
                Algorand x402 Ecosystem
              </Link>
            </div>
          </div>
        </section>

        <Section>
          {/* What is it? */}
          <div className="relative">
            <div className="flex items-center justify-center gap-4 mb-6">
              <h3 className="text-3xl font-bold text-blue-400 text-center">
                The best way to accept digital payments on Web 3.0
              </h3>
            </div>
            <div className="bg-gray-800/30 rounded-2xl p-8 backdrop-blur-2xl border border-gray-700/50">
              <p className="text-gray-300 leading-relaxed text-xl mb-8">
                Built by Coinbase around the{" "}
                <Link
                  href="https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/402"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-500"
                >
                  HTTP 402
                </Link>{" "}
                status code,{" "}
                <span className="font-bold">
                  x402 protocol enables users to pay for resources via API
                </span>{" "}
                without registration, emails, OAuth, or complex signatures. Algorand support is
                provided by Algorand Foundation & GoPlausible.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10 text-gray-400">
                {whatIsItFeatures.map((feature, index) => (
                  <FeatureItem key={index} {...feature} />
                ))}
              </div>
            </div>
          </div>
        </Section>

        <Section>
          {/* Why it matters */}
          <div className="relative">
            <div className="bg-gray-800/30 rounded-2xl p-8  backdrop-blur-xl border border-gray-700/50">
              <div className="flex items-center gap-4 mb-6">
                <h3 className="text-3xl font-bold text-indigo-400">
                  Powering Next-Gen Digital Commerce on Algorand and other blockchains
                </h3>
              </div>
              <p className="text-gray-300 leading-relaxed text-xl mb-8">
                <span className="font-bold">x402 unlocks new monetization models,</span> offering
                developers and content creators a frictionless way to earn revenue from small
                transactions without forcing subscriptions or showing ads.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {whyItMattersFeatures.map((feature, index) => (
                  <FeatureItem key={index} {...feature} iconBgColor="bg-indigo-500/10" />
                ))}
              </div>
            </div>
          </div>
        </Section>

        <Section>
          {/* How it works */}

          <div className="relative">
            <div className="bg-gray-800/30 rounded-2xl p-8 backdrop-blur-xl border border-gray-700/50">
              <div className="flex items-center gap-4 mb-6">
                <h3 className="text-3xl font-bold text-indigo-400">The x402 flow:</h3>
              </div>
              <p className="text-gray-300 leading-relaxed text-lg">
                x402 allows any web developer to accept crypto payments without the complexity of
                having to interact with the blockchain.
              </p>
              <br />

              <p className="text-gray-300 leading-relaxed text-lg mb-8">
                For a payment requiring endpoint or resource (URL) if a request arrives without
                payment, the server responds with HTTP 402, prompting the client that payment is
                required, accompanied by payment requirements information.
              </p>
              <div className="mb-8">
                <div className="bg-black/50 rounded-lg p-4 font-mono text-sm text-gray-300 relative overflow-hidden">
                  <pre className="syntax-highlight">
                    <span className="text-purple-400">HTTP</span>
                    <span className="text-gray-300">/1.1 </span>
                    <span className="text-amber-300">402</span>
                    <span className="text-gray-300"> Payment Required</span>
                  </pre>
                </div>
              </div>
              <p className="text-gray-300 leading-relaxed text-lg mb-8">
                Then client generates and sends a payment transaction to the specified address with
                the required amount on the Algorand blockchain and sends it in a pyement group to
                server.
              </p>
              <p className="text-gray-300 leading-relaxed text-lg mb-8">
                Server then sends the payment group to a facilitator to verify the payment and then
                settle it on Algorand blockchain and signals back the server with results.
              </p>
              <p className="text-gray-300 leading-relaxed text-lg mb-8">
                Finally server validates the payment results and if successful serves the original
                request with a 200 OK response along with the requested resource.
              </p>
              <div className="mb-8">
                <div className="bg-black/50 rounded-lg p-4 font-mono text-sm text-gray-300 relative overflow-hidden">
                  <pre className="syntax-highlight">
                    <span className="text-purple-400">HTTP</span>
                    <span className="text-gray-300">/1.1 </span>
                    <span className="text-amber-300">200</span>
                    <span className="text-gray-300"> OK</span>
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </Section>
        <Section>
          {/* Packages and links */}
          <div className="relative">
            <div className="bg-gray-800/30 rounded-2xl p-8 backdrop-blur-xl border border-gray-700/50">
              <div className="flex items-center gap-4 mb-6">
                <h3 className="text-3xl font-bold text-indigo-400">x402 Algorand Resources</h3>
              </div>
              <p className="text-gray-300 leading-relaxed text-xl mb-6">
                x402 Algorand PR, Spec and Repository:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-black/50 rounded-lg p-4">
                  <a
                    href="https://github.com/GoPlausible/.github/blob/main/profile/algorand-x402-guide/scheme_exact_avm.md"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 font-bold block mb-2"
                  >
                    x402 Algorand Exact Spec
                  </a>
                </div>

                <div className="bg-black/50 rounded-lg p-4">
                  <a
                    href="https://github.com/coinbase/x402/pull/361"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 font-bold block mb-2"
                  >
                    x402 Algorand PR
                  </a>
                </div>

                <div className="bg-black/50 rounded-lg p-4">
                  <a
                    href="https://github.com/GoPlausible/.github/blob/main/profile/algorand-x402-guide/README.md"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 font-bold block mb-2"
                  >
                    x402 Algorand Guides, Examples and docs
                  </a>
                </div>
                <div className="bg-black/50 rounded-lg p-4">
                  <a
                    href="https://github.com/GoPlausible/x402-avm/tree/branch-pr-361"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 font-bold block mb-2"
                  >
                    x402 Algorand Implementation Repository
                  </a>
                </div>
              </div>
              <br />
              <p className="text-gray-300 leading-relaxed text-xl mb-6">
                x402 Algorand NPM Packages:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-black/50 rounded-lg p-4">
                  <a
                    href="https://www.npmjs.com/package/x402-avm"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 font-bold block mb-2"
                  >
                    x402 Core Package
                  </a>
                </div>

                <div className="bg-black/50 rounded-lg p-4">
                  <a
                    href="https://www.npmjs.com/package/x402-avm-express"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 font-bold block mb-2"
                  >
                    x402-express Package
                  </a>
                </div>

                <div className="bg-black/50 rounded-lg p-4">
                  <a
                    href="https://www.npmjs.com/package/x402-avm-hono"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 font-bold block mb-2"
                  >
                    x402-hono Package
                  </a>
                </div>

                <div className="bg-black/50 rounded-lg p-4">
                  <a
                    href="https://www.npmjs.com/package/x402-avm-next"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 font-bold block mb-2"
                  >
                    x402-next Package
                  </a>
                </div>

                <div className="bg-black/50 rounded-lg p-4">
                  <a
                    href="https://www.npmjs.com/package/x402-avm-fetch"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 font-bold block mb-2"
                  >
                    x402-fetch Package
                  </a>
                </div>

                <div className="bg-black/50 rounded-lg p-4">
                  <a
                    href="https://www.npmjs.com/package/x402-avm-axios"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 font-bold block mb-2"
                  >
                    x402-axios Package
                  </a>
                </div>
              </div>
            </div>
          </div>
        </Section>
        <Section>
          {/* Algorand x402 packages */}
          <div className="relative">
            <div className="bg-gray-800/30 rounded-2xl p-8 backdrop-blur-xl border border-gray-700/50">
              <div className="flex items-center gap-4 mb-6">
                <h3 className="text-3xl font-bold text-indigo-400">
                  x402 Algorand packages make integration easy for developers
                </h3>
              </div>
              <p className="text-gray-300 leading-relaxed text-xl mb-8">
                x402 protocol comes with exact specifications for each blockchain virtual machine
                type, <span className="font-bold">EVM, AVM, SVM and ..., </span> as well as a core
                implementation x402 package to serve those specifications implementations core
                requirements, methods and functionalities.
              </p>
              <div className="mb-8">
                <div className="bg-black/50 rounded-lg p-4 font-mono text-sm text-gray-300 relative overflow-hidden">
                  <pre className="syntax-highlight">
                    <span className="text-green-400">npm install x402-avm</span>

                    {"\n"}
                    {/* eslint-disable-next-line react/jsx-no-comment-textnodes */}
                    <span className="text-gray-400">
                      // The x402-avm package is temporarily used untill the Algorand
                      {"\n"}
                      implementationa and exact spec gets merged into @coinbase/x402 repository!
                      {"\n"}
                      After merger developers can simply npm install @coinbase/x402
                    </span>
                  </pre>
                </div>
              </div>
              <p className="text-gray-300 leading-relaxed text-xl mb-8">
                Built atop x402 core package, x402 integration has been made easy using npm packages
                built for different, most existing backend & frontend libraries and frameworks,
                including: commonly used,{" "}
                <span className="font-bold">ExpressJS, Hono, NextJS, Fetch and Axios</span>.
              </p>
              <p className="text-gray-300 leading-relaxed text-xl mb-8">
                {" "}
                <span className="font-bold">Backends and SSR:</span>
              </p>
              <div className="mb-8">
                <div className="bg-black/50 rounded-lg p-4 font-mono text-sm text-gray-300 relative overflow-hidden">
                  <pre className="syntax-highlight">
                    <span className="text-green-400">npm install x402-avm-express</span>

                    {"\n"}
                    {/* eslint-disable-next-line react/jsx-no-comment-textnodes */}
                    <span className="text-gray-400">
                      // This install the x402 middleware for ExpressJS!
                    </span>
                  </pre>
                </div>
              </div>
              <div className="mb-8">
                <div className="bg-black/50 rounded-lg p-4 font-mono text-sm text-gray-300 relative overflow-hidden">
                  <pre className="syntax-highlight">
                    <span className="text-green-400">npm install x402-avm-hono</span>

                    {"\n"}
                    {/* eslint-disable-next-line react/jsx-no-comment-textnodes */}
                    <span className="text-gray-400">
                      // This install the x402 middleware for Hono which can be used in serverless
                      {"\n"}
                      runtimes like Cloudflare workers and Deno environments!
                    </span>
                  </pre>
                </div>
              </div>
              <div className="mb-8">
                <div className="bg-black/50 rounded-lg p-4 font-mono text-sm text-gray-300 relative overflow-hidden">
                  <pre className="syntax-highlight">
                    <span className="text-green-400">npm install x402-avm-next</span>

                    {"\n"}
                    {/* eslint-disable-next-line react/jsx-no-comment-textnodes */}
                    <span className="text-gray-400">
                      // This install the x402 middleware for NextJS SSR environments.
                    </span>
                  </pre>
                </div>
              </div>
              <p className="text-gray-300 leading-relaxed text-xl mb-8">
                {" "}
                <span className="font-bold">Frontends and clients:</span>
              </p>
              <div className="mb-8">
                <div className="bg-black/50 rounded-lg p-4 font-mono text-sm text-gray-300 relative overflow-hidden">
                  <pre className="syntax-highlight">
                    <span className="text-green-400">npm install x402-avm-fetch</span>

                    {"\n"}
                    {/* eslint-disable-next-line react/jsx-no-comment-textnodes */}
                    <span className="text-gray-400">
                      // This install the x402 utilities to be used in global Fetch web APIs!
                      {"\n"}
                      usable in browsers and client side runtimes!
                    </span>
                  </pre>
                </div>
              </div>
              <div className="mb-8">
                <div className="bg-black/50 rounded-lg p-4 font-mono text-sm text-gray-300 relative overflow-hidden">
                  <pre className="syntax-highlight">
                    <span className="text-green-400">npm install x402-avm-axios</span>

                    {"\n"}
                    {/* eslint-disable-next-line react/jsx-no-comment-textnodes */}
                    <span className="text-gray-400">
                      // This install the x402 utilities to be used with Axios library,
                      {"\n"}
                      usable in browsers and client side runtimes!
                    </span>
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* x402 Button Section */}
        <div className="relative z-10 text-center py-12">
          <Image
            src="/x402-button-large.png"
            alt="x402 button"
            width={320}
            height={160}
            className="bg-white mx-auto"
            style={{ borderRadius: 10 }}
          />
        </div>
      </div>
      <footer className="relative z-10 py-8 text-center text-sm text-gray-400">
        By using this site, you agree to be bound by the GoPlausible's{" "}
        <a
          href="https://goplausible.com/terms"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500"
        >
          Terms of Service
        </a>{" "}
        and{" "}
        <a
          href="https://goplausible.com/privacy"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500"
        >
          Privacy Policy
        </a>
        .
      </footer>
    </div>
  );
}
