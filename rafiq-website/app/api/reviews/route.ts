import { NextResponse } from 'next/server';
import { createClient } from '@/lib/server';

type ReviewPayload = {
  name?: unknown;
  role?: unknown;
  rating?: unknown;
  text?: unknown;
};

const NAME_MAX_LENGTH = 80;
const ROLE_MAX_LENGTH = 120;
const TEXT_MAX_LENGTH = 1200;

function normalizeText(value: unknown) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
}

function normalizeReviewText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function parseRating(value: unknown) {
  const rating =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number(value)
        : Number.NaN;

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return null;
  }

  return rating;
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: Request) {
  let payload: ReviewPayload;

  try {
    payload = (await req.json()) as ReviewPayload;
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: 'Invalid JSON payload.',
      },
      { status: 400 }
    );
  }

  const name = normalizeText(payload.name);
  const role = normalizeText(payload.role);
  const text = normalizeReviewText(payload.text);
  const rating = parseRating(payload.rating);

  if (!name || !text || rating === null) {
    return NextResponse.json(
      {
        success: false,
        message: 'Name, rating, and review text are required.',
      },
      { status: 400 }
    );
  }

  if (
    name.length > NAME_MAX_LENGTH ||
    role.length > ROLE_MAX_LENGTH ||
    text.length > TEXT_MAX_LENGTH
  ) {
    return NextResponse.json(
      {
        success: false,
        message: 'Review payload is too long.',
      },
      { status: 400 }
    );
  }

  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('reviews')
      .insert({
        name,
        role: role || null,
        rating,
        text,
      })
      .select('id, name, role, rating, text, featured, approved, created_at')
      .single();

    if (error) {
      console.error('Review insert failed:', error);

      return NextResponse.json(
        {
          success: false,
          message: 'Review could not be submitted.',
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Review submitted successfully.',
        review: data,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Unexpected review submission error:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Something went wrong while submitting your review.',
      },
      { status: 500 }
    );
  }
}
