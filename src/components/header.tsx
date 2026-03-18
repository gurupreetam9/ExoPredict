
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
    if (auth) {
      initiateAnonymousSignIn(auth);
    }
  };

  const handleLogout = async () => {
    if (auth) {
      await signOut(auth);
    }
  };

  return (
    <header className="sticky top-4 z-50 mb-10 flex flex-col md:flex-row items-center justify-between glass-panel rounded-2xl px-6 py-4">
      <div className="flex flex-col items-center md:items-start text-center md:text-left mb-4 md:mb-0">
          <div className="mb-1 flex items-center gap-3">
              <div className="relative">
                <Rocket className="h-8 w-8 text-primary relative z-10" />
                <div className="absolute inset-0 bg-primary/40 blur-xl rounded-full" />
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white font-headline text-glow">
                ExoPredict
              </h1>
          </div>
          <p className="max-w-xl text-sm md:text-base text-muted-foreground font-body">
              Leverage AI to predict the probability of exoplanet candidates from Kepler and TESS observational data.
          </p>
      </div>
      <div className="flex items-center gap-4">
        {isUserLoading || !auth ? (
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
        ) : user ? (
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                <UserIcon className="h-4 w-4 text-primary drop-shadow-[0_0_8px_rgba(0,242,254,0.6)]" />
                <span className="text-xs font-medium text-white/80">Anonymous</span>
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout} className="border-white/10 hover:bg-white/10 transition-colors">
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        ) : (
          <Button size="sm" onClick={handleLogin} className="shadow-[0_0_15px_rgba(var(--primary),0.5)] transition-all hover:scale-105">
            Sign In Anonymously
          </Button>
        )}
      </div>
    </header>
  );
}
