import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json(
      {
        success: false,
        error: 'Missing Supabase environment variables',
      },
      { status: 500 }
    );
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const { error } = await supabase
      .from('links')
      .select('id')
      .limit(1);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: 'Database pinged successfully!',
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    return NextResponse.json(
      {
        success: false,
        error: errorMessage || 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}