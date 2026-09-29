import { create } from "zustand"
import { persist } from "zustand/middleware"

/** Período académico seleccionado en la barra superior ("" = todos). */
interface PeriodState {
  period: string
  setPeriod: (period: string) => void
}

export const usePeriodStore = create<PeriodState>()(
  persist(
    (set) => ({
      period: "",
      setPeriod: (period) => set({ period }),
    }),
    { name: "period-storage" }
  )
)
