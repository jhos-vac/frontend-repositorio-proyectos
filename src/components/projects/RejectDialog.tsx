import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"

/** Pide el motivo del rechazo (obligatorio) para que el estudiante pueda corregir. */
export function RejectDialog({ projectName, open, busy, onClose, onConfirm }: {
  projectName?: string; open: boolean; busy?: boolean; onClose: () => void; onConfirm: (note: string) => void
}) {
  const [note, setNote] = useState("")
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setNote(""); onClose() } }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Rechazar proyecto</DialogTitle>
          <DialogDescription>
            Explica a qué debe ajustarse «{projectName}». El estudiante podrá corregirlo y volverlo a enviar.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Ej.: Falta definir objetivos medibles y el alcance."
          className="min-h-28"
          aria-label="Motivo del rechazo"
        />
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => { setNote(""); onClose() }}>Cancelar</Button>
          <Button variant="destructive" disabled={busy || !note.trim()} onClick={() => { onConfirm(note.trim()); setNote("") }}>
            Rechazar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
