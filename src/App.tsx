import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import InspectionWorkspace from "./pages/InspectionWorkspace";
import MediaLibrary from "./pages/MediaLibrary";
import SectionDetail from "./pages/SectionDetail";
import PartDetail from "./pages/PartDetail";
import ReportPreview from "./pages/ReportPreview";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/inspection/:id" element={<InspectionWorkspace />} />
          <Route path="/inspection/:id/media" element={<MediaLibrary />} />
          <Route path="/inspection/:id/section/:section" element={<SectionDetail />} />
          <Route path="/inspection/:id/section/:section/part/:part" element={<PartDetail />} />
          <Route path="/inspection/:id/report" element={<ReportPreview />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
