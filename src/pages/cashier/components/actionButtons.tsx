import React, { useState } from "react";
import { CheckCircle, Trash2, Plus, Users } from "lucide-react";

interface Props {
  clientName: string;
  setClientName: (val: string) => void;
  onAddClient: (name: string, phone?: string) => void;
  onClear: () => void;
  onFinish?: () => void;
}

export default function ActionButtons({
  clientName,
  setClientName,
  onAddClient,
  onClear,
  onFinish,
}: Props) {
  const [showPopup, setShowPopup] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [newClientPhone, setNewClientPhone] = useState("");
  const [newClientAddresse, setNewClientAddress] = useState("");
  const [newClientNotes, setNewClientNotes] = useState("");

  return (
    <div className="flex flex-col gap-4">
      {/* === Row 1: Client Name + Add Client + Discount + Confirm === */}
      <div className="flex flex-wrap gap-2 items-center">
        <input
          value={clientName}
          onChange={(e) => setClientName(e.target.value)}
          placeholder="Customer name"
          className="flex-1 rounded-md border border-border px-3 py-2 text-sm bg-background"
        />
        <button
          onClick={() => setShowPopup(true)}
          className="px-3 py-2 rounded-md bg-muted hover:bg-primary hover:text-primary-foreground transition text-sm"
        >
          <Plus className="w-4 h-4" />
        </button>

        {/* Optional discount input */}
        <input
          placeholder="Discount (DA)"
          className="w-36 rounded-md border border-border px-3 py-2 text-sm bg-background"
        />

        <button
          onClick={onFinish}
          className="ml-auto flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground font-semibold text-sm shadow hover:bg-primary/90"
        >
          <CheckCircle className="w-5 h-5" />
          Confirm
        </button>
      </div>

      {/* === Row 2: Credit / Versement === */}
      <div className="flex gap-3">
        <button className="flex-1 rounded-md bg-muted hover:bg-accent px-3 py-2 text-sm font-medium">
          Add Credit
        </button>
        <button className="flex-1 rounded-md bg-muted hover:bg-accent px-3 py-2 text-sm font-medium">
          Add Versement
        </button>
      </div>

      {/* === Row 3: Existing Confirm & Clear === */}
      <div className="flex flex-col sm:flex-row gap-3 w-full">
        <button
          onClick={onFinish}
          className="flex-1 flex items-center justify-center gap-2 py-4 rounded-lg bg-primary text-primary-foreground font-bold text-lg tracking-wide shadow-md hover:bg-primary/90 transition focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <CheckCircle className="w-6 h-6" />
          <span>Confirm Sale</span>
        </button>
        <button
          onClick={onClear}
          className="flex-1 flex items-center justify-center gap-2 py-4 rounded-lg bg-destructive text-white font-semibold text-lg tracking-wide shadow-md hover:bg-destructive/80 transition focus:outline-none focus:ring-2 focus:ring-destructive/50"
        >
          <Trash2 className="w-6 h-6" />
          <span>Clear Cart</span>
        </button>
      </div>

      {/* === Popup Modal === */}
      {showPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="flex-1 bg-white dark:bg-zinc-900 p-6 rounded-lg shadow-lg w-full max-w-sm space-y-4">
            {/* Title Row with Icon */}
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-red-600 dark:text-red-400" />
              <h2 className="text-lg font-semibold text-foreground">Add New Client</h2>
            </div>
      
            {/* Inputs */}
            <input
              value={newClientName}
              onChange={(e) => setNewClientName(e.target.value)}
              placeholder="Client Name"
              className="w-full rounded-md border border-border px-3 py-2 text-sm bg-background"
            />
            <input
              value={newClientPhone}
              onChange={(e) => setNewClientPhone(e.target.value)}
              placeholder="Phone Number (optional)"
              className="w-full rounded-md border border-border px-3 py-2 text-sm bg-background"
            />
            <input
              value={newClientPhone}
              onChange={(e) => setNewClientPhone(e.target.value)}
              placeholder="Phone Number (optional)"
              className="w-full rounded-md border border-border px-3 py-2 text-sm bg-background"
            />
            <input
              value={newClientPhone}
              onChange={(e) => setNewClientAddress(e.target.value)}
              placeholder="Address (optional)"
              className="w-full rounded-md border border-border px-3 py-2 text-sm bg-background"
            />
            <input
              value={newClientPhone}
              onChange={(e) => setNewClientNotes(e.target.value)}
              placeholder="Notes (optional)"
              className="w-full rounded-md border border-border px-3 py-2 text-sm bg-background"
            />
      
            {/* Buttons */}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowPopup(false)}
                className="px-3 py-2 text-sm bg-muted rounded-md hover:bg-muted/60"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (newClientName.trim()) {
                    onAddClient(newClientName.trim(), newClientPhone.trim());
                    setShowPopup(false);
                    setNewClientName("");
                    setNewClientPhone("");
                  }
                }}
                className="px-4 py-2 text-sm bg-primary text-white rounded-md hover:bg-primary/80"
              >
                Add Client
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
