// app/api/admin/media/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/server';
import { randomUUID } from 'crypto';


export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    const { data, error } = await supabase
      .from('media')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ success: true, data: data || [] });
  } catch (error: any) {
    console.error('GET media error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  console.log('=== UPLOAD API CALLED ===');
  
  try {
    const supabase = await createServerSupabaseClient();
    console.log('1. Supabase client created');

    const { data: { user } } = await supabase.auth.getUser();
    console.log('2. User:', user ? user.email : 'NO USER');
    
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const bucket = formData.get('bucket') as string || 'media';
    const folder = formData.get('folder') as string || 'general';

    console.log('3. File:', file ? `${file.name} (${file.size} bytes)` : 'NO FILE');

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
    }

    const ext = file.name.split('.').pop();
    const fileName = `${folder}/${randomUUID()}.${ext}`;
    console.log('4. Uploading to:', fileName);

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

    console.log('5. Storage result:', error ? `ERROR: ${error.message}` : `SUCCESS: ${data?.path}`);
    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);
    
    console.log('6. Public URL:', publicUrl);

    const { data: dbData, error: dbError } = await supabase.from('media').insert({
      file_name: file.name,
      file_path: data.path,
      file_type: file.type,
      file_size: file.size,
      bucket_name: bucket,
    }).select();

    console.log('7. DB result:', dbError ? `ERROR: ${dbError.message}` : 'SUCCESS');
    if (dbError) throw dbError;

    return NextResponse.json({
      success: true,
      data: { url: publicUrl, path: data.path },
    });
  } catch (error: any) {
    console.error('=== UPLOAD ERROR ===', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}


export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const path = searchParams.get('path');

    if (!id || !path) {
      return NextResponse.json(
        { success: false, error: 'ID and path are required' },
        { status: 400 }
      );
    }

    const { error: storageError } = await supabase.storage
      .from('media')
      .remove([path]);

    if (storageError) throw storageError;

    const { error: dbError } = await supabase
      .from('media')
      .delete()
      .eq('id', id);

    if (dbError) throw dbError;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('DELETE media error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}