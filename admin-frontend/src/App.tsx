import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ScrollToTop from "@/components/ScrollToTop";
import AdminPanel from "./pages/AdminPanel";
import FinancialPanel from "./pages/FinancialPanel";
import PartialCapture from "./pages/PartialCapture";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter basename={import.meta.env.VITE_BASE_PATH || "/"}>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<AdminPanel />} />
          <Route path="/josh" element={<FinancialPanel />} />
          <Route path="/partial" element={<PartialCapture />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
