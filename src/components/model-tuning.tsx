
"use client";

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { ModelType, TunedModel } from '@/lib/definitions';
import { tuneModel, getTuningStatus } from '@/app/actions';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from './ui/form';
import { Input } from './ui/input';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';

interface ModelTuningProps {
    onModelTuned: () => void;
    tunedModels: TunedModel[];
}

const formSchema = z.object({
    modelType: z.enum(['Kepler', 'TESS']),
    rf_n_estimators: z.string().optional(),
    rf_max_depth: z.string().optional(),
    xgb_n_estimators: z.string().optional(),
    xgb_max_depth: z.string().optional(),
    gb_n_estimators: z.string().optional(),
    gb_max_depth: z.string().optional(),
}).refine(data => 
    data.rf_n_estimators || data.rf_max_depth || 
    data.xgb_n_estimators || data.xgb_max_depth || 
    data.gb_n_estimators || data.gb_max_depth, 
    { message: "At least one hyperparameter field must be filled.", path: ["rf_n_estimators"] }
);

const ModelTuning: React.FC<ModelTuningProps> = ({ onModelTuned, tunedModels }) => {
    const [isTuning, setIsTuning] = useState(false);
    const [pollingTaskId, setPollingTaskId] = useState<string | null>(null);
    const { toast } = useToast();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            modelType: 'Kepler',
            rf_n_estimators: '',
            rf_max_depth: '',
            xgb_n_estimators: '',
            xgb_max_depth: '',
            gb_n_estimators: '',
            gb_max_depth: '',
        },
    });

    useEffect(() => {
        let intervalId: NodeJS.Timeout | null = null;
    
        if (pollingTaskId) {
          intervalId = setInterval(async () => {
            console.log(`Polling for task ID: ${pollingTaskId}`);
            try {
              const statusResult = await getTuningStatus(pollingTaskId);
              console.log('Polling result:', statusResult);
    
              if (statusResult.status === 'SUCCESS') {
                toast({
                  title: 'Model Tuning Completed',
                  description: `Tuning for ${statusResult.result.model_name} finished with accuracy: ${statusResult.result.accuracy.toFixed(4)}`,
                });
                onModelTuned();
                setIsTuning(false);
                setPollingTaskId(null); // Stop polling
              } else if (statusResult.status === 'FAILURE') {
                toast({
                  variant: 'destructive',
                  title: 'Tuning Failed',
                  description: statusResult.error || 'An unknown error occurred during tuning.',
                });
                setIsTuning(false);
                setPollingTaskId(null); // Stop polling
              }
              // If status is 'PENDING', do nothing and wait for the next poll.
    
            } catch (error) {
              console.error('Error polling tuning status:', error);
              const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
              toast({
                variant: 'destructive',
                title: 'Polling Error',
                description: `Could not get tuning status: ${errorMessage}`,
              });
              setIsTuning(false);
              setPollingTaskId(null); // Stop polling on error
            }
          }, 5000); // Poll every 5 seconds
        }
    
        // Cleanup function to clear the interval when the component unmounts or the task ID changes
        return () => {
          if (intervalId) {
            clearInterval(intervalId);
          }
        };
      }, [pollingTaskId, onModelTuned, toast]);


    const handleTuneModel = async (values: z.infer<typeof formSchema>) => {
        setIsTuning(true);
        console.log("Starting model tuning with values:", values);
        try {
            const params = {
                rf_n_estimators: values.rf_n_estimators || '',
                rf_max_depth: values.rf_max_depth || '',
                xgb_n_estimators: values.xgb_n_estimators || '',
                xgb_max_depth: values.xgb_max_depth || '',
                gb_n_estimators: values.gb_n_estimators || '',
                gb_max_depth: values.gb_max_depth || '',
            };
            const result = await tuneModel(values.modelType, params);
            console.log("Model tuning started, result:", result);
            if (result.task_id) {
                toast({
                    title: 'Model Tuning Started',
                    description: 'The model is being tuned in the background. You will be notified upon completion.',
                });
                setPollingTaskId(result.task_id);
            } else {
                 throw new Error("Backend did not return a task_id.");
            }
        } catch (error) {
            console.error('Error in handleTuneModel:', error);
            const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
            toast({
                variant: 'destructive',
                title: 'Tuning Error',
                description: `Could not start tuning process: ${errorMessage}`,
            });
            setIsTuning(false);
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
            <Card>
                <CardHeader>
                    <CardTitle>Tune a New Stacking Model</CardTitle>
                    <CardDescription>Define hyperparameter grids for the base models in the stacking ensemble. The process will run in the background.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(handleTuneModel)} className="space-y-6">
                            <FormField
                                control={form.control}
                                name="modelType"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Select Base Dataset</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isTuning}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select a dataset" />
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

                            <Accordion type="multiple" defaultValue={['rf']} className="w-full">
                                <AccordionItem value="rf">
                                    <AccordionTrigger>Random Forest</AccordionTrigger>
                                    <AccordionContent className="space-y-4">
                                        <FormField control={form.control} name="rf_n_estimators" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>N Estimators</FormLabel>
                                                <FormControl><Input placeholder="e.g., 100, 200" {...field} disabled={isTuning} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <FormField control={form.control} name="rf_max_depth" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Max Depth</FormLabel>
                                                <FormControl><Input placeholder="e.g., 10, 20" {...field} disabled={isTuning} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                    </AccordionContent>
                                </AccordionItem>
                                <AccordionItem value="xgb">
                                    <AccordionTrigger>XGBoost</AccordionTrigger>
                                    <AccordionContent className="space-y-4">
                                        <FormField control={form.control} name="xgb_n_estimators" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>N Estimators</FormLabel>
                                                <FormControl><Input placeholder="e.g., 100, 200" {...field} disabled={isTuning} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <FormField control={form.control} name="xgb_max_depth" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Max Depth</FormLabel>
                                                <FormControl><Input placeholder="e.g., 5, 10" {...field} disabled={isTuning} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                    </AccordionContent>
                                </AccordionItem>
                                <AccordionItem value="gb">
                                    <AccordionTrigger>Gradient Boosting</AccordionTrigger>
                                    <AccordionContent className="space-y-4">
                                        <FormField control={form.control} name="gb_n_estimators" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>N Estimators</FormLabel>
                                                <FormControl><Input placeholder="e.g., 100, 200" {...field} disabled={isTuning} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <FormField control={form.control} name="gb_max_depth" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Max Depth</FormLabel>
                                                <FormControl><Input placeholder="e.g., 3, 5" {...field} disabled={isTuning} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                    </AccordionContent>
                                </AccordionItem>
                            </Accordion>
                            
                            <Button type="submit" disabled={isTuning} className="w-full">
                                {isTuning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                {isTuning ? 'Tuning in Progress...' : `Tune ${form.watch('modelType')} Stacking Model`}
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Available Tuned Models</CardTitle>
                    <CardDescription>These are the custom stacking models you have trained.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="max-h-[400px] overflow-auto rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Base Model</TableHead>
                                    <TableHead>Accuracy</TableHead>
                                    <TableHead>Created At</TableHead>
                                    <TableHead>Hyperparameters</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {tunedModels.length > 0 ? (
                                    tunedModels.map((model) => (
                                        <TableRow key={model.model_id}>
                                            <TableCell className="capitalize">{model.model_name}</TableCell>
                                            <TableCell>{model.accuracy.toFixed(4)}</TableCell>
                                            <TableCell>{new Date(model.created_at).toLocaleString()}</TableCell>
                                            <TableCell className="text-xs max-w-xs truncate">{JSON.stringify(model.hyperparameters)}</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center">No tuned models yet.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default ModelTuning;

    