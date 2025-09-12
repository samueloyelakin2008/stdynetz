import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from "firebase/auth";
import { auth, googleProvider, db } from "../config/firebase"; // ✅ include db
import { toast } from "react-hot-toast";
import { doc, setDoc, getDoc, collection } from "firebase/firestore";

interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
}

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const mapFirebaseUser = (firebaseUser: FirebaseUser): User => ({
    uid: firebaseUser.uid,
    email: firebaseUser.email || "",
    displayName: firebaseUser.displayName || "",
    photoURL: firebaseUser.photoURL || "",
  });

  const initializeUserInFirestore = async (user: User) => {
    try {
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        await setDoc(userRef, {
          displayName: user.displayName,
          email: user.email,
          photoURL: user.photoURL,
          createdAt: new Date(),
        });

        // Create empty subcollections
        await Promise.all([
          collection(userRef, "enrolledCourses"),
          collection(userRef, "studyGroups"),
          collection(userRef, "upcomingClasses"),
          collection(userRef, "recentActivity"),
        ]);
      }
    } catch (err) {
      console.error("Error initializing user in Firestore:", err);
    }
  };

  const signInWithGoogle = async (): Promise<void> => {
    try {
      setLoading(true);
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) {
        const user = mapFirebaseUser(result.user);
        setCurrentUser(user);

        // ✅ Initialize Firestore user document if new
        await initializeUserInFirestore(user);

        toast.success(`Welcome ${user.displayName}! 🎉`, {
          duration: 4000,
          position: "top-center",
        });

        window.location.href = "/dashboard"; // redirect
      }
    } catch (error) {
      console.error("Error signing in with Google:", error);
      toast.error("Failed to sign in with Google. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      setLoading(true);
      await signOut(auth);
      setCurrentUser(null);
      toast.success("Logged out successfully");
      window.location.href = "/";
    } catch (error) {
      console.error("Error signing out:", error);
      toast.error("Failed to sign out");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setCurrentUser(mapFirebaseUser(firebaseUser));
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const value: AuthContextType = { currentUser, loading, signInWithGoogle, logout };

  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
};
