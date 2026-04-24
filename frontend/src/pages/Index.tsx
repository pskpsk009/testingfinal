import { useState, useEffect } from "react";
import { signOut } from "firebase/auth";
import { LoginForm } from "@/components/auth/LoginForm";
import { SetPasswordModal } from "@/components/auth/SetPasswordModal";
import { MockRoleChooser, SwitchableRole } from "@/components/auth/MockRoleChooser";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { auth } from "@/lib/firebase";
import { onIdTokenChanged } from "firebase/auth";

type AppRole = "student" | "coordinator" | "advisor";

const DUAL_ROLE_EMAILS = (import.meta.env.VITE_DUAL_ROLE_EMAILS ?? "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter((email) => email.length > 0);

const canUseDualRoleChooser = (email: string) =>
  DUAL_ROLE_EMAILS.includes(email.trim().toLowerCase());

const Index = () => {
  const [user, setUser] = useState<{
    id: string;
    name: string;
    email: string;
    role: AppRole;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedMockRole, setSelectedMockRole] = useState<SwitchableRole | null>(null);

  // Load user from localStorage on component mount
  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    const savedToken = localStorage.getItem("authToken");
    const isFirstLogin = localStorage.getItem("isFirstLogin") === "true";

    if (savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        setUser(userData);

        // Show password modal if first login
        if (isFirstLogin) {
          setShowPasswordModal(true);
        }
      } catch (error) {
        console.error("Failed to parse saved user data:", error);
        localStorage.removeItem("user");
      }
    }

    const savedMockRole = localStorage.getItem("mockRoleOverride");
    if (savedMockRole === "advisor" || savedMockRole === "coordinator") {
      setSelectedMockRole(savedMockRole);
    }

    if (savedToken) {
      setAuthToken(savedToken);
    }
    setIsLoading(false);
  }, []);

  // Keep Firebase ID token fresh and synced
  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const fresh = await firebaseUser.getIdToken(/* forceRefresh */ true);
          setAuthToken(fresh);
          localStorage.setItem("authToken", fresh);
          localStorage.setItem("firebaseAuthToken", fresh);
          // Restore user from storage if present, but do not synthesize a new one here
          if (!user) {
            const stored = localStorage.getItem("user");
            if (stored) {
              try {
                setUser(JSON.parse(stored));
              } catch {
                // ignore
              }
            }
          }
        } catch (e) {
          console.warn("Failed to refresh Firebase ID token", e);
        }
      } else {
        // Fully clear auth and user on sign-out/change
        setAuthToken(null);
        setUser(null);
        localStorage.removeItem("authToken");
        localStorage.removeItem("firebaseAuthToken");
        localStorage.removeItem("user");
        localStorage.removeItem("currentView");
        localStorage.removeItem("selectedProject");
        localStorage.removeItem("editingProject");
      }
    });

    // Optional periodic refresh safeguard
    const refreshTimer = setInterval(
      () => {
        const u = auth.currentUser;
        if (u) {
          void u.getIdToken(true).catch(() => {});
        }
      },
      45 * 60 * 1000,
    ); // every 45 minutes

    return () => {
      unsubscribe();
      clearInterval(refreshTimer);
    };
  }, [user]);

  const handleLogin = (
    userData: {
      id: string;
      name: string;
      email: string;
      role: AppRole;
    },
    token: string,
    isFirstLogin?: boolean,
  ) => {
    setUser(userData);
    localStorage.setItem("user", JSON.stringify(userData));
    setAuthToken(token);
    localStorage.setItem("authToken", token);

    // Force role choice on each fresh login for whitelisted dual-role emails.
    setSelectedMockRole(null);
    localStorage.removeItem("mockRoleOverride");

    // Show password modal for first-time email link sign-ins
    if (isFirstLogin) {
      setShowPasswordModal(true);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setAuthToken(null);
    setShowPasswordModal(false);
    setSelectedMockRole(null);
    localStorage.removeItem("user");
    localStorage.removeItem("currentView");
    localStorage.removeItem("selectedProject");
    localStorage.removeItem("editingProject");
    localStorage.removeItem("projects");
    localStorage.removeItem("firebaseAuthToken");
    localStorage.removeItem("authToken");
    localStorage.removeItem("isFirstLogin");
    localStorage.removeItem("passwordSkipped");
    localStorage.removeItem("passwordSet");
    localStorage.removeItem("mockRoleOverride");
    localStorage.removeItem("actingRole");
    void signOut(auth).catch((error) => {
      console.error("Failed to sign out from Firebase", error);
    });
  };

  const handleMockRoleSelect = (role: SwitchableRole) => {
    setSelectedMockRole(role);
    localStorage.setItem("mockRoleOverride", role);
    localStorage.setItem("actingRole", role);
  };

  const handlePasswordModalClose = () => {
    setShowPasswordModal(false);
    localStorage.removeItem("isFirstLogin");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginForm onLogin={handleLogin} />;
  }

  const shouldShowMockRoleChooser =
    canUseDualRoleChooser(user.email) && selectedMockRole === null;

  if (shouldShowMockRoleChooser) {
    return (
      <MockRoleChooser
        email={user.email}
        onSelectRole={handleMockRoleSelect}
        onLogout={handleLogout}
      />
    );
  }

  const effectiveUser: {
    id: string;
    name: string;
    email: string;
    role: AppRole;
  } =
    canUseDualRoleChooser(user.email) && selectedMockRole
      ? { ...user, role: selectedMockRole }
      : user;

  return (
    <>
      <Dashboard
        user={effectiveUser}
        authToken={authToken}
        onLogout={handleLogout}
      />
      <SetPasswordModal
        open={showPasswordModal}
        onClose={handlePasswordModalClose}
        userEmail={effectiveUser.email}
      />
    </>
  );
};

export default Index;
