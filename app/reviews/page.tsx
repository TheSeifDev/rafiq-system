import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Quote, Star } from 'lucide-react';
import { getApprovedReviews, type Review } from '@/src/lib/reviews';

export const metadata: Metadata = {
  title: 'Reviews',
  description:
    'Client reviews and field feedback for Phantoms and the RAFIQ AI ecosystem.',
};

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          key={index}
          size={17}
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

function ReviewCard({ review }: { review: Review }) {
  const createdAt = new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(review.created_at));

  return (
    <article
      className="
        group relative overflow-hidden rounded-[2rem] border border-white/10
        bg-white/[0.035] p-6 shadow-[0_24px_90px_rgba(0,0,0,0.38)]
        backdrop-blur-2xl transition-all duration-500
        hover:-translate-y-2 hover:border-[#FF3B3B]/35
        hover:bg-white/[0.055] hover:shadow-[0_0_70px_rgba(255,59,59,0.16)]
        sm:p-8
      "
    >
      <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-[#FF3B3B]/15 blur-3xl transition-opacity duration-500 group-hover:opacity-90" />
      <div className="absolute inset-x-8 top-0 h-px bg-linear-to-r from-transparent via-white/30 to-transparent" />

      <div className="relative z-10">
        <div className="mb-7 flex items-start justify-between gap-5">
          <div>
            <p className="text-xl font-bold tracking-tight text-white">
              {review.name}
            </p>
          </div>

          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-black/40 text-[#FF3B3B] shadow-inner shadow-white/5">
            <Quote size={19} />
          </div>
        </div>

        <Stars rating={review.rating} />

        <p className="mt-6 text-sm leading-7 text-white/68 sm:text-[15px]">
          {review.text}
        </p>

        <div className="mt-8 flex items-center justify-between border-t border-white/10 pt-5">
          <span className="text-xs font-medium text-white/35">{createdAt}</span>
          {review.featured ? (
            <span className="rounded-full border border-[#FF3B3B]/25 bg-[#FF3B3B]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[#FFB3B3]">
              Spotlight
            </span>
          ) : (
            <span className="text-xs font-semibold uppercase tracking-[0.22em] text-white/25">
              Approved
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

export default async function ReviewsPage() {
  const reviews = await getApprovedReviews();
  const featuredCount = reviews.filter((review) => review.featured).length;

  return (
    <main className="relative min-h-screen overflow-hidden pb-24 pt-32 sm:pt-36">
      <div className="absolute left-1/2 top-20 h-96 w-96 -translate-x-1/2 rounded-full bg-[#FF3B3B]/10 blur-[130px]" />
      <div className="absolute -right-32 top-1/3 h-96 w-96 rounded-full bg-white/[0.04] blur-[140px]" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="
            group mb-10 inline-flex items-center gap-3 rounded-full
            border border-white/10 bg-white/[0.04] px-5 py-3 text-sm
            font-semibold text-white/75 backdrop-blur-xl transition-all
            duration-300 hover:-translate-y-1 hover:border-[#FF3B3B]/40
            hover:bg-[#FF3B3B]/10 hover:text-white
          "
        >
          <ArrowLeft
            size={16}
            className="transition-transform duration-300 group-hover:-translate-x-0.5"
          />
          Back home
        </Link>

        <section className="mb-14 max-w-4xl">
          <span className="mb-5 inline-flex rounded-full border border-[#FF3B3B]/20 bg-[#FF3B3B]/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.24em] text-[#FFB3B3]">
            Reviews archive
          </span>
          <h1 className="font-display text-6xl font-black leading-[0.9] tracking-tight text-white sm:text-7xl lg:text-8xl">
            What clients say
          </h1>
          <p className="mt-7 max-w-2xl text-sm leading-7 text-white/52 sm:text-base">
            A single Supabase-backed source of truth for approved feedback,
            ready for future dashboard approvals, spotlighting, and moderation.
          </p>

          <div className="mt-9 grid gap-4 sm:grid-cols-2">
            {[
              { label: 'Approved reviews', value: reviews.length },
              { label: 'Spotlight ready', value: featuredCount },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-3xl border border-white/10 bg-white/[0.035] p-5 backdrop-blur-xl"
              >
                <p className="text-2xl font-black text-white">{item.value}</p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-white/35">
                  {item.label}
                </p>
              </div>
            ))}
          </div>
        </section>

        {reviews.length > 0 ? (
          <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-2">
            {reviews.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </section>
        ) : (
          <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.035] p-8 text-center backdrop-blur-2xl sm:p-14">
            <div className="absolute left-1/2 top-0 h-24 w-56 -translate-x-1/2 rounded-full bg-[#FF3B3B]/15 blur-3xl" />
            <p className="relative text-sm leading-7 text-white/55">
              No approved reviews are available yet.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}