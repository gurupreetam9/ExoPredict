"use client";

import { Rocket, LogOut, User as UserIcon, Loader2 } from "lucide-react";
import { useAuth, useUser } from "@/firebase";
import { Button } from "./ui/button";
import { initiateAnonymousSignIn } from "@/firebase/non-blocking-login";
import { signOut } from "firebase/auth";

export default function Header() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();

  const handleLogin = () => {
    initiateAnonymousSignIn(auth);
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  return (
    <header className="mb-8 flex items-center justify-between">
      <div className="flex flex-col items-start text-left">
          <div className="mb-2 flex items-center gap-3">
              <Rocket className="h-8 w-8 text-primary" />
              <h1 className="text-4xl font-bold tracking-tight text-primary font-headline">
              ExoPredict
              </h1>
          </div>
          <p className="max-w-2xl text-muted-foreground">
              Leverage AI to predict the probability of exoplanet candidates from Kepler and TESS observational data.
          </p>
      </div>
      <div className="flex items-center gap-4">
        {isUserLoading ? (
            <Loader2 className="h-6 w-6 animate-spin" />
        ) : user ? (
          <>
            <div className="flex items-center gap-2">
                <UserIcon className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Anonymous User</span>
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </>
        ) : (
          <Button size="sm" onClick={handleLogin}>
            Sign In Anonymously
          </Button>
        )}
      </div>
    </header>
  );
}
