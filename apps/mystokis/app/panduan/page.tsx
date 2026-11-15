'use client';

import React from 'react';
import Link from 'next/link';
import {
  ClipboardCheck,
  Package,
  Share2,
  Edit3,
  HelpCircle,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Clock,
  Layers,
} from 'lucide-react';

export default function PanduanPage() {
  return (
    <div className="min-h-screen bg-base-100 text-base-content py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-base-200 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <Link
                href="/dashboard"
                className="btn btn-ghost btn-xs gap-1 text-base-content/70 hover:text-base-content"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Kembali
              </Link>
            </div>
            <h1 className="text-2xl font-black tracking-tight mt-2">
              Panduan Operasional Stokis
            </h1>
            <p className="text-xs text-base-content/60 mt-1">
              Petunjuk singkat tata cara penghitungan stok fisik (Stock Opname) cabang
            </p>
          </div>
          <div className="p-3 bg-primary/10 rounded-2xl text-primary">
            <ClipboardCheck className="w-8 h-8" />
          </div>
        </div>

        {/* 1. Alur 3 Langkah SO */}
        <section className="space-y-4">
          <h2 className="text-sm font-bold tracking-wider uppercase text-primary flex items-center gap-2">
            <Clock className="w-4 h-4" />
            1. Alur Penghitungan Stok Opname
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border border-base-200 bg-base-200/40 space-y-2">
              <div className="w-7 h-7 rounded-lg bg-primary text-primary-content font-black text-xs flex items-center justify-center">
                1
              </div>
              <h3 className="font-bold text-sm">Hitung Step 1 (Display/Depan)</h3>
              <p className="text-xs text-base-content/70 leading-relaxed">
                Hitung jumlah barang utuh yang terpajang di meja bar, display kasir, atau rak depan.
              </p>
            </div>
            <div className="p-4 rounded-xl border border-base-200 bg-base-200/40 space-y-2">
              <div className="w-7 h-7 rounded-lg bg-primary text-primary-content font-black text-xs flex items-center justify-center">
                2
              </div>
              <h3 className="font-bold text-sm">Hitung Step 2 (Gudang/Terbuka)</h3>
              <p className="text-xs text-base-content/70 leading-relaxed">
                Hitung sisa barang di chiller, gudang belakang, atau kemasan yang sudah terbuka. Total akan otomatis dijumlahkan.
              </p>
            </div>
            <div className="p-4 rounded-xl border border-base-200 bg-base-200/40 space-y-2">
              <div className="w-7 h-7 rounded-lg bg-primary text-primary-content font-black text-xs flex items-center justify-center">
                3
              </div>
              <h3 className="font-bold text-sm">Submit & Kirim Laporan</h3>
              <p className="text-xs text-base-content/70 leading-relaxed">
                Periksa status selisih stok vs sesi sebelumnya. Klik submit, salin template WhatsApp, dan kirim ke grup cabang.
              </p>
            </div>
          </div>
        </section>

        {/* 2. Indikator Status Stok */}
        <section className="space-y-4">
          <h2 className="text-sm font-bold tracking-wider uppercase text-primary flex items-center gap-2">
            <Layers className="w-4 h-4" />
            2. Indikator Status & Threshold
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 space-y-1">
              <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs">
                <CheckCircle2 className="w-4 h-4" />
                AMAN
              </div>
              <p className="text-xs text-base-content/70">
                Stok fisik &gt; 2x batas minimum (threshold). Pasokan aman untuk shift berikutnya.
              </p>
            </div>
            <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 space-y-1">
              <div className="flex items-center gap-2 text-amber-600 font-bold text-xs">
                <AlertTriangle className="w-4 h-4" />
                HAMPIR HABIS
              </div>
              <p className="text-xs text-base-content/70">
                Stok fisik &le; 2x threshold. Siapkan restock atau order ke gudang pusat.
              </p>
            </div>
            <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/5 space-y-1">
              <div className="flex items-center gap-2 text-rose-600 font-bold text-xs">
                <Flame className="w-4 h-4" />
                KRITIS
              </div>
              <p className="text-xs text-base-content/70">
                Stok fisik &le; threshold. Segera laporkan ke PIC cabang untuk pengadaan darurat.
              </p>
            </div>
          </div>
        </section>

        {/* 3. Fitur Utama Lainnya */}
        <section className="space-y-4">
          <h2 className="text-sm font-bold tracking-wider uppercase text-primary flex items-center gap-2">
            <Package className="w-4 h-4" />
            3. Fitur Utama yang Sering Digunakan
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-base-200 bg-base-100 space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm">
                <Share2 className="w-4 h-4 text-emerald-600" />
                Kirim Laporan WhatsApp
              </div>
              <p className="text-xs text-base-content/70 leading-relaxed">
                Di halaman konfirmasi laporan, klik <strong>Salin Template WA</strong> untuk mendapatkan format teks rekap otomatis lengkap dengan daftar barang kritis dan link download Excel resmi.
              </p>
            </div>
            <div className="p-4 rounded-xl border border-base-200 bg-base-100 space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm">
                <Edit3 className="w-4 h-4 text-amber-600" />
                Koreksi / Edit Laporan
              </div>
              <p className="text-xs text-base-content/70 leading-relaxed">
                Jika ada salah hitung, buka menu <strong>Laporan</strong> &rarr; pilih laporan &rarr; klik <strong>Edit Laporan</strong>. Angka akan diperbarui dan file Excel di Google Drive otomatis di-update tanpa mengubah tautan file.
              </p>
            </div>
          </div>
        </section>

        {/* 4. Tanya Jawab (FAQ) Singkat */}
        <section className="space-y-4">
          <h2 className="text-sm font-bold tracking-wider uppercase text-primary flex items-center gap-2">
            <HelpCircle className="w-4 h-4" />
            4. Tanya Jawab Cepat (FAQ)
          </h2>
          <div className="space-y-3">
            <div className="p-4 rounded-xl border border-base-200 bg-base-200/20 space-y-1">
              <h4 className="font-bold text-xs">Bagaimana jika HP mati atau browser ter-refresh saat mengisi SO?</h4>
              <p className="text-xs text-base-content/70 leading-relaxed">
                Stokis menyimpan draft otomatis ke memori browser (<code className="text-primary font-mono text-[10px]">localStorage</code>). Cukup buka kembali menu <strong>Input SO</strong> pada shift yang sama, angka yang sudah diketik akan otomatis terisi kembali.
              </p>
            </div>
            <div className="p-4 rounded-xl border border-base-200 bg-base-200/20 space-y-1">
              <h4 className="font-bold text-xs">Apakah petugas bisa mengedit laporan cabang lain?</h4>
              <p className="text-xs text-base-content/70 leading-relaxed">
                Tidak. Akun petugas hanya diizinkan mengakses dan mencatat data pada cabang yang ditugaskan oleh Admin.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
