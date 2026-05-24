import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/server';
import { randomUUID } from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const bucket = formData.get('bucket') as string || 'media';
    const folder = formData.get('folder') as string || 'general';

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
    }


    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid file type. Only images allowed.' },
        { status: 400 }
      );
    }

    const maxSize = 5 * 1024 * 1024; 
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: 'File too large. Max 5MB.' },
        { status: 400 }
      );
    }


    const ext = file.name.split('.').pop();
    const fileName = `${folder}/${randomUUID()}.${ext}`;


    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) throw error;


    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);


    await supabase.from('media').insert({
      file_name: file.name,
      file_path: data.path,
      file_type: file.type,
      file_size: file.size,
      bucket_name: bucket,
    });

    return NextResponse.json({
      success: true,
      data: {
        url: publicUrl,
        path: data.path,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}