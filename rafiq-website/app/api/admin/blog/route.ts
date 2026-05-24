import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/server';
import { revalidatePath } from 'next/cache';


export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    let query = supabase
      .from('blog_posts')
      .select('*')
      .order('created_at', { ascending: false });

    if (status === 'published') {
      query = query.eq('is_published', true);
    } else if (status === 'draft') {
      query = query.eq('is_published', false);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST /api/admin/blog
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const body = await request.json();

    const { data, error } = await supabase
      .from('blog_posts')
      .insert([{
        ...body,
        published_at: body.is_published ? new Date().toISOString() : null,
      }])
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/blog');
    revalidatePath('/admin/blog');

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/blog
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Blog post ID is required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('blog_posts')
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
        published_at: updateData.is_published ? new Date().toISOString() : null,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/blog');
    revalidatePath('/admin/blog');

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/blog
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Blog post ID is required' },
        { status: 400 }
      );
    }

    const { error } = await supabase.from('blog_posts').delete().eq('id', id);
    if (error) throw error;

    revalidatePath('/blog');
    revalidatePath('/admin/blog');

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}