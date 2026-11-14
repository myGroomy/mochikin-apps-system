// Upload foto evidence ke Supabase Storage bucket 'mycheck-photos'.
// Menggantikan uploadPhotoViaGas yang sering 504.
import { getSupabase } from '../supabase';

export interface UploadPhotoStorageOutput {
  fileUrl: string;
  filePath: string;
  sizeBytes: number;
}

export async function uploadPhotoToStorage(
  buffer: Buffer,
  mimeType: string,
  filePath: string   // e.g. 'CBG01BDG/2026-11/photo-abc.webp'
): Promise<UploadPhotoStorageOutput> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase tidak tersedia untuk upload foto');

  const { error } = await supabase.storage
    .from('mycheck-photos')
    .upload(filePath, buffer, { contentType: mimeType, upsert: false });

  if (error) throw new Error(`Storage upload gagal: ${error.message}`);

  const { data: urlData } = supabase.storage.from('mycheck-photos').getPublicUrl(filePath);
  return { fileUrl: urlData.publicUrl, filePath, sizeBytes: buffer.length };
}
