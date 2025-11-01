import React, { useState, useCallback } from "react";
import type { CartItem } from "../../../types";

export interface Session {
  id: number;
  cart: CartItem[];
  discount: string;
  clientName: string;
  clientId: string | null;
  paymentAmount: number;
  paymentType: "none" | "credit" | "versement";
  paymentDate: Date | undefined;
}

interface SessionManagerProps {
  maxSessions: number;
  children: (
    sessions: Session[],
    activeSession: number,
    sessionActions: SessionActions,
  ) => React.ReactNode;
}

export interface SessionActions {
  addSession: () => void;
  removeSession: (sessionIndex: number) => void;
  setActiveSession: (sessionIndex: number) => void;
  updateSessionCart: (sessionIndex: number, newCart: CartItem[]) => void;
  updateSessionDiscount: (sessionIndex: number, newDiscount: string) => void;
  updateSessionClient: (sessionIndex: number, clientName: string, clientId: string | null) => void;
  updateSessionPayment: (sessionIndex: number, paymentAmount: number, paymentType: "none" | "credit" | "versement", paymentDate: Date | undefined) => void;
  getCurrentSession: () => Session;
}

export default function SessionManager({
  maxSessions,
  children,
}: SessionManagerProps) {
  const [sessions, setSessions] = useState<Session[]>([
    { id: 0, cart: [], discount: "", clientName: "", clientId: null, paymentAmount: 0, paymentType: "none", paymentDate: undefined },
  ]);
  const [activeSession, setActiveSession] = useState(0);

  const addSession = useCallback(() => {
    if (sessions.length < maxSessions) {
      const newSessionId = sessions.length;
      setSessions((prev) => [
        ...prev,
        { id: newSessionId, cart: [], discount: "", clientName: "", clientId: null, paymentAmount: 0, paymentType: "none", paymentDate: undefined },
      ]);
      setActiveSession(newSessionId);
    }
  }, [sessions.length, maxSessions]);

  const removeSession = useCallback(
    (sessionIndex: number) => {
      if (sessions.length > 1) {
        setSessions((prev) =>
          prev.filter((_, index) => index !== sessionIndex),
        );

        // Adjust active session if necessary
        if (activeSession >= sessionIndex) {
          setActiveSession((prev) => Math.max(0, prev - 1));
        }
      }
    },
    [sessions.length, activeSession],
  );

  const updateSessionCart = useCallback(
    (sessionIndex: number, newCart: CartItem[]) => {
      setSessions((prev) => {
        const updated = [...prev];
        updated[sessionIndex] = { ...updated[sessionIndex], cart: newCart };
        return updated;
      });
    },
    [],
  );

  const updateSessionDiscount = useCallback(
    (sessionIndex: number, newDiscount: string) => {
      setSessions((prev) => {
        const updated = [...prev];
        updated[sessionIndex] = {
          ...updated[sessionIndex],
          discount: newDiscount,
        };
        return updated;
      });
    },
    [],
  );

  const updateSessionClient = useCallback(
    (sessionIndex: number, clientName: string, clientId: string | null) => {
      setSessions((prev) => {
        const updated = [...prev];
        updated[sessionIndex] = {
          ...updated[sessionIndex],
          clientName,
          clientId,
        };
        return updated;
      });
    },
    [],
  );

  const updateSessionPayment = useCallback(
    (sessionIndex: number, paymentAmount: number, paymentType: "none" | "credit" | "versement", paymentDate: Date | undefined) => {
      setSessions((prev) => {
        const updated = [...prev];
        updated[sessionIndex] = {
          ...updated[sessionIndex],
          paymentAmount,
          paymentType,
          paymentDate,
        };
        return updated;
      });
    },
    [],
  );

  const getCurrentSession = useCallback(() => {
    return sessions[activeSession] || sessions[0];
  }, [sessions, activeSession]);

  const sessionActions: SessionActions = {
    addSession,
    removeSession,
    setActiveSession,
    updateSessionCart,
    updateSessionDiscount,
    updateSessionClient,
    updateSessionPayment,
    getCurrentSession,
  };

  return <>{children(sessions, activeSession, sessionActions)}</>;
}
