import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ArrowRight, TrendingUp, Megaphone, FileText, UserPlus, Users, Link as LinkIcon } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

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
        <div className="flex gap-5 sm:gap-8 lg:gap-12 min-w-max px-4">
          {/* Card 1 - Growth */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className="group flex w-32 sm:w-36 flex-col items-center rounded-3xl border border-border/60 
                           bg-card/80 px-4 py-4 shadow-sm outline-none transition-all duration-200
                           hover:border-primary/70 hover:shadow-lg"
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

          {/* Card 2 - Outreach */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className="group flex w-32 sm:w-36 flex-col items-center rounded-3xl border border-border/60 
                           bg-card/80 px-4 py-4 shadow-sm outline-none transition-all duration-200
                           hover:border-primary/70 hover:shadow-lg"
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

          {/* Card 3 - Scraping */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className="group flex w-32 sm:w-36 flex-col items-center rounded-3xl border border-border/60 
                           bg-card/80 px-4 py-4 shadow-sm outline-none transition-all duration-200
                           hover:border-primary/70 hover:shadow-lg"
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

          {/* Card 4 - Ads */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className="group flex w-32 sm:w-36 flex-col items-center rounded-3xl border border-border/60 
                           bg-card/80 px-4 py-4 shadow-sm outline-none transition-all duration-200
                           hover:border-primary/70 hover:shadow-lg"
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

          {/* Card 5 - Social Media */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className="group flex w-32 sm:w-36 flex-col items-center rounded-3xl border border-border/60 
                           bg-card/80 px-4 py-4 shadow-sm outline-none transition-all duration-200
                           hover:border-primary/70 hover:shadow-lg"
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


    </main>
  );
}
