import { Outlet } from "react-router";
import { Toaster } from "sonner";
import { ModalProvider, useModals } from "./ModalContext";
import { NewOrderModal } from "./NewOrderModal";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { ShopDataProvider } from "../lib/shop-data";

function RootInner() {
  const { newOrderOpen, closeNewOrder } = useModals();

  return (
    <div className="flex w-full h-screen overflow-hidden" style={{ fontFamily: "var(--f-sans)" }}>
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden" style={{ backgroundColor: "var(--c-bg-app)" }}>
        <TopBar />
        <div className="flex-1 overflow-y-auto p-[var(--s-5)]">
          <Outlet />
        </div>
      </main>
      <NewOrderModal isOpen={newOrderOpen} onClose={closeNewOrder} />
      <Toaster position="top-center" />
    </div>
  );
}

export function Root() {
  return (
    <ModalProvider>
      <ShopDataProvider>
        <RootInner />
      </ShopDataProvider>
    </ModalProvider>
  );
}
