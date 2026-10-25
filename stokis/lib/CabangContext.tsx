"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { useAuth } from "./AuthContext";

export interface Cabang {
  Cabang_ID: string;
  Nama_Cabang: string;
  Alamat?: string;
  Spreadsheet_ID?: string;
  Folder_Drive_ID?: string;
  PIC_Nama?: string;
  Nomor_WA_Cabang?: string;
  Aktif: boolean;
}

interface CabangContextType {
  selectedCabang: Cabang | null;
  setSelectedCabang: (c: Cabang | null) => void;
  cabangList: Cabang[];
  allCabangList: Cabang[];
  loading: boolean;
  refreshCabangList: () => Promise<void>;
}

const CabangContext = createContext<CabangContextType>({
  selectedCabang: null,
  setSelectedCabang: () => {},
  cabangList: [],
  allCabangList: [],
  loading: true,
  refreshCabangList: async () => {},
});

export function CabangProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [selectedCabang, setSelectedCabangState] = useState<Cabang | null>(null);
  const [allCabangs, setAllCabangs] = useState<Cabang[]>([]);
  const [filteredCabangs, setFilteredCabangs] = useState<Cabang[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const fetchIdRef = useRef(0);

  const fetchCabangList = useCallback(async () => {
    const id = ++fetchIdRef.current;
    try {
      setLoading(true);
      const res = await fetch("/api/cabang");
      const json = await res.json();
      if (id !== fetchIdRef.current) return;
      if (json.success && Array.isArray(json.data)) {
        setAllCabangs(json.data);
      }
    } catch {
      // abaikan: state tetap kosong, UI menampilkan opsi "Pilih Cabang..."
    } finally {
      if (id === fetchIdRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    fetchCabangList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading]);

  useEffect(() => {
    if (!authLoading && user && allCabangs.length === 0) {
      fetchCabangList();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (!user) {
      setFilteredCabangs([]);
      setSelectedCabangState(null);
      return;
    }

    let allowed: Cabang[] = [];
    if (user.role === "admin" && !user.cabangId) {
      allowed = allCabangs;
    } else {
      const allowedIds = user.cabangId
        ? user.cabangId.split(",").map((id) => id.trim().toUpperCase())
        : [];
      allowed = allCabangs.filter((c) =>
        allowedIds.includes(c.Cabang_ID.toUpperCase()),
      );
    }

    setFilteredCabangs(allowed);

    if (allowed.length === 1) {
      setSelectedCabangState(allowed[0]);
    } else if (allowed.length > 0) {
      const savedId = localStorage.getItem("stokis_selected_cabang_id");
      const match = allowed.find((c) => c.Cabang_ID === savedId);
      if (match) {
        setSelectedCabangState(match);
      } else {
        setSelectedCabangState(allowed[0]);
      }
    } else {
      setSelectedCabangState(null);
    }
  }, [user, allCabangs]);

  const setSelectedCabang = useCallback((c: Cabang | null) => {
    setSelectedCabangState(c);
    if (c) localStorage.setItem("stokis_selected_cabang_id", c.Cabang_ID);
    else localStorage.removeItem("stokis_selected_cabang_id");
  }, []);

  return (
    <CabangContext.Provider
      value={{
        selectedCabang,
        setSelectedCabang,
        cabangList: filteredCabangs,
        allCabangList: allCabangs,
        loading: authLoading || loading,
        refreshCabangList: fetchCabangList,
      }}
    >
      {children}
    </CabangContext.Provider>
  );
}

export function useCabang() {
  return useContext(CabangContext);
}
