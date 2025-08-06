import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Layout from "@/components/layout";
import InspectorPage from "@/pages/inspector-page";
import ChatPage from "@/pages/chat-page";
import { AuthProvider } from "@/lib/auth-context";
import { ApiKeysProvider } from "@/lib/api-keys-context";
import PerigonLogin from "@/components/perigon-login";
import { useAuth } from "@/lib/auth-context";
import { useApiKeys } from "@/lib/api-keys-context";

function AppContent() {
  const { isPerigonAuthenticated } = useAuth();
  const { hasValidKeys } = useApiKeys();

  // Show Perigon login if not authenticated and no valid API keys
  if (!isPerigonAuthenticated && !hasValidKeys()) {
    return <PerigonLogin />;
  }

  return (
    <>
      <Routes>
        <Route path="/" element={<InspectorPage />} />
        <Route path="/inspector" element={<Navigate to="/" replace />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ApiKeysProvider>
        <Router>
          <Layout>
            <AppContent />
          </Layout>
        </Router>
      </ApiKeysProvider>
    </AuthProvider>
  );
}
