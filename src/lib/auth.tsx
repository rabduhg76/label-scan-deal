import React, { createContext, useContext, useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";
import { AllergenCategory } from "./gluten";
import { checkUserSubscription } from "./stripe.functions";
import { useServerFn } from "@tanstack/react-start";

export interface AuthUser {
  sub: string;
  name: string;
  email: string;
  picture?: string;
  isSubscribed?: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isSubscribed: boolean;
  isVerifyingSub: boolean;
  cancelAtPeriodEnd: boolean;
  periodEndDate: string | null;
  activeAllergens: AllergenCategory[];
  toggleAllergen: (id: AllergenCategory) => void;
  setAllergens: (allergens: AllergenCategory[]) => void;
  loginWithCredential: (credential: string) => void;
  loginMock: (customUser?: Partial<AuthUser>) => void;
  logout: () => void;
  verifyStripeSubscription: (email?: string) => Promise<boolean>;
  setSubscribed: (subscribed: boolean) => void;
  setCancelledState: (cancelled: boolean, endDate: string | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = "gfd_auth_user";
const ALLERGENS_KEY = "gfd_active_allergens";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isSubscribed, setIsSubscribedState] = useState<boolean>(false);
  const [isVerifyingSub, setIsVerifyingSub] = useState<boolean>(false);
  const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState<boolean>(false);
  const [periodEndDate, setPeriodEndDate] = useState<string | null>(null);
  const [activeAllergens, setActiveAllergens] = useState<AllergenCategory[]>(["gluten"]);
  const [isLoading, setIsLoading] = useState(true);

  const checkSubFn = useServerFn(checkUserSubscription);

  const getSubKey = (email?: string) => `gfd_sub_${email || "anon"}`;

  const setCancelledState = (cancelled: boolean, endDate: string | null) => {
    setCancelAtPeriodEnd(cancelled);
    setPeriodEndDate(endDate);
  };

  const verifyStripeSubscription = async (emailOverride?: string): Promise<boolean> => {
    const targetEmail = emailOverride || user?.email;
    if (!targetEmail) return false;

    setIsVerifyingSub(true);
    try {
      const res = await checkSubFn({ data: { email: targetEmail } });
      if (res.ok && res.isSubscribed) {
        setIsSubscribedState(true);
        localStorage.setItem(getSubKey(targetEmail), "true");
        setCancelAtPeriodEnd(res.cancelAtPeriodEnd);
        setPeriodEndDate(res.periodEndDate);
        return true;
      } else {
        setIsSubscribedState(false);
        setCancelAtPeriodEnd(false);
        setPeriodEndDate(null);
        localStorage.removeItem(getSubKey(targetEmail));
        return false;
      }
    } catch (err) {
      console.error("Error verifying Stripe subscription", err);
      return false;
    } finally {
      setIsVerifyingSub(false);
    }
  };

  useEffect(() => {
    try {
      let currentUser: AuthUser | null = null;
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        currentUser = JSON.parse(saved);
        setUser(currentUser);
      }

      // Check if Stripe redirected back with success
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        if (params.get("subscription") === "success" || params.has("session_id")) {
          if (currentUser?.email) {
            localStorage.setItem(getSubKey(currentUser.email), "true");
          }
          setIsSubscribedState(true);
          setCancelAtPeriodEnd(false);
          setPeriodEndDate(null);
        }
      }

      // Check user-specific subscription status
      if (currentUser?.email) {
        const userSub = localStorage.getItem(getSubKey(currentUser.email));
        setIsSubscribedState(userSub === "true");
        // Verify with live Stripe API in background
        void verifyStripeSubscription(currentUser.email);
      } else {
        setIsSubscribedState(false);
      }

      const savedAllergens = localStorage.getItem(ALLERGENS_KEY);
      if (savedAllergens) {
        setActiveAllergens(JSON.parse(savedAllergens));
      }
    } catch (e) {
      console.error("Failed to load user or subscription from localStorage", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const toggleAllergen = (id: AllergenCategory) => {
    setActiveAllergens((prev) => {
      const next = prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id];
      localStorage.setItem(ALLERGENS_KEY, JSON.stringify(next));
      return next;
    });
  };

  const setAllergens = (allergens: AllergenCategory[]) => {
    setActiveAllergens(allergens);
    localStorage.setItem(ALLERGENS_KEY, JSON.stringify(allergens));
  };

  const setSubscribed = (subscribed: boolean) => {
    setIsSubscribedState(subscribed);
    if (user?.email) {
      if (subscribed) {
        localStorage.setItem(getSubKey(user.email), "true");
      } else {
        localStorage.removeItem(getSubKey(user.email));
      }
    }
  };

  const loginWithCredential = async (credential: string) => {
    try {
      const decoded: any = jwtDecode(credential);
      const authUser: AuthUser = {
        sub: decoded.sub,
        name: decoded.name || decoded.email || "Google User",
        email: decoded.email,
        picture: decoded.picture,
      };
      setUser(authUser);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(authUser));

      // Reset subscription to this new user's status
      const cached = localStorage.getItem(getSubKey(authUser.email));
      setIsSubscribedState(cached === "true");

      // Verify against Stripe for this exact email
      await verifyStripeSubscription(authUser.email);
    } catch (err) {
      console.error("Failed to decode Google JWT credential", err);
    }
  };

  const loginMock = (customUser?: Partial<AuthUser>) => {
    const mock: AuthUser = {
      sub: "mock-123",
      name: customUser?.name || "Demo User",
      email: customUser?.email || "demo@glutenfreedeal.com",
      picture: customUser?.picture || "https://api.dicebear.com/7.x/bottts/svg?seed=glutenfree",
      ...customUser,
    };
    setUser(mock);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mock));
    const cached = localStorage.getItem(getSubKey(mock.email));
    setIsSubscribedState(cached === "true");
  };

  const logout = () => {
    setUser(null);
    setIsSubscribedState(false);
    setCancelAtPeriodEnd(false);
    setPeriodEndDate(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isSubscribed,
        isVerifyingSub,
        cancelAtPeriodEnd,
        periodEndDate,
        activeAllergens,
        toggleAllergen,
        setAllergens,
        loginWithCredential,
        loginMock,
        logout,
        verifyStripeSubscription,
        setSubscribed,
        setCancelledState,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
