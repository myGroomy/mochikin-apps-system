'use client';

import { useEffect, useState } from 'react';
import { Copy, Loader2, Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { copySopFromShift, listShifts, type AdminBranch, type ShiftDefinition } from '@/lib/admin/api';
import { toast } from 'sonner';

interface CopySopDialogProps {
  isOpen: boolean;
  onClose: () => void;
  targetShiftId: string;
  targetShiftName?: string;
  targetBranchId: string;
  branches: AdminBranch[];
  onSuccess: () => Promise<void>;
}

export function CopySopDialog({
  isOpen,
  onClose,
  targetShiftId,
  targetShiftName,
  targetBranchId,
  branches,
  onSuccess,
}: CopySopDialogProps) {
  const [selectedBranchId, setSelectedBranchId] = useState<string>(targetBranchId);
  const [shifts, setShifts] = useState<ShiftDefinition[]>([]);
  const [selectedSourceShiftId, setSelectedSourceShiftId] = useState<string>('');
  const [loadingShifts, setLoadingShifts] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedBranchId(targetBranchId);
      setSelectedSourceShiftId('');
    }
  }, [isOpen, targetBranchId]);

  useEffect(() => {
    if (!isOpen || !selectedBranchId) return;
    let active = true;
    setLoadingShifts(true);
    listShifts(selectedBranchId)
      .then((data) => {
        if (!active) return;
        const available = data.shifts.filter(
          (s) => s.id !== targetShiftId && s.isActive
        );
        setShifts(available);
        if (available.length > 0) {
          setSelectedSourceShiftId(available[0].id);
        } else {
          setSelectedSourceShiftId('');
        }
      })
      .catch((err) => {
        if (!active) return;
        toast.error('Gagal memuat daftar shift sumber: ' + (err instanceof Error ? err.message : 'Error'));
      })
      .finally(() => {
        if (active) setLoadingShifts(false);
      });

    return () => {
      active = false;
    };
  }, [isOpen, selectedBranchId, targetShiftId]);

  const handleCopy = async () => {
    if (!selectedSourceShiftId) {
      toast.error('Pilih shift sumber terlebih dahulu.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await copySopFromShift(targetShiftId, selectedSourceShiftId);
      toast.success(res.message);
      await onSuccess();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menyalin SOP.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary">
            <Sparkles className="h-5 w-5" />
            <DialogTitle>Salin SOP dari Shift Lain</DialogTitle>
          </div>
          <DialogDescription>
            Duplikasi seluruh section dan item checklist dari shift yang sudah ada ke{' '}
            <span className="font-semibold text-foreground">
              {targetShiftName || 'shift ini'}
            </span>
            .
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="source-branch">Cabang Sumber</Label>
            <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
              <SelectTrigger id="source-branch">
                <SelectValue placeholder="Pilih cabang" />
              </SelectTrigger>
              <SelectContent>
                {branches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name} ({b.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="source-shift">Shift Sumber</Label>
            {loadingShifts ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span>Memuat daftar shift...</span>
              </div>
            ) : shifts.length === 0 ? (
              <p className="text-xs text-muted-foreground p-3 rounded-lg border border-dashed border-border">
                Tidak ada shift aktif lain pada cabang ini.
              </p>
            ) : (
              <Select
                value={selectedSourceShiftId}
                onValueChange={setSelectedSourceShiftId}
              >
                <SelectTrigger id="source-shift">
                  <SelectValue placeholder="Pilih shift sumber" />
                </SelectTrigger>
                <SelectContent>
                  {shifts.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} ({s.startTime} - {s.endTime})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="rounded-lg bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40 p-3 text-xs text-blue-800 dark:text-blue-300">
            <p className="font-medium">Catatan Penting:</p>
            <ul className="list-disc list-inside mt-1 space-y-0.5 text-[11px] text-blue-700 dark:text-blue-400">
              <li>Section & pertanyaan checklist yang disalin akan ditambahkan ke shift ini.</li>
              <li>Data item yang sudah ada di shift ini tidak akan dihapus.</li>
              <li>Nilai bobot poin dan petunjuk pelaksanaan ikut disalin secara utuh.</li>
            </ul>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Batal
          </Button>
          <Button
            onClick={() => void handleCopy()}
            disabled={submitting || !selectedSourceShiftId}
            className="gap-1.5"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Menyalin SOP...</span>
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                <span>Salin ke Shift Ini</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
