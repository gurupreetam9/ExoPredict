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
  getPrediction,
  getExplanationForPrediction,
} from "@/app/actions";
import Header from "@/components/header";
import CircularProgress from "@/components/circular-progress";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BatchPrediction from "@/components/batch-prediction";

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

export default function Home() {
  const [modelType, setModelType] = React.useState<ModelType>("Kepler");
  const [isLoadingPrediction, setIsLoadingPrediction] = React.useState(false);
  const [prediction, setPrediction] = React.useState<Prediction | null>(null);
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

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoadingPrediction(true);
    setPrediction(null);

    try {
      const features = fields.map(field => {
        const val = values[field.name];
        return typeof val === "string" ? parseFloat(val) : val;
      });

      const payload = {
        model: modelType.toLowerCase(),
        features: features
      };

      const { prediction, confidence } = await getPrediction(payload);
      
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
    <TooltipProvider>
      <main className="container mx-auto min-h-screen p-4 sm:p-6 lg:p-8">
        <Header />

        <Tabs defaultValue="single" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="single">Single Prediction</TabsTrigger>
            <TabsTrigger value="batch">Batch Prediction</TabsTrigger>
          </TabsList>
          <TabsContent value="single">
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:items-start mt-4">
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
                  </CardHeader>
                  <CardContent className="flex flex-col items-center justify-center gap-6 text-center">
                    {isLoadingPrediction ? (
                      <div className="flex flex-col items-center justify-center gap-4 py-8">
                        <Loader2 className="h-16 w-16 animate-spin text-accent" />
                        <p className="text-muted-foreground">Running prediction...</p>
                      </div>
                    ) : prediction ? (
                      <>
                        <CircularProgress progress={prediction.confidence} />
                        <div className="flex flex-col gap-1">
                          <h3 className="text-lg font-semibold text-foreground">
                            Prediction: <span className="font-bold text-primary">{prediction.class}</span>
                          </h3>
                          <p className="text-muted-foreground">
                            {modelType} Model Confidence
                          </p>
                        </div>
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
          </TabsContent>
          <TabsContent value="batch">
            <BatchPrediction />
          </TabsContent>
        </Tabs>
      </main>
    </TooltipProvider>
  );
}
