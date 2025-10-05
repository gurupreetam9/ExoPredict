
"use client";

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { ModelType, TunedModel } from '@/lib/definitions';
import { tuneModel } from '@/app/actions';
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
    const { toast } = useToast();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            modelType: 'Kepler',
            rf_n_estimators: '100, 200',
            rf_max_depth: '10, 20',
            xgb_n_estimators: '',
            xgb_max_depth: '',
            gb_n_estimators: '',
            gb_max_depth: '',
        },
    });

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
            console.log("Model tuning successful, result:", result);
            toast({
                title: 'Model Tuning Completed',
                description: `Tuning for ${result.model_name} finished with accuracy: ${result.accuracy.toFixed(4)}`,
            });
            onModelTuned();
        } catch (error) {
            console.error('Error in handleTuneModel:', error);
            const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
            toast({
                variant: 'destructive',
                title: 'Tuning Error',
                description: errorMessage,
            });
        } finally {
            console.log("Finished model tuning attempt.");
            setIsTuning(false);
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
            <Card>
                <CardHeader>
                    <CardTitle>Tune a New Stacking Model</CardTitle>
                    <CardDescription>Define hyperparameter grids for the base models in the stacking ensemble.</CardDescription>
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
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
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

                            <Accordion type="multiple" defaultValue={['rf', 'xgb', 'gb']} className="w-full">
                                <AccordionItem value="rf">
                                    <AccordionTrigger>Random Forest</AccordionTrigger>
                                    <AccordionContent className="space-y-4">
                                        <FormField control={form.control} name="rf_n_estimators" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>N Estimators</FormLabel>
                                                <FormControl><Input placeholder="e.g., 100, 200" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <FormField control={form.control} name="rf_max_depth" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Max Depth</FormLabel>
                                                <FormControl><Input placeholder="e.g., 10, 20" {...field} /></FormControl>
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
                                                <FormControl><Input placeholder="e.g., 100, 200" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <FormField control={form.control} name="xgb_max_depth" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Max Depth</FormLabel>
                                                <FormControl><Input placeholder="e.g., 5, 10" {...field} /></FormControl>
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
                                                <FormControl><Input placeholder="e.g., 100, 200" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <FormField control={form.control} name="gb_max_depth" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Max Depth</FormLabel>
                                                <FormControl><Input placeholder="e.g., 3, 5" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                    </AccordionContent>
                                </AccordionItem>
                            </Accordion>
                            
                            <Button type="submit" disabled={isTuning} className="w-full">
                                {isTuning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                {isTuning ? 'Tuning Model...' : `Tune ${form.watch('modelType')} Stacking Model`}
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
