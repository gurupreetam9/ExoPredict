

"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { HelpCircle, Loader2, Wand2 } from "lucide-react";
import { useAuth, useUser } from "@/firebase";
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation'


import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import {
  type ModelType,
  keplerFields,
  tessFields,
  KeplerSchema,
  TESSchema,
  FormFieldConfig,
  TunedModel,
} from "@/lib/definitions";
import {
  getPrediction,
  getTunedPrediction,
  getExplanationForPrediction,
  getTunedModels,
} from "@/app/actions";
import CircularProgress from "@/components/circular-progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BatchPrediction from "@/components/batch-prediction";
import ModelTuning from "@/components/model-tuning";
import { initiateAnonymousSignIn } from "@/firebase/non-blocking-login";

type Prediction = {
  class: string;
  confidence: number;
  explanation: string;
};

const getInitialValues = (fields: FormFieldConfig[]) => {
  return fields.reduce((acc, field) => {
    acc[field.name] = "";
    return acc;
  }, {} as Record<string, string | number>);
};

function SinglePredictionTab() {
  const [modelType, setModelType] = React.useState<ModelType>("Kepler");
  const [selectedModel, setSelectedModel] = React.useState<string>("default");
  const [tunedModels, setTunedModels] = React.useState<TunedModel[]>([]);
  const [isLoadingPrediction, setIsLoadingPrediction] = React.useState(false);
  const [prediction, setPrediction] = React.useState<Prediction | null>(null);
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();

  const formSchema = modelType === "Kepler" ? KeplerSchema : TESSchema;
  const fields: FormFieldConfig[] =
    modelType === "Kepler" ? keplerFields : tessFields;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: getInitialValues(fields),
  });

  const fetchTunedModels = React.useCallback(async () => {
    try {
      const models = await getTunedModels();
      setTunedModels(models);
    } catch (error) {
      console.error("Failed to fetch tuned models", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not load tuned models.",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    fetchTunedModels();
  }, [fetchTunedModels]);
  
  React.useEffect(() => {
    // Check for query params and populate the form
    const params = Object.fromEntries(searchParams.entries());
    if (Object.keys(params).length > 0) {
       const urlModelType = params.modelType as ModelType;
       
       if (urlModelType && urlModelType !== modelType) {
          setModelType(urlModelType);
          return; 
       }

       const newFields = urlModelType === "Kepler" ? keplerFields : tessFields;
       const fieldNames = newFields.map(f => f.name);
       const valuesToSet: Record<string, any> = getInitialValues(newFields);
       let paramsApplied = false;
       for (const [key, value] of Object.entries(params)) {
         if (fieldNames.includes(key)) {
           valuesToSet[key] = parseFloat(value) || value;
           paramsApplied = true;
         }
       }
       
      if (paramsApplied) {
        form.reset(valuesToSet);
        setPrediction(null);
        setSelectedModel("default");

        toast({
          title: "Parameters Applied",
          description: "AI-generated parameters have been applied to the form.",
        });
        
        window.history.replaceState(null, '', window.location.pathname);
      }
    }
  }, [modelType, form, searchParams, toast, router]);

  const handleModelChange = (value: ModelType) => {
    setModelType(value);
    const newFields = value === "Kepler" ? keplerFields : tessFields;
    form.reset(getInitialValues(newFields));
    setPrediction(null);
    setSelectedModel("default");
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoadingPrediction(true);
    setPrediction(null);

    try {
      const features = fields.map(field => {
        const val = values[field.name];
        return typeof val === "string" ? parseFloat(val) : val;
      });
      
      const useTunedModel = selectedModel !== 'default';
      
      const predictionFn = useTunedModel ? getTunedPrediction : getPrediction;

      const payload = {
        model: useTunedModel ? selectedModel : modelType.toLowerCase(),
        features: features
      };

      const { prediction, confidence } = await predictionFn(payload as any);
      
      const confidencePercent = confidence * 100;

      const { explanation } = await getExplanationForPrediction(
        modelType,
        values,
        confidencePercent
      );

      setPrediction({ class: prediction, confidence: confidencePercent, explanation });
    } catch (error) {
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : "An error occurred while making the prediction.";
      toast({
        variant: "destructive",
        title: "Prediction Failed",
        description: errorMessage,
      });
    } finally {
      setIsLoadingPrediction(false);
    }
  };

  return (
    <div className="flex flex-col mt-8">
      {/* Page Header (Spans full width) */}
      <div className="w-full space-y-2 mb-8">
        <h2 className="font-headline text-4xl font-extrabold text-white tracking-tight drop-shadow-md">
          Exoplanet Prediction
        </h2>
        <p className="text-white/60 max-w-2xl">
          Select a model and provide stellar parameters to predict the likelihood
          of an exoplanet candidate. You can also leverage our AI Prompt Assistant to automatically generate parameters.
        </p>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-start">
        
        {/* Left Column: Form Card */}
        <div className="w-full">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-headline font-bold text-white tracking-wide">Input Parameters</h3>
            <Button asChild className="bg-[#00f2fe]/10 text-[#00f2fe] border border-[#00f2fe]/30 hover:bg-[#00f2fe]/20 hover:scale-105 transition-all shadow-[0_0_15px_rgba(0,242,254,0.3)] backdrop-blur-md rounded-xl">
               <Link href="/prompt">
                 <Wand2 className="w-4 h-4 mr-2" />
                 Use AI Assistant
               </Link>
            </Button>
          </div>
          <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 sm:p-8 backdrop-blur-3xl shadow-2xl">
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-8"
              >
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <FormItem>
                      <FormLabel className="text-white/80 font-medium tracking-wide">Select Base Model</FormLabel>
                      <Select
                        onValueChange={(v) => handleModelChange(v as ModelType)}
                        defaultValue={modelType}
                        value={modelType}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a base model" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Kepler">Kepler</SelectItem>
                          <SelectItem value="TESS">TESS</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                      <FormItem>
                        <FormLabel className="text-white/80 font-medium tracking-wide">Select Model Version</FormLabel>
                        <Select onValueChange={setSelectedModel} value={selectedModel}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a version" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="default">Default</SelectItem>
                                {tunedModels.filter(m => m.model_name === modelType.toLowerCase()).map(m => (
                                    <SelectItem key={m.model_id} value={m.model_id}>
                                        Tuned - {new Date(m.created_at).toLocaleString()} (Acc: {m.accuracy.toFixed(2)})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </FormItem>
                </div>


                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {fields.map((field) => (
                    <FormField
                      key={field.name}
                      control={form.control}
                      name={field.name as any}
                      render={({ field: formField }) => (
                        <FormItem>
                          <div className="flex items-center gap-2 mb-1">
                            <FormLabel className="text-white/80 font-medium tracking-wide">{field.label}</FormLabel>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="h-4 w-4 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{field.tooltip}</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder={field.placeholder}
                              {...formField}
                              value={formField.value ?? ''}
                              onChange={(e) => {
                                  const value = e.target.value;
                                  formField.onChange(value === '' ? '' : Number(value));
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
              </div>
                <Button
                  type="submit"
                  size="lg"
                  className="w-full h-14 bg-gradient-to-r from-[#00f2fe] to-[#4facfe] text-black font-extrabold text-lg tracking-wider hover:opacity-100 transition-all shadow-[0_0_20px_rgba(0,242,254,0.4)] hover:shadow-[0_0_30px_rgba(0,242,254,0.7)] hover:-translate-y-1 rounded-xl"
                  disabled={isLoadingPrediction}
                >
                  {isLoadingPrediction && (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  )}
                  Run Prediction
                </Button>
              </form>
            </Form>
        </div>
      </div>

      <div className="sticky top-28 lg:pl-12 flex flex-col gap-8">
        <div className="flex flex-col items-center justify-center p-8 bg-white/[0.02] border border-white/5 rounded-[3rem] shadow-[0_0_50px_rgba(0,242,254,0.1)] backdrop-blur-3xl">
          <h3 className="font-headline text-2xl font-bold text-white mb-2">Confidence Level</h3>
          <p className="text-white/50 text-sm mb-8 text-center max-w-xs">
              Based on the {modelType} model analysis of the provided parameters.
          </p>
          <div className="flex flex-col items-center justify-center gap-6 text-center w-full">
            {isLoadingPrediction ? (
              <div className="flex flex-col items-center justify-center gap-4 py-8">
                <Loader2 className="h-16 w-16 animate-spin text-accent" />
                <p className="text-muted-foreground">Running prediction...</p>
              </div>
            ) : prediction ? (
              <>
                <CircularProgress progress={prediction.confidence} size={240} />
                <div className="flex flex-col gap-2 mt-8 p-6 bg-white/5 rounded-2xl border border-white/10 w-full max-w-md">
                  <h3 className="text-xl font-headline tracking-wide text-white/80">
                    Result: <span className="font-extrabold text-[#00f2fe] drop-shadow-[0_0_10px_rgba(0,242,254,0.5)] text-2xl ml-2">{prediction.class}</span>
                  </h3>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center gap-8 py-8 w-full transition-opacity duration-1000">
                <CircularProgress progress={0} size={240} strokeWidth={8} />
                <div className="flex flex-col gap-2 mt-4 p-6 bg-white/[0.02] rounded-2xl border border-white/5 w-full max-w-md">
                   <h3 className="text-lg font-headline tracking-wide text-white/40 text-center">
                    Awaiting Input Data
                  </h3>
                </div>
              </div>
            )}
          </div>
        </div>
          {prediction && (
            <div className="p-8 bg-white/[0.02] border border-white/5 rounded-3xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4 duration-700">
              <h4 className="text-xl font-headline font-bold text-white mb-3">
                Analysis Breakdown
              </h4>
              <p className="text-sm text-white/70 leading-relaxed">{prediction.explanation}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function HomePageContent() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const [tunedModels, setTunedModels] = React.useState<TunedModel[]>([]);

  const fetchTunedModels = React.useCallback(async () => {
    try {
      const models = await getTunedModels();
      setTunedModels(models);
    } catch (error) {
      console.error("Failed to fetch tuned models", error);
      // Don't show a toast here to avoid bothering users if not on the tuning page
    }
  }, []);

  React.useEffect(() => {
    if(user) {
        fetchTunedModels();
    }
  }, [user, fetchTunedModels]);

  if (isUserLoading) {
      return (
          <div className="flex h-screen items-center justify-center">
              <Loader2 className="h-16 w-16 animate-spin" />
          </div>
      )
  }

  if (!user) {
    return (
        <div className="flex h-[calc(100vh-200px)] items-center justify-center">
              <Card className="glass-panel max-w-md w-full shadow-[0_0_30px_rgba(var(--primary),0.3)] animate-in fade-in zoom-in duration-500">
                  <CardHeader className="text-center">
                      <CardTitle className="font-headline text-3xl text-white">Welcome to ExoPredict</CardTitle>
                      <CardDescription className="text-lg">Please sign in to continue.</CardDescription>
                  </CardHeader>
                  <CardContent className="text-center py-6 text-muted-foreground">
                      <p>Sign in to access model tuning and prediction history.</p>
                  </CardContent>
                  <CardFooter className="flex justify-center pb-8">
                      <Button size="lg" className="shadow-[0_0_20px_rgba(var(--primary),0.6)] hover:scale-105 transition-all text-sm font-semibold" onClick={() => auth && initiateAnonymousSignIn(auth)}>
                          Sign In Anonymously
                      </Button>
                  </CardFooter>
              </Card>
        </div>
    )
  }

  return (
    <TooltipProvider>
      <main className="animate-in fade-in duration-700">
      <React.Suspense fallback={<Loader2 className="h-16 w-16 animate-spin text-primary" />}>
        <Tabs defaultValue="single" className="w-full">
          <TabsList className="grid w-full grid-cols-3 glass-panel border-white/10 rounded-xl p-1 mb-6">
            <TabsTrigger value="single" className="rounded-lg data-[state=active]:bg-primary/20 data-[state=active]:text-primary data-[state=active]:shadow-md transition-all">Single Prediction</TabsTrigger>
            <TabsTrigger value="batch" className="rounded-lg data-[state=active]:bg-primary/20 data-[state=active]:text-primary data-[state=active]:shadow-md transition-all">Batch Prediction</TabsTrigger>
            <TabsTrigger value="tuning" className="rounded-lg data-[state=active]:bg-primary/20 data-[state=active]:text-primary data-[state=active]:shadow-md transition-all">Model Tuning</TabsTrigger>
          </TabsList>
          <TabsContent value="single">
              <SinglePredictionTab />
          </TabsContent>
          <TabsContent value="batch">
            <BatchPrediction tunedModels={tunedModels} />
          </TabsContent>
           <TabsContent value="tuning">
            <ModelTuning onModelTuned={fetchTunedModels} tunedModels={tunedModels} />
          </TabsContent>
        </Tabs>
        </React.Suspense>
      </main>
    </TooltipProvider>
  );
}

export default function Home() {
    return (
        <HomePageContent />
    )
}
