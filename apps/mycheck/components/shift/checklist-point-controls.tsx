'use client';

import { useRef, useState } from 'react';
import { Camera, RotateCcw, SkipForward, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
} from '@/components/ui/attachment';
import { Spinner } from '@/components/ui/spinner';
import { uploadPhotoWithProgress } from '@/lib/upload-photo';
import { compressPhoto } from '@/lib/photo-compress';
import type { ShiftDraftPoint } from '@/lib/draft-types';

type InputType =
  | 'centang'
  | 'foto'
  | 'teks'
  | 'angka'
  | 'ok_tidak_ok'
  | 'paragraf'
  | 'pilihan_ganda'
  | 'kotak_centang'
  | 'dropdown'
  | 'tanggal_waktu';
type EntryState = 'belum' | 'selesai' | 'skip';

const INPUT_LABEL: Record<string, string> = {
  centang: 'Centang checklist',
  foto: 'Foto',
  teks: 'Jawaban singkat',
  angka: 'Angka',
  ok_tidak_ok: 'OK / Tidak OK',
  paragraf: 'Paragraf',
  pilihan_ganda: 'Pilihan ganda',
  kotak_centang: 'Pilihan jamak',
  dropdown: 'Dropdown',
  tanggal_waktu: 'Tanggal dan waktu',
};

interface Point {
  point_ref: string;
  input_type: InputType;
  input_types?: InputType[];
  options: string[] | null;
  state: EntryState;
  value: string | null;
  skip_reason: string | null;
  out_of_range: boolean;
  number_min: number | null;
  number_max: number | null;
}

export function ChecklistPointControls({
  point,
  shiftId,
  disabled,
  busy,
  onComplete,
  onCancel,
  onSkip,
  draft,
  onDraftChange,
}: {
  point: Point;
  shiftId: string;
  disabled: boolean;
  busy: boolean;
  onComplete: (value: string) => Promise<void>;
  onCancel: () => Promise<void>;
  onSkip: (reason: string) => Promise<void>;
  draft?: ShiftDraftPoint;
  onDraftChange: (draft: ShiftDraftPoint | null) => void;
}) {
  const [value, setValue] = useState(draft?.value ?? point.value ?? '');
  const [selectedOptions, setSelectedOptions] = useState<string[]>(() => {
    if (draft?.selectedOptions) return draft.selectedOptions;
    try {
      const parsed: unknown = JSON.parse(point.value ?? '[]');
      return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
    } catch {
      return [];
    }
  });
  const inputTypes = point.input_types?.length ? point.input_types : [point.input_type];
  const combined = inputTypes.length > 1;
  const [combinedValues, setCombinedValues] = useState<Record<string, unknown>>(() => {
    if (!combined) return draft?.combinedValues ?? {};
    if (draft?.combinedValues) return draft.combinedValues;
    if (!point.value) return {};
    try {
      const parsed: unknown = JSON.parse(point.value);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? parsed as Record<string, unknown>
        : {};
    } catch {
      return {};
    }
  });
  const [combinedUploadError, setCombinedUploadError] = useState<string | null>(null);
  const [combinedUploading, setCombinedUploading] = useState(false);
  const [photoProgress, setPhotoProgress] = useState(0);
  const [skipOpen, setSkipOpen] = useState(false);
  const [skipReason, setSkipReason] = useState('');
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const updateValue = (next: string) => {
    setValue(next);
    onDraftChange({ ...draft, value: next });
  };

  const updateSelectedOptions = (next: string[]) => {
    setSelectedOptions(next);
    onDraftChange({ ...draft, selectedOptions: next, value: JSON.stringify(next) });
  };

  const updateCombinedValues = (next: Record<string, unknown>) => {
    setCombinedValues(next);
    onDraftChange({ ...draft, combinedValues: next, photoIds: Array.isArray(next.foto) ? next.foto.filter((id): id is string => typeof id === 'string') : draft?.photoIds });
  };

  const finishSkip = async () => {
    if (skipReason.trim().length < 3) return;
    await onSkip(skipReason.trim());
    setSkipOpen(false);
    setSkipReason('');
  };

  const uploadPhoto = async (file: File | undefined) => {
    if (!file) return;
    setPhotoError(null);
    setUploading(true);
    try {
      const compressed = await compressPhoto(file);
      await uploadPhotoWithProgress({
        file: compressed,
        ownerType: 'entry',
        ownerId: point.point_ref,
        shiftInstanceId: shiftId,
        onProgress: (percent) => setPhotoProgress(percent),
      }).then(async ({ photoId }) => {
        onDraftChange({ ...draft, photoIds: [photoId] });
        await onComplete(photoId);
      });
    } catch (error) {
      setPhotoError(error instanceof Error ? error.message : 'Foto gagal diunggah.');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const uploadCombinedPhotos = async (files: FileList | null) => {
    if (!files?.length) return;
    const existing = Array.isArray(combinedValues['foto'])
      ? combinedValues['foto'].filter((value): value is string => typeof value === 'string')
      : [];
    if (existing.length + files.length > 5) {
      setCombinedUploadError('Maksimal 5 foto untuk satu pertanyaan.');
      return;
    }
    setCombinedUploadError(null);
    setCombinedUploading(true);
    try {
      for (const file of Array.from(files)) {
        const compressed = await compressPhoto(file);
        const { photoId } = await uploadPhotoWithProgress({
          file: compressed,
          ownerType: 'entry',
          ownerId: point.point_ref,
          shiftInstanceId: shiftId,
          onProgress: (percent) => setPhotoProgress(percent),
        });
        setCombinedValues((current) => {
          const next = {
          ...current,
          foto: [
            ...(Array.isArray(current['foto']) ? current['foto'].filter((id): id is string => typeof id === 'string') : []),
            photoId,
          ],
          };
          onDraftChange({ ...draft, combinedValues: next, photoIds: next.foto as string[] });
          return next;
        });
      }
    } catch (error) {
      setCombinedUploadError(error instanceof Error ? error.message : 'Foto gagal diunggah.');
    } finally {
      setCombinedUploading(false);
    }
  };

  if (point.state !== 'belum') {
    let completedValue = point.value;
    if (point.input_type === 'tanggal_waktu' && point.value) {
      const date = new Date(point.value);
      completedValue = Number.isNaN(date.getTime()) ? point.value : date.toLocaleString('id-ID');
    }
    if (point.input_type === 'kotak_centang' && point.value) {
      try {
        const parsed: unknown = JSON.parse(point.value);
        if (Array.isArray(parsed)) completedValue = parsed.map(String).join(', ');
      } catch {
        completedValue = point.value;
      }
    }

    if (point.state === 'skip') {
      return (
        <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-lg border border-amber-200/80 bg-amber-50/70 p-2.5 text-xs text-amber-900">
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500 font-bold text-white text-[10px]">
              ⊘
            </span>
            <span>
              <strong className="font-semibold">Dilewati:</strong> {point.skip_reason || 'Tanpa keterangan'}
            </span>
          </div>
          {!disabled && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onCancel}
              disabled={busy}
              className="h-7 border-amber-300 bg-white px-2.5 text-xs text-amber-900 hover:bg-amber-100/60"
            >
              <RotateCcw className="mr-1 h-3.5 w-3.5" />
              Batalkan
            </Button>
          )}
        </div>
      );
    }

    return (
      <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-lg border border-emerald-200/80 bg-emerald-50/70 p-2.5 text-xs text-emerald-950">
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 font-bold text-white text-[10px]">
            ✓
          </span>
          <span className="font-medium">
            {combined && point.value
              ? `Hasil: ${formatCombinedValue(point.value)}`
              : point.input_type === 'foto'
              ? 'Foto tersimpan'
              : completedValue && completedValue !== 'true' && completedValue !== 'ya'
              ? `Jawaban: ${completedValue}`
              : 'Tugas selesai'}
            {point.out_of_range && (
              <span className="ml-1.5 font-semibold text-rose-700">⚠️ Di luar rentang normal</span>
            )}
          </span>
        </div>
        {!disabled && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onCancel}
            disabled={busy}
            className="h-7 border-emerald-300 bg-white px-2.5 text-xs text-emerald-900 hover:bg-emerald-100/60"
          >
            <RotateCcw className="mr-1 h-3.5 w-3.5" />
            Batalkan
          </Button>
        )}
      </div>
    );
  }
  let input;
  if (combined) {
    const updateComponent = (type: string, value: unknown) => {
      const next = { ...combinedValues, [type]: value };
      updateCombinedValues(next);
    };
    input = (
      <fieldset className="space-y-3.5 pt-1">
        <legend className="sr-only">Isi semua komponen pertanyaan</legend>
        <div className="space-y-3 rounded-xl border border-border/80 bg-surface/80 p-3.5">
          {inputTypes.map((type, idx) => (
            <div key={type} className="space-y-1.5 border-b border-border/50 pb-3 last:border-b-0 last:pb-0">
              <p className="text-xs font-semibold text-ink">
                <span className="mr-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-canvas text-[10px] font-bold text-ink-muted">
                  {idx + 1}
                </span>
                {INPUT_LABEL[type] ?? type}
              </p>
              {type === 'teks' || type === 'paragraf' || type === 'angka' || type === 'tanggal_waktu' ? (
                type === 'paragraf' ? (
                  <textarea
                    value={String(combinedValues[type] ?? '')}
                    onChange={(event) => updateComponent(type, event.target.value)}
                    rows={3}
                    maxLength={2000}
                    disabled={disabled || busy}
                    className="min-h-20 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-ink focus:ring-1 focus:ring-ink outline-none"
                    placeholder="Tulis jawaban..."
                  />
                ) : (
                  <input
                    type={type === 'tanggal_waktu' ? 'datetime-local' : type === 'angka' ? 'number' : 'text'}
                    value={String(combinedValues[type] ?? '')}
                    onChange={(event) => updateComponent(type, event.target.value)}
                    min={type === 'angka' ? point.number_min ?? undefined : undefined}
                    max={type === 'angka' ? point.number_max ?? undefined : undefined}
                    disabled={disabled || busy}
                    className="min-h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm focus:border-ink focus:ring-1 focus:ring-ink outline-none"
                    placeholder={type === 'angka' ? 'Masukkan angka' : 'Ketik jawaban...'}
                  />
                )
              ) : type === 'centang' ? (
                <label className="flex min-h-10 items-center gap-2.5 rounded-lg border border-border px-3 text-sm font-medium cursor-pointer hover:bg-canvas/50">
                  <input
                    type="checkbox"
                    checked={combinedValues[type] === true}
                    onChange={(event) => updateComponent(type, event.target.checked)}
                    disabled={disabled || busy}
                    className="h-4 w-4 accent-primary"
                  />
                  Tandai poin ini selesai
                </label>
              ) : type === 'ok_tidak_ok' ? (
                <div className="flex flex-wrap gap-2">
                  {['ya', 'tidak'].map((option) => (
                    <label
                      key={option}
                      className={`flex min-h-10 items-center gap-2 rounded-lg border px-3 text-xs font-semibold cursor-pointer transition-all ${
                        combinedValues[type] === option
                          ? option === 'ya'
                            ? 'border-emerald-600 bg-emerald-50 text-emerald-900'
                            : 'border-amber-600 bg-amber-50 text-amber-900'
                          : 'border-border bg-surface text-ink hover:bg-canvas'
                      }`}
                    >
                      <input
                        type="radio"
                        name={`combo-${point.point_ref}-${type}`}
                        checked={combinedValues[type] === option}
                        onChange={() => updateComponent(type, option)}
                        disabled={disabled || busy}
                        className="sr-only"
                      />
                      {option === 'ya' ? '✓ Ya / OK' : '✕ Tidak / Problem'}
                    </label>
                  ))}
                </div>
              ) : type === 'pilihan_ganda' || type === 'dropdown' || type === 'kotak_centang' ? (
                type === 'dropdown' ? (
                  <select
                    value={String(combinedValues[type] ?? '')}
                    onChange={(event) => updateComponent(type, event.target.value)}
                    disabled={disabled || busy}
                    className="min-h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm focus:border-ink focus:ring-1 focus:ring-ink outline-none"
                  >
                    <option value="">Pilih jawaban</option>
                    {(point.options ?? []).map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                ) : (
                  <div className="space-y-1.5">
                    {(point.options ?? []).map((option) => {
                      const multiple = type === 'kotak_centang';
                      const selected = Array.isArray(combinedValues[type])
                        ? combinedValues[type] as string[]
                        : [];
                      const checked = multiple ? selected.includes(option) : combinedValues[type] === option;
                      return (
                        <label
                          key={option}
                          className={`flex min-h-10 items-center gap-2.5 rounded-lg border px-3 text-xs font-medium cursor-pointer transition-all ${
                            checked ? 'border-ink bg-surface font-semibold text-ink shadow-2xs' : 'border-border bg-surface text-ink hover:bg-canvas'
                          }`}
                        >
                          <input
                            type={multiple ? 'checkbox' : 'radio'}
                            name={`combo-${point.point_ref}-${type}`}
                            checked={checked}
                            disabled={disabled || busy}
                            onChange={() => updateComponent(
                              type,
                              multiple
                                ? checked ? selected.filter((item) => item !== option) : [...selected, option]
                                : option
                            )}
                            className="h-4 w-4 accent-primary"
                          />
                          {option}
                        </label>
                      );
                    })}
                  </div>
                )
              ) : type === 'foto' ? (
                <div className="space-y-2">
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    multiple
                    onChange={(event) => void uploadCombinedPhotos(event.target.files)}
                    disabled={disabled || busy || combinedUploading}
                    className="block w-full text-xs text-ink-muted file:mr-2 file:rounded-lg file:border-0 file:bg-canvas file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-ink hover:file:bg-border cursor-pointer"
                  />
                  <p className="text-[11px] text-ink-muted">
                    {Array.isArray(combinedValues[type]) ? combinedValues[type].length : 0}/5 foto terunggah.
                  </p>
                  {combinedUploading && <p className="text-xs text-ink-muted animate-pulse">Mengunggah foto...</p>}
                  {combinedUploadError && <p role="alert" className="text-xs text-error">{combinedUploadError}</p>}
                </div>
              ) : null}
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <Button
            type="button"
            onClick={() => {
              const output: Record<string, unknown> = {};
              for (const type of inputTypes) {
                const value = combinedValues[type];
                if (
                  value === undefined || value === null ||
                  (typeof value === 'string' && !value.trim()) ||
                  (Array.isArray(value) && value.length === 0) ||
                  (type === 'centang' && value !== true)
                ) return;
                output[type] = type === 'tanggal_waktu' && typeof value === 'string'
                  ? new Date(value).toISOString()
                  : type === 'kotak_centang'
                    ? JSON.stringify(value)
                    : value;
              }
              void onComplete(JSON.stringify(output));
            }}
            disabled={disabled || busy || combinedUploading || inputTypes.some((type) => {
              const value = combinedValues[type];
              return value === undefined || value === null ||
                (typeof value === 'string' && !value.trim()) ||
                (Array.isArray(value) && value.length === 0) ||
                (type === 'centang' && value !== true);
            })}
            className="min-h-11 px-6 font-semibold text-sm shadow-xs active:scale-[0.98]"
          >
            Simpan Semua Jawaban
          </Button>
          <button
            type="button"
            onClick={() => setSkipOpen(true)}
            disabled={disabled || busy}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-muted hover:text-ink transition-colors"
          >
            <SkipForward className="h-3.5 w-3.5" />
            Lewati tugas...
          </button>
        </div>
      </fieldset>
    );
  } else if (point.input_type === 'centang') {
    input = (
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <Button
          type="button"
          className="min-h-11 px-6 font-semibold text-sm bg-primary text-primary-foreground hover:bg-primary-hover shadow-xs active:scale-[0.98] transition-all"
          onClick={() => void onComplete('true')}
          disabled={disabled || busy}
        >
          {busy ? 'Menyimpan...' : '✓ Tandai Selesai'}
        </Button>
        <button
          type="button"
          onClick={() => setSkipOpen(true)}
          disabled={disabled || busy}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-muted hover:text-ink transition-colors py-2 px-1"
        >
          <SkipForward className="h-3.5 w-3.5" />
          Lewati tugas...
        </button>
      </div>
    );
  } else if (point.input_type === 'ok_tidak_ok') {
    input = (
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            type="button"
            className="min-h-11 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm active:scale-[0.98] shadow-xs"
            onClick={() => void onComplete('ya')}
            disabled={disabled || busy}
          >
            ✓ OK
          </Button>
          <Button
            type="button"
            variant="outline"
            className="min-h-11 px-5 border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 font-semibold text-sm active:scale-[0.98]"
            onClick={() => void onComplete('tidak')}
            disabled={disabled || busy}
          >
            ✕ Tidak OK
          </Button>
        </div>
        <button
          type="button"
          onClick={() => setSkipOpen(true)}
          disabled={disabled || busy}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-muted hover:text-ink transition-colors py-2 px-1"
        >
          <SkipForward className="h-3.5 w-3.5" />
          Lewati tugas...
        </button>
      </div>
    );
  } else if (
    point.input_type === 'teks' ||
    point.input_type === 'paragraf' ||
    point.input_type === 'angka' ||
    point.input_type === 'tanggal_waktu'
  ) {
    const isParagraph = point.input_type === 'paragraf';
    input = (
      <div className="space-y-2.5 pt-1">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
          {isParagraph ? (
            <textarea
              aria-label="Jawaban"
              value={value}
              onChange={(event) => updateValue(event.target.value)}
              rows={3}
              maxLength={2000}
              className="min-h-24 min-w-0 flex-1 rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm font-medium focus:border-ink focus:ring-1 focus:ring-ink outline-none transition-all placeholder:text-ink-muted/60"
              placeholder="Tulis rincian jawaban SOP..."
              disabled={disabled || busy}
            />
          ) : (
            <input
              aria-label={point.input_type === 'angka' ? 'Nilai angka' : point.input_type === 'tanggal_waktu' ? 'Tanggal dan waktu' : 'Catatan checklist'}
              type={point.input_type === 'angka' ? 'number' : point.input_type === 'tanggal_waktu' ? 'datetime-local' : 'text'}
              value={value}
              onChange={(event) => updateValue(event.target.value)}
              min={point.input_type === 'angka' ? point.number_min ?? undefined : undefined}
              max={point.input_type === 'angka' ? point.number_max ?? undefined : undefined}
              className="min-h-11 min-w-0 flex-1 rounded-xl border border-border bg-surface px-3.5 text-sm font-medium focus:border-ink focus:ring-1 focus:ring-ink outline-none transition-all placeholder:text-ink-muted/60"
              placeholder={point.input_type === 'angka' ? (point.number_min !== null && point.number_max !== null ? `Rentang angka: ${point.number_min} - ${point.number_max}` : 'Masukkan angka') : 'Ketik jawaban...'}
              disabled={disabled || busy}
            />
          )}
          <Button
            type="button"
            onClick={() => void onComplete(value)}
            disabled={disabled || busy || !value.trim()}
            className="min-h-11 px-6 font-semibold text-sm shadow-xs active:scale-[0.98]"
          >
            Simpan
          </Button>
        </div>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setSkipOpen(true)}
            disabled={disabled || busy}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-muted hover:text-ink transition-colors"
          >
            <SkipForward className="h-3.5 w-3.5" />
            Lewati tugas ini...
          </button>
        </div>
      </div>
    );
  } else if (point.input_type === 'pilihan_ganda' || point.input_type === 'kotak_centang') {
    const options = point.options ?? [];
    const isMultiple = point.input_type === 'kotak_centang';
    input = (
      <fieldset className="space-y-2 pt-1">
        <legend className="sr-only">Pilih jawaban</legend>
        <div className="space-y-1.5">
          {options.map((option) => {
            const checked = isMultiple ? selectedOptions.includes(option) : value === option;
            return (
              <label
                key={option}
                className={`flex min-h-11 items-center gap-3 rounded-xl border px-3.5 text-sm font-medium transition-all cursor-pointer ${
                  checked
                    ? 'border-ink bg-surface shadow-xs text-ink font-semibold ring-1 ring-ink/10'
                    : 'border-border bg-surface text-ink hover:bg-canvas/60'
                }`}
              >
                <input
                  type={isMultiple ? 'checkbox' : 'radio'}
                  name={`answer-${point.point_ref}`}
                  checked={checked}
                  disabled={disabled || busy}
                  onChange={() => {
                    if (isMultiple) {
                      const next = checked
                        ? selectedOptions.filter((item) => item !== option)
                        : [...selectedOptions, option];
                      updateSelectedOptions(next);
                    } else {
                      updateValue(option);
                    }
                  }}
                  className="h-4 w-4 accent-primary"
                />
                {option}
              </label>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <Button
            type="button"
            onClick={() => void onComplete(isMultiple ? JSON.stringify(selectedOptions) : value)}
            disabled={disabled || busy || (isMultiple ? selectedOptions.length === 0 : !value)}
            className="min-h-11 px-6 font-semibold text-sm shadow-xs active:scale-[0.98]"
          >
            Simpan Jawaban
          </Button>
          <button
            type="button"
            onClick={() => setSkipOpen(true)}
            disabled={disabled || busy}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-muted hover:text-ink transition-colors"
          >
            <SkipForward className="h-3.5 w-3.5" />
            Lewati tugas...
          </button>
        </div>
      </fieldset>
    );
  } else if (point.input_type === 'dropdown') {
    input = (
      <div className="space-y-2 pt-1">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
          <select
            aria-label="Pilih jawaban"
            value={value}
            onChange={(event) => updateValue(event.target.value)}
            disabled={disabled || busy}
            className="min-h-11 min-w-0 flex-1 rounded-xl border border-border bg-surface px-3.5 text-sm font-medium focus:border-ink focus:ring-1 focus:ring-ink outline-none cursor-pointer"
          >
            <option value="">Pilih salah satu jawaban...</option>
            {(point.options ?? []).map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
          <Button
            type="button"
            onClick={() => void onComplete(value)}
            disabled={disabled || busy || !value}
            className="min-h-11 px-6 font-semibold text-sm shadow-xs active:scale-[0.98]"
          >
            Simpan
          </Button>
        </div>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setSkipOpen(true)}
            disabled={disabled || busy}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-muted hover:text-ink transition-colors"
          >
            <SkipForward className="h-3.5 w-3.5" />
            Lewati tugas...
          </button>
        </div>
      </div>
    );
  } else {
    input = (
      <div className="space-y-2.5 pt-1">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          onChange={(event) => void uploadPhoto(event.target.files?.[0])}
          disabled={disabled || busy || uploading}
        />
        {uploading ? (
          <Attachment state="uploading" className="w-full">
            <AttachmentMedia>
              <Spinner />
            </AttachmentMedia>
            <AttachmentContent>
              <AttachmentTitle>
                Mengunggah foto{photoProgress > 0 ? ` · ${photoProgress}%` : '...'}
              </AttachmentTitle>
              <AttachmentDescription>
                {photoProgress > 0 ? (
                  <span className="mt-1 block h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
                    <span
                      className="block h-full rounded-full bg-primary transition-all duration-300"
                      style={{ width: `${photoProgress}%` }}
                    />
                  </span>
                ) : (
                  'Kompres & upload sedang berjalan'
                )}
              </AttachmentDescription>
            </AttachmentContent>
            <AttachmentActions>
              <AttachmentAction aria-label="Batalkan upload" disabled>
                <X />
              </AttachmentAction>
            </AttachmentActions>
          </Attachment>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => fileRef.current?.click()}
              disabled={disabled || busy}
              className="min-h-11 px-5 border-border-strong bg-surface hover:bg-canvas text-ink font-semibold text-sm active:scale-[0.98] shadow-xs"
            >
              <Camera className="mr-2 h-4 w-4" />
              Ambil / Pilih Foto SOP
            </Button>
            <button
              type="button"
              onClick={() => setSkipOpen(true)}
              disabled={disabled || busy}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-muted hover:text-ink transition-colors"
            >
              <SkipForward className="h-3.5 w-3.5" />
              Lewati tugas...
            </button>
          </div>
        )}
        <p className="text-xs text-ink-muted">Foto otomatis dikompres maksimal 150 KB untuk hemat kuota & data offline.</p>
        {photoError && <p role="alert" className="mt-1 text-xs font-medium text-error">{photoError}</p>}
      </div>
    );
  }

  function formatCombinedValue(raw: string): string {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return raw;
      return Object.entries(parsed).map(([key, value]) => {
        if (key === 'foto' && Array.isArray(value)) return `${value.length} foto tersimpan`;
        if (Array.isArray(value)) return value.map(String).join(', ');
        return `${INPUT_LABEL[key] ?? key}: ${String(value)}`;
      }).join(' · ');
    } catch {
      return raw;
    }
  }

  return (
    <div className="space-y-2">
      {input}
      {skipOpen && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4 backdrop-blur-xs">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby={`skip-title-${point.point_ref}`}
            className="w-full max-w-md rounded-t-2xl border border-border bg-surface p-5 shadow-2xl sm:rounded-2xl"
          >
            <div className="flex items-center justify-between">
              <h2 id={`skip-title-${point.point_ref}`} className="text-base font-bold text-ink">
                Lewati Tugas SOP
              </h2>
              <button
                type="button"
                onClick={() => setSkipOpen(false)}
                className="rounded-full p-1 text-ink-muted hover:bg-canvas hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-1 text-xs text-ink-muted leading-relaxed">
              Sebutkan alasan mengapa tugas ini dilewati. Keterangan ini akan masuk ke laporan shift cabang.
            </p>

            {/* Quick Reason Chips */}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {['Bahan baku habis', 'Alat sedang rusak', 'Instruksi manajer shift', 'Tidak relevan shift ini'].map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setSkipReason(chip)}
                  className="rounded-lg border border-border bg-canvas px-2.5 py-1 text-xs text-ink-muted hover:border-border-strong hover:text-ink transition-colors"
                >
                  {chip}
                </button>
              ))}
            </div>

            <textarea
              autoFocus
              value={skipReason}
              onChange={(event) => setSkipReason(event.target.value)}
              maxLength={500}
              rows={3}
              className="mt-3 w-full rounded-xl border border-border bg-canvas p-3 text-sm focus:border-ink focus:ring-1 focus:ring-ink outline-none transition-all placeholder:text-ink-muted/60"
              placeholder="Tulis alasan minimal 3 karakter..."
            />
            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setSkipOpen(false)}>
                Batal
              </Button>
              <Button
                type="button"
                className="bg-amber-600 hover:bg-amber-700 text-white"
                onClick={() => void finishSkip()}
                disabled={busy || skipReason.trim().length < 3}
              >
                Konfirmasi Lewati
              </Button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
