"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { HelpCircle, Loader2 } from "lucide-react";

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
  FormDescription,
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
import { Textarea } from "@/components/ui/textarea";
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
} from "@/lib/definitions";
import {
  populateParametersFromPrompt,
  getPrediction,
  getExplanationForPrediction,
} from "@/app/actions";
import Header from "@/components/header";
import CircularProgress from "@/components/circular-progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";

type Prediction = {
  accuracy: number;
  explanation: string;
};

const getInitialValues = (fields: FormFieldConfig[]) => {
  return fields.reduce((acc, field) => {
    acc[field.name] = "";
    return acc;
  }, {} as Record<string, string | number>);
};

export default function Home() {
  const [modelType, setModelType] = React.useState<ModelType>("Kepler");
  const [isLoadingPrompt, setIsLoadingPrompt] = React.useState(false);
  const [isLoadingPrediction, setIsLoadingPrediction] = React.useState(false);
  const [prediction, setPrediction] = React.useState<Prediction | null>(null);
  const [prompt, setPrompt] = React.useState("");
  const { toast } = useToast();

  const formSchema = modelType === "Kepler" ? KeplerSchema : TESSchema;
  const fields: FormFieldConfig[] =
    modelType === "Kepler" ? keplerFields : tessFields;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: getInitialValues(fields),
  });

  React.useEffect(() => {
    const newFields = modelType === "Kepler" ? keplerFields : tessFields;
    form.reset(getInitialValues(newFields));
    setPrediction(null);
  }, [modelType, form]);

  const handleModelChange = (value: ModelType) => {
    setModelType(value);
  };

  const handleGenerateParams = async () => {
    if (!prompt) {
      toast({
        variant: "destructive",
        title: "Prompt is empty",
        description: "Please enter a description to generate parameters.",
      });
      return;
    }
    setIsLoadingPrompt(true);
    try {
      const result = await populateParametersFromPrompt(prompt, modelType);
      if (result) {
        const parsedResult = Object.entries(result).reduce((acc, [key, value]) => {
          acc[key] = value;
          return acc;
        }, {} as Record<string, any>);
        form.reset(parsedResult);
        toast({
          title: "Parameters Generated",
          description: "The form has been populated with AI-generated values.",
        });
      }
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Generation Failed",
        description: "Could not generate parameters from the prompt.",
      });
    } finally {
      setIsLoadingPrompt(false);
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoadingPrediction(true);
    setPrediction(null);
    try {
      const payload = { ...values, modelType };
      const { accuracy } = await getPrediction(payload);
      const { explanation } = await getExplanationForPrediction(
        modelType,
        values,
        accuracy
      );
      setPrediction({ accuracy, explanation });
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
    <TooltipProvider>
      <main className="container mx-auto min-h-screen p-4 sm:p-6 lg:p-8">
        <Header />
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:items-start">
          <Card className="w-full">
            <CardHeader>
              <CardTitle className="font-headline text-2xl">
                Exoplanet Prediction
              </CardTitle>
              <CardDescription>
                Select a model and provide parameters to predict the likelihood
                of it being an exoplanet.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-8"
                >
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="modelType"
                      render={() => (
                        <FormItem>
                          <FormLabel>Select Model</FormLabel>
                          <Select
                            onValueChange={(v) => handleModelChange(v as ModelType)}
                            defaultValue={modelType}
                            value={modelType}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a model" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Kepler">Kepler</SelectItem>
                              <SelectItem value="TESS">TESS</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="space-y-2">
                       <Label htmlFor="ai-prompt">
                        Generate Parameters with AI
                      </Label>
                      <Textarea
                        id="ai-prompt"
                        placeholder="e.g., 'A hot Jupiter orbiting a sun-like star very closely...'"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        className="bg-card"
                      />
                      <Button
                        type="button"
                        onClick={handleGenerateParams}
                        disabled={isLoadingPrompt}
                        className="bg-primary hover:bg-primary/90"
                      >
                        {isLoadingPrompt && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Generate with AI
                      </Button>
                      <FormDescription>
                        Describe a hypothetical exoplanet, and AI will fill in the parameters for you.
                      </FormDescription>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      {fields.map((field) => (
                        <FormField
                          key={field.name}
                          control={form.control}
                          name={field.name as any}
                          render={({ field: formField }) => (
                            <FormItem>
                              <div className="flex items-center gap-2">
                                <FormLabel>{field.label}</FormLabel>
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
                    className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
                    disabled={isLoadingPrediction}
                  >
                    {isLoadingPrediction && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Run Prediction
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          <div className="sticky top-8">
            <Card>
              <CardHeader>
                <CardTitle className="font-headline text-2xl">
                  Prediction Results
                </CardTitle>
                <CardDescription>
                  The model's confidence in the prediction.
                </CardDescription>
              </header>
              <CardContent className="flex flex-col items-center justify-center gap-6 text-center">
                {isLoadingPrediction ? (
                  <div className="flex flex-col items-center justify-center gap-4 py-8">
                     <Loader2 className="h-16 w-16 animate-spin text-accent" />
                    <p className="text-muted-foreground">Running prediction...</p>
                  </div>
                ) : prediction ? (
                  <>
                    <CircularProgress progress={prediction.accuracy} />
                    <h3 className="text-lg font-semibold text-foreground">
                      {modelType} Model Accuracy
                    </h3>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-2 py-8 text-muted-foreground">
                    <p>Results will be displayed here.</p>
                  </div>
                )}
              </CardContent>
              {prediction && (
                <CardFooter className="flex-col items-start gap-4">
                  <CardTitle className="text-xl font-headline">
                    Prediction Explanation
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">{prediction.explanation}</p>
                </CardFooter>
              )}
            </Card>
          </div>
        </div>
      </main>
    </TooltipProvider>
  );
}
