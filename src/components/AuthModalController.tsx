import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import AuthModal from "@/components/AuthModal";

/**
 * Mount this ONCE inside <AuthProvider> (in App.tsx).
 * It registers the modal opener with AuthContext so any component
 * can call `requireAuth(callback)` to trigger the modal.
 */
export default function AuthModalController() {
  const { _setOpenModal } = useAuth();
  const [open, setOpen] = useState(false);
  const [onSuccessCallback, setOnSuccessCallback] = useState<(() => void) | undefined>(undefined);

  const openModal = useCallback((onSuccess?: () => void) => {
    setOnSuccessCallback(() => onSuccess);
    setOpen(true);
  }, []);

  useEffect(() => {
    _setOpenModal(openModal);
  }, [openModal, _setOpenModal]);

  return (
    <AuthModal
      open={open}
      onClose={() => setOpen(false)}
      onSuccess={() => { onSuccessCallback?.(); setOpen(false); }}
    />
  );
}