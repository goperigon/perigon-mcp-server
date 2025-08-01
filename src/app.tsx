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
// import TurnstileAuth from "@/components/turnstile-auth";

function AppContent() {
  return (
    <>
      <Routes>
        <Route path="/" element={<InspectorPage />} />
        <Route path="/inspector" element={<Navigate to="/" replace />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {/* {!isAuthenticated && <TurnstileAuth />} */}
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
