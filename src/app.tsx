import { AuthenticationProvider } from "./contexts/AuthenticationContext";
import AuthenticatedApp from "./components/AuthenticatedApp";

export default function App() {
  return (
    <div className="h-screen bg-background overflow-hidden">
      <AuthenticationProvider>
        <AuthenticatedApp />
      </AuthenticationProvider>
    </div>
  );
}
