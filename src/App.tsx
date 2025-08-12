import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login.tsx";
import AuthLogin from "./pages/AuthLogin.tsx";
import Account from "./pages/Account.tsx";
import { AuthKitProvider } from "@workos-inc/authkit-react";

const queryClient = new QueryClient();

const App = () => {
  const clientId = import.meta.env.VITE_WORKOS_CLIENT_ID as string | undefined;
  const apiHostname = import.meta.env.VITE_WORKOS_API_HOSTNAME as string | undefined;
  const devModeEnv = import.meta.env.VITE_WORKOS_DEV_MODE as unknown as string | undefined;
  const devMode = devModeEnv ? devModeEnv === 'true' : true;

  if (!clientId) {
    // eslint-disable-next-line no-console
    console.warn("VITE_WORKOS_CLIENT_ID is not set. AuthKit will not be functional until configured.");
  }

  return (
    <AuthKitProvider
      clientId={clientId ?? ""}
      devMode={devMode}
      redirectUri="http://localhost:8080/login"
      {...(apiHostname ? { apiHostname } : {})}
    >
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/auth/login" element={<AuthLogin />} />
              <Route path="/account" element={<Account />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </AuthKitProvider>
  );
};

export default App;
