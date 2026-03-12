import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import ReportsList from "@/pages/ReportsList";
import ReportDetail from "@/pages/ReportDetail";
import CreateReport from "@/pages/CreateReport";
import Profile from "@/pages/Profile";
import NotFound from "./pages/NotFound";
import { UserTagProvider } from "@/contexts/UserTagContext";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <UserTagProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <div className="mx-auto max-w-lg">
            <Routes>
              <Route path="/" element={<ReportsList />} />
              <Route path="/report/:id" element={<ReportDetail />} />
              <Route path="/create" element={<CreateReport />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            <BottomNav />
          </div>
        </BrowserRouter>
      </UserTagProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
