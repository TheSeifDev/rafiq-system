import Link from 'next/link';
import { ArrowUpRight, Quote, Star } from 'lucide-react';
import { getApprovedReviews, type Review } from '@/src/lib/reviews';

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          key={index}
          size={16}
          className={
            index < rating
              ? 'fill-[#FF3B3B] text-[#FF3B3B] drop-shadow-[0_0_8px_rgba(255,59,59,0.35)]'
              : 'text-white/15'
          }
        />
      ))}
    </div>
  );
}

function ReviewCard({ review, index }: { review: Review; index: number }) {
  return (
    <article
      className="
        group relative min-h-[280px] overflow-hidden rounded-[2rem]
        border border-white/10 bg-white/[0.035] p-6
        shadow-[0_24px_90px_rgba(0,0,0,0.38)]
        backdrop-blur-2xl transition-all duration-500
        hover:-translate-y-2 hover:border-[#FF3B3B]/35
        hover:bg-white/[0.055] hover:shadow-[0_0_70px_rgba(255,59,59,0.16)]
        sm:p-7
      "
      style={{ transitionDelay: `${index * 35}ms` }}
    >
      <div className="absolute -right-14 -top-14 h-36 w-36 rounded-full bg-[#FF3B3B]/15 blur-3xl transition-opacity duration-500 group-hover:opacity-90" />
      <div className="absolute inset-x-6 top-0 h-px bg-linear-to-r from-transparent via-white/30 to-transparent" />
      <div className="absolute inset-y-8 left-0 w-px bg-linear-to-b from-transparent via-[#FF3B3B]/35 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

      <div className="relative z-10 flex h-full flex-col">
        <div className="mb-8 flex items-start justify-between gap-5">
          <div>
            <p className="text-lg font-bold tracking-tight text-white">
              {review.name}
            </p>
          </div>

          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-black/40 text-[#FF3B3B] shadow-inner shadow-white/5">
            <Quote size={18} />
          </div>
        </div>

        <Stars rating={review.rating} />

        <p className="mt-6 line-clamp-6 text-sm leading-7 text-white/68 sm:text-[15px]">
          {review.text}
        </p>

        <div className="mt-auto pt-7">
          <div className="flex items-center justify-between border-t border-white/10 pt-5">
            <span className="text-xs font-semibold uppercase tracking-[0.22em] text-white/30">
              Verified review
            </span>
            {review.featured ? (
              <span className="rounded-full border border-[#FF3B3B]/25 bg-[#FF3B3B]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[#FFB3B3]">
                Spotlight
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}

export default async function Reviews() {
  const reviews = await getApprovedReviews({ limit: 6 });

  return (
    <section className="relative overflow-hidden py-24 sm:py-28">
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <span className="mb-5 text-xs font-semibold uppercase tracking-[0.15em] text-white/40">
              Client signal
            </span>
            <h2 className="font-display text-5xl font-black leading-[0.95] tracking-tight text-white sm:text-6xl lg:text-7xl">
              Reviews from the field
            </h2>
            <p className="mt-6 max-w-2xl text-sm leading-7 text-white/50 sm:text-base">
              Real feedback from people who have worked with Phantoms across
              intelligent systems, automation, and cinematic product builds.
            </p>
          </div>

          <Link
            href="/reviews"
            className="
              group inline-flex items-center gap-3 self-start rounded-full
              border border-white/10 bg-white/[0.04] px-5 py-3
              text-sm font-semibold text-white backdrop-blur-xl
              transition-all duration-300 hover:-translate-y-1
              hover:border-[#FF3B3B]/40 hover:bg-[#FF3B3B]/10
            "
          >
            View all reviews
            <ArrowUpRight
              size={16}
              className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
            />
          </Link>
        </div>

        {reviews.length > 0 ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-2">
            {reviews.map((review, index) => (
              <ReviewCard key={review.id} review={review} index={index} />
            ))}
          </div>
        ) : (
          <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.035] p-8 text-center backdrop-blur-2xl sm:p-12">
            <div className="absolute left-1/2 top-0 h-24 w-48 -translate-x-1/2 rounded-full bg-[#FF3B3B]/15 blur-3xl" />
            <p className="relative text-sm leading-7 text-white/55">
              Reviews will appear here as soon as the first approved submission
              lands in Supabase.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
