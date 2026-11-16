import { getSupabase } from '../supabase';

export interface UploadPhotoStorageOutput {
  fileUrl: string;
  filePath: string;
  sizeBytes: number;
}

export async function uploadPhotoToStorage(
  buffer: Buffer,
  mimeType: string,
  filePath: string
): Promise<UploadPhotoStorageOutput> {
  const supabase = getSupabase();
  const { error } = await supabase.storage
    .from('mycheck-photos')
    .upload(filePath, buffer, { contentType: mimeType, upsert: false });
  if (error) throw new Error(`Storage upload gagal: ${error.message}`);

  const { data } = supabase.storage.from('mycheck-photos').getPublicUrl(filePath);
  return { fileUrl: data.publicUrl, filePath, sizeBytes: buffer.length };
}
