"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { IdentitySelectorForm } from "./identity-selector-form";

/** Header trigger + dialog for changing the acting role/farmer after the initial landing pick. */
export function IdentitySwitcher() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        Switch identity
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Switch identity</DialogTitle>
          <DialogDescription>Demo mode — not a security boundary.</DialogDescription>
        </DialogHeader>
        <IdentitySelectorForm onApplied={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
