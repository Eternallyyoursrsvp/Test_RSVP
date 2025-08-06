import React, { createContext, useState, useContext, useEffect, ReactNode } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { post } from "@/lib/api-utils";


interface User {
  id: number;
  username: string;
  name: string;
  email: string;
  role: "admin" | "staff" | "couple";
  passwordChangeRequired?: boolean;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string, confirmPassword: string) => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: async () => {},
  logout: async () => {},
  changePassword: async () => {},
  isLoading: true,
});

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(() => {
    // Start with false if we have cached user to prevent unnecessary loading states
    return !sessionStorage.getItem('auth_user');
  });
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Check if user is already logged in
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        // First check sessionStorage for cached user
        const cachedUser = sessionStorage.getItem('auth_user');
        if (cachedUser) {
          try {
            const user = JSON.parse(cachedUser);
            // Check if cached user is not too old (max 1 hour)
            const cacheTime = sessionStorage.getItem('auth_user_time');
            const isValidCache = cacheTime && (Date.now() - parseInt(cacheTime)) < 3600000; // 1 hour
            
            if (isValidCache) {
              // For admin users, always verify password change requirement with server
              // Never trust cache for critical security flags
              if (user.role === 'admin') {
                // Skip cache and verify with server below
              } else {
                setUser(user);
                setIsLoading(false);
                // Still verify with server in background but don't block UI
                verifyUserInBackground();
                return;
              }
            } else {
              // Clear expired cache
              sessionStorage.removeItem('auth_user');
              sessionStorage.removeItem('auth_user_time');
            }
          } catch (e) {
            // Clear invalid cache
            sessionStorage.removeItem('auth_user');
            sessionStorage.removeItem('auth_user_time');
          }
        }

        // Add session ID manually to requests if available
        const sessionCookie = document.cookie
          .split('; ')
          .find(row => row.startsWith('connect.sid='));
        
        const response = await fetch("/api/auth/user", {
          credentials: "include",
          headers: {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "Cache-Control": "no-cache"
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.user) {
            const userData = {
              ...data.user,
              passwordChangeRequired: data.passwordChangeRequired || false
            };
            setUser(userData);
            // Cache user in sessionStorage with timestamp
            sessionStorage.setItem('auth_user', JSON.stringify(userData));
            sessionStorage.setItem('auth_user_time', Date.now().toString());
          }
        }
      } finally {
        setIsLoading(false);
      }
    };

    const verifyUserInBackground = async () => {
      try {
        const response = await fetch("/api/auth/user", {
          credentials: "include",
          headers: {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "Cache-Control": "no-cache"
          }
        });

        if (!response.ok) {
          // Session expired, clear cache and redirect
          sessionStorage.removeItem('auth_user');
          setUser(null);
        }
      } catch (e) {
        // Network error, keep cached user for now
      }
    };

    checkAuthStatus();
  }, []);

  const login = async (username: string, password: string) => {
    setIsLoading(true);
    
    try {
      const response = await post("/api/auth/login", { username, password });
      
      const userData = {
        ...response.data.user,
        passwordChangeRequired: response.data.passwordChangeRequired || false
      };
      
      setUser(userData);
      
      // Cache user in sessionStorage with timestamp
      sessionStorage.setItem('auth_user', JSON.stringify(userData));
      sessionStorage.setItem('auth_user_time', Date.now().toString());
      
      // Let the auth page handle the redirect based on passwordChangeRequired
      // No need to manually redirect here as useEffect in auth-page will handle it
      
      toast({
        title: "Login Successful",
        description: `Welcome back, ${response.data.user.name}!`,
      });
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    
    try {
      await post("/api/auth/logout", {});
      setUser(null);
      
      // Clear cached user and timestamp
      sessionStorage.removeItem('auth_user');
      sessionStorage.removeItem('auth_user_time');
      
      // Redirect to auth page
      setLocation("/auth");
      
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Logout Failed",
        description: "There was an error logging out. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string, confirmPassword: string) => {
    setIsLoading(true);
    
    try {
      const response = await post("/api/auth/change-password", { 
        currentPassword, 
        newPassword, 
        confirmPassword 
      });
      
      // Immediately clear cache to force server verification on next check
      sessionStorage.removeItem('auth_user');
      sessionStorage.removeItem('auth_user_time');
      
      // Update user state to reflect password change is no longer required
      if (user) {
        const updatedUser = { ...user, passwordChangeRequired: false };
        setUser(updatedUser);
        // Cache the updated user with fresh timestamp
        sessionStorage.setItem('auth_user', JSON.stringify(updatedUser));
        sessionStorage.setItem('auth_user_time', Date.now().toString());
      }
      
      toast({
        title: "Password Changed",
        description: "Your password has been successfully updated.",
      });
      
      // Redirect to dashboard after successful password change
      window.location.href = "/dashboard";
      
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, changePassword, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
