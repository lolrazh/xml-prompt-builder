import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { clearAllAuthStorage } from '@/auth/auth-cache';

export function AuthErrorFallback() {
  const handleClearAuthAndReload = () => {
    clearAllAuthStorage();
    window.location.reload();
  };

  return (
    <Card className="p-6 max-w-md mx-auto mt-20">
      <div className="text-center space-y-4">
        <h2 className="text-xl font-semibold text-red-600">Authentication Error</h2>
        <p className="text-gray-600">
          There was an issue with your authentication session. This usually happens when tokens expire.
        </p>
        <Button 
          onClick={handleClearAuthAndReload}
          className="w-full"
        >
          Clear Session and Reload
        </Button>
      </div>
    </Card>
  );
}