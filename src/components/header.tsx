import { Rocket } from "lucide-react";

export default function Header() {
  return (
    <header className="mb-8 flex flex-col items-center text-center">
      <div className="mb-2 flex items-center gap-3">
        <Rocket className="h-8 w-8 text-primary" />
        <h1 className="text-4xl font-bold tracking-tight text-primary font-headline">
          ExoPredict
        </h1>
      </div>
      <p className="max-w-2xl text-muted-foreground">
        Leverage AI to predict the probability of exoplanet candidates from Kepler and TESS observational data.
      </p>
    </header>
  );
}
