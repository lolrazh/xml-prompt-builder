import { useEffect } from "react";
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
import Dashboard from "./pages/Dashboard.tsx";
import { AuthKitProvider } from "@workos-inc/authkit-react";
import { clearAllAuthStorage } from "@/auth/auth-cache";

const queryClient = new QueryClient();

const App = () => {
  const clientId = import.meta.env.VITE_WORKOS_CLIENT_ID as string | undefined;
  const apiHostname = import.meta.env.VITE_WORKOS_API_HOSTNAME as string | undefined;
  const devModeEnv = import.meta.env.VITE_WORKOS_DEV_MODE as unknown as string | undefined;
  const devMode = devModeEnv ? devModeEnv === 'true' : !import.meta.env.PROD;
  const redirectUri = import.meta.env.VITE_WORKOS_REDIRECT_URI as string | undefined;

  if (!clientId) {
    // eslint-disable-next-line no-console
    console.warn("VITE_WORKOS_CLIENT_ID is not set. AuthKit will not be functional until configured.");
  }

  // AuthKit refresh failure handler
  const handleRefreshFailure = ({ signIn }: { signIn: any }) => {
    console.warn('AuthKit refresh failed, redirecting to sign in');
    // Clear any cached user data
    clearAllAuthStorage();
    // Redirect to sign in
    signIn();
  };

  // Handle successful refresh
  const handleRefresh = (response: any) => {
    console.log('AuthKit token refreshed successfully');
  };

  // Check before auto refresh to ensure it's appropriate
  const handleBeforeAutoRefresh = () => {
    // Only allow auto refresh if user is actively using the app
    return document.visibilityState === 'visible';
  };

  return (
    <AuthKitProvider
      clientId={clientId ?? ""}
      devMode={devMode}
      redirectUri={redirectUri ?? (import.meta.env.PROD ? "https://xml.soy.run/login" : "http://localhost:8080/login")}
      refreshBufferInterval={60} // Refresh 60 seconds before expiration
      onRefreshFailure={handleRefreshFailure}
      onRefresh={handleRefresh}
      onBeforeAutoRefresh={handleBeforeAutoRefresh}
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
              <Route path="/dashboard" element={<Dashboard />} />
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
