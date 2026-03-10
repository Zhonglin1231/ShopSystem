import { createContext, useContext, useState, ReactNode } from "react";

interface ModalContextValue {
  newOrderOpen: boolean;
  openNewOrder: () => void;
  closeNewOrder: () => void;
}

const ModalContext = createContext<ModalContextValue>({
  newOrderOpen: false,
  openNewOrder: () => {},
  closeNewOrder: () => {},
});

export function ModalProvider({ children }: { children: ReactNode }) {
  const [newOrderOpen, setNewOrderOpen] = useState(false);

  return (
    <ModalContext.Provider
      value={{
        newOrderOpen,
        openNewOrder: () => setNewOrderOpen(true),
        closeNewOrder: () => setNewOrderOpen(false),
      }}
    >
      {children}
    </ModalContext.Provider>
  );
}

export function useModals() {
  return useContext(ModalContext);
}
