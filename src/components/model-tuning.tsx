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

interface ModelTuningProps {
    onModelTuned: () => void;
    tunedModels: TunedModel[];
}

const formSchema = z.object({
    modelType: z.enum(['Kepler', 'TESS']),
    n_estimators: z.string().min(1, 'Cannot be empty').regex(/^(\d+)(,\s*\d+)*$/, 'Must be comma-separated numbers'),
    max_depth: z.string().min(1, 'Cannot be empty').regex(/^(\d+)(,\s*\d+)*$/, 'Must be comma-separated numbers'),
});

const ModelTuning: React.FC<ModelTuningProps> = ({ onModelTuned, tunedModels }) => {
    const [isTuning, setIsTuning] = useState(false);
    const { toast } = useToast();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            modelType: 'Kepler',
            n_estimators: '100, 200',
            max_depth: '10, 20',
        },
    });

    const handleTuneModel = async (values: z.infer<typeof formSchema>) => {
        setIsTuning(true);
        try {
            const result = await tuneModel(values.modelType, values.n_estimators, values.max_depth);
            toast({
                title: 'Model Tuning Completed',
                description: `Tuning for ${result.model_name} finished with accuracy: ${result.accuracy.toFixed(4)}`,
            });
            onModelTuned();
        } catch (error) {
            console.error('Error tuning model:', error);
            const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
            toast({
                variant: 'destructive',
                title: 'Tuning Error',
                description: errorMessage,
            });
        } finally {
            setIsTuning(false);
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
            <Card>
                <CardHeader>
                    <CardTitle>Tune a New Model</CardTitle>
                    <CardDescription>Select a base model and define hyperparameters to create a new, optimized model version.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(handleTuneModel)} className="space-y-6">
                            <FormField
                                control={form.control}
                                name="modelType"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Select Base Model</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                            <FormField
                                control={form.control}
                                name="n_estimators"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>N Estimators</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g., 100, 200, 300" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="max_depth"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Max Depth</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g., 10, 20, 30" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <Button type="submit" disabled={isTuning} className="w-full">
                                {isTuning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                {isTuning ? 'Tuning Model...' : `Tune ${form.watch('modelType')} Model`}
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Available Tuned Models</CardTitle>
                    <CardDescription>These are the custom models you have trained.</CardDescription>
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
                                            <TableCell className="text-xs">{JSON.stringify(model.hyperparameters)}</TableCell>
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