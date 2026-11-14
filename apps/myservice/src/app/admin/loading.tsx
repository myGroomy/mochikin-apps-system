import { QuantumLoader } from "@/components/ui/QuantumLoader";

export default function AdminLoading() {
  return (
    <div className="flex min-h-[45vh] flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200">
      <div className="doppel-outer max-w-sm w-full rounded-2xl shadow-sm">
        <div className="doppel-inner p-8 flex flex-col items-center justify-center text-center space-y-4 rounded-[calc(1rem-2px)]">
          <QuantumLoader
            size="md"
            text="Memuat modul admin..."
            subtext="Sinkronisasi identitas, hak akses, dan basis data ekosistem"
          />
        </div>
      </div>
    </div>
  );
}
