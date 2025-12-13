// app/page.tsx 
import Link from 'next/link';
import Image from 'next/image';

import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

import {
  ArrowRight,
  TrendingUp,
  Megaphone,
  FileText,
  UserPlus,
  Users,

  ArrowLeftRight,
  RefreshCw,
  BadgeCheck,
  Zap,
} from 'lucide-react';


export default function HomePage() {
  return (
    <main>
      {/* Hero */}
      <section className="py-24">
        <div className="mx-auto flex max-w-6xl flex-col items-center px-4 sm:px-6 lg:flex-row lg:gap-16 lg:px-8">
          {/* Colonne gauche – logo */}
          <div className="flex w-full justify-center lg:w-1/2">
            <Image
              src="/images/Icon-Ion-Proxy.png"
              alt="Ion Proxy Icon"
              width={260}
              height={260}
              className="h-auto w-48 sm:w-56 lg:w-64"
            />
          </div>

          {/* Colonne droite – texte */}
          <div className="mt-10 w-full max-w-xl text-center lg:mt-0 lg:w-1/2 lg:text-left">
            <h3
              className="
                rainbow-text
                text-xs
                font-semibold uppercase
                tracking-[0.35em]
              "
            >
              ROTATING 4G PROXIES
            </h3>

            <h1 className="mt-4 block text-4xl font-bold tracking-tight lg:text-5xl">
              4G Dedicated Proxies
            </h1>

            <p className="mt-4 text-base text-muted-foreground sm:text-lg">
              Launch your SaaS product in record time with our powerful,
              ready-to-use template. Packed with modern technologies and
              essential integrations.
            </p>

            <div className="mt-8 flex justify-center lg:justify-start">
              <Link href="/sign-up">
                <Button
                  size="lg"
                  variant="outline"
                  className="rounded-full text-lg"
                >
                  Sign up to get one <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Use-cases */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">
              4G Proxy, What for ?
            </h2>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Unlock the full potential of your online operations
            </p>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">
              4G dedicated proxies tailored for growth, marketing, data and automation —
              with the reliability your business requires.
            </p>
          </div>

          {/* Row of use-cases */}
          <div className="mx-auto mt-10 flex justify-center overflow-x-auto">
            <TooltipProvider>
              <div className="flex min-w-max gap-5 px-4 sm:gap-8 lg:gap-12">
                {/* Growth */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      className="group flex w-32 flex-col items-center rounded-3xl border border-border/60
                                 bg-card/80 px-4 py-4 shadow-sm outline-none transition-all duration-200
                                 hover:border-primary/70 hover:shadow-lg sm:w-36"
                    >
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-full bg-muted
                                   transition-colors duration-200 group-hover:bg-primary/90"
                      >
                        <TrendingUp className="h-5 w-5 text-muted-foreground group-hover:text-primary-foreground" />
                      </div>
                      <span className="mt-3 text-sm font-semibold text-foreground group-hover:text-primary">
                        Growth
                      </span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    Power your growth with scalable, high-trust 4G IPs.
                  </TooltipContent>
                </Tooltip>

                {/* Outreach */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      className="group flex w-32 flex-col items-center rounded-3xl border border-border/60
                                 bg-card/80 px-4 py-4 shadow-sm outline-none transition-all duration-200
                                 hover:border-primary/70 hover:shadow-lg sm:w-36"
                    >
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-full bg-muted
                                   transition-colors duration-200 group-hover:bg-primary/90"
                      >
                        <Megaphone className="h-5 w-5 text-muted-foreground group-hover:text-primary-foreground" />
                      </div>
                      <span className="mt-3 text-sm font-semibold text-foreground group-hover:text-primary">
                        Outreach
                      </span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    Run cold outreach and campaigns without burning IPs.
                  </TooltipContent>
                </Tooltip>

                {/* Scraping */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      className="group flex w-32 flex-col items-center rounded-3xl border border-border/60
                                 bg-card/80 px-4 py-4 shadow-sm outline-none transition-all duration-200
                                 hover:border-primary/70 hover:shadow-lg sm:w-36"
                    >
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-full bg-muted
                                   transition-colors duration-200 group-hover:bg-primary/90"
                      >
                        <FileText className="h-5 w-5 text-muted-foreground group-hover:text-primary-foreground" />
                      </div>
                      <span className="mt-3 text-sm font-semibold text-foreground group-hover:text-primary">
                        Scraping
                      </span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    Collect clean, geo-reliable data at scale.
                  </TooltipContent>
                </Tooltip>

                {/* Ads */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      className="group flex w-32 flex-col items-center rounded-3xl border border-border/60
                                 bg-card/80 px-4 py-4 shadow-sm outline-none transition-all duration-200
                                 hover:border-primary/70 hover:shadow-lg sm:w-36"
                    >
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-full bg-muted
                                   transition-colors duration-200 group-hover:bg-primary/90"
                      >
                        <UserPlus className="h-5 w-5 text-muted-foreground group-hover:text-primary-foreground" />
                      </div>
                      <span className="mt-3 text-sm font-semibold text-foreground group-hover:text-primary">
                        Ads
                      </span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    Test, launch and scale campaigns with safer IP rotation.
                  </TooltipContent>
                </Tooltip>

                {/* Social Media */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      className="group flex w-32 flex-col items-center rounded-3xl border border-border/60
                                 bg-card/80 px-4 py-4 shadow-sm outline-none transition-all duration-200
                                 hover:border-primary/70 hover:shadow-lg sm:w-36"
                    >
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-full bg-muted
                                   transition-colors duration-200 group-hover:bg-primary/90"
                      >
                        <Users className="h-5 w-5 text-muted-foreground group-hover:text-primary-foreground" />
                      </div>
                      <span className="mt-3 text-sm font-semibold text-foreground group-hover:text-primary">
                        Social Media
                      </span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    Manage multi-account setups without constant flags.
                  </TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>
          </div>
        </div>
      </section>

      {/* Why chose us ? (screenshot section) */}
      <section className="py-20">
        <div className="mx-auto flex w-full max-w-6xl items-center px-6">
          <div className="flex w-full flex-col gap-16 lg:flex-row lg:gap-10">
            {/* Left icons */}
            <div className="flex w-full items-center justify-center lg:w-[40%]">
              <div className="flex w-full max-w-md flex-col gap-10">

                {/* Ligne 1 : ArrowLeftRight centré */}
                <div className="flex justify-center">
                  <div className="flex flex-col items-center gap-2 text-center hover:scale-125 transition-transform duration-400">
                    <ArrowLeftRight className="h-10 w-10 text-muted-foreground" />
                    <div className="text-sm text-muted-foreground">Https / Socks5</div>
                  </div>
                </div>

                {/* Ligne 2 : 3 colonnes */}
                <div className="flex items-center justify-between">
                  {/* Colonne gauche : Rotation IP */}
                  <div className="flex flex-col items-center gap-2 text-center hover:scale-125 transition-transform duration-400">
                    <RefreshCw className="h-10 w-10 text-muted-foreground" />
                    <div className="text-sm text-muted-foreground">Rotation IP</div>
                  </div>

                  {/* Colonne centre : Image */}
                  <div className="flex flex-col items-center gap-2 text-center">
                    <div className="flex h-16 w-16 items-center justify-center">
                      <Image
                        src="/images/Icon-Ion-Proxy.png"
                        alt="Ion Proxy Icon"
                        width={45}
                        height={45}
                        className="h-auto w-auto"
                      />
                    </div>
                  </div>

                  {/* Colonne droite : Trusted IP */}
                  <div className="flex flex-col items-center gap-2 text-center hover:scale-125 transition-transform duration-400">
                    <BadgeCheck className="h-10 w-10 text-muted-foreground" />
                    <div className="text-sm text-muted-foreground">Trusted IP</div>
                  </div>
                </div>

                {/* Ligne 3 : Fast speed centré */}
                <div className="flex justify-center">
                  <div className="flex flex-col items-center gap-2 text-center hover:scale-125 transition-transform duration-400">
                    <Zap className="h-10 w-10 text-muted-foreground" />
                    <div className="text-sm text-muted-foreground">Fast speed</div>
                  </div>
                </div>

              </div>
            </div>

            {/* Right text */}
            <div className="flex w-full flex-col justify-center lg:w-[60%]">
              <h2 className="text-4xl font-semibold tracking-tight lg:text-5xl">
                Why chose us ?
              </h2>

              <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground">
                Many mobile proxy providers on the web are simple resellers. At ionproxy we are
                selling our own 4G proxies. We selected the right hardware and tools. We are
                developping a whole ecosystem to perfectly answer the increasing needs of mobile
                proxy users.
              </p>

              <div className="mt-10">
                <Button variant="outline" className="rounded-full px-6 py-3 text-sm">
                  View our setup
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className='py-20 flex flex-col gap-10'>
        <div className='flex flex-col items-center justify-center'>
          <h2 className='mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl'>Frequently asked questions</h2>
          <p className='mt-4 text-md leading-7 text-muted-foreground'>5 most asked questions about our 4G proxies</p>
        </div>
        <div className="flex items-center justify-center">
          <Accordion
            type="single"
            collapsible
            className="w-full max-w-3xl"
          >
            <AccordionItem value="item-1">
              <AccordionTrigger>
                How fast are your mobile proxy connections?
              </AccordionTrigger>
              <AccordionContent className='font-bold'>
                They range from 35mbps to 50mbps with 700ms to 2500ms response times.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2">
              <AccordionTrigger>
                Can global clients use your proxies outside their locations?
              </AccordionTrigger>
              <AccordionContent className='font-bold'>
                Yes, our mobile IPs work well globally, especially for platforms like Instagram.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3">
              <AccordionTrigger>
                For Instagram, what's the max number of accounts recommended per proxy?
              </AccordionTrigger>
              <AccordionContent className='font-bold'>
                We recommend using a maximum of 4 accounts for each proxy.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-4">
              <AccordionTrigger>
                Are there any site restrictions with your proxies?
              </AccordionTrigger>
              <AccordionContent className='font-bold'>
                Some small restrictions, check our acceptable use page. But Access to Instagram, Facebook, LinkedIn, Pinterest, etc…, is available.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-5">
              <AccordionTrigger>
                Where are your mobile proxies physically located?
              </AccordionTrigger>
              <AccordionContent className='font-bold'>
                Our proxies are located in Bosnia and Herzegovina, Near many cell towers.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>
    </main>
  );
}
