"use client";

import React, { useState } from 'react';
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

interface ModelTuningProps {
    onModelTuned: () => void;
    tunedModels: TunedModel[];
}

const ModelTuning: React.FC<ModelTuningProps> = ({ onModelTuned, tunedModels }) => {
    const [modelType, setModelType] = useState<ModelType>('Kepler');
    const [isTuning, setIsTuning] = useState(false);
    const { toast } = useToast();

    const handleTuneModel = async () => {
        setIsTuning(true);
        try {
            const result = await tuneModel(modelType);
            toast({
                title: 'Model Tuning Started',
                description: `Tuning for ${result.model_name} completed with accuracy: ${result.accuracy.toFixed(2)}`,
            });
            onModelTuned();
        } catch (error) {
            console.error('Error tuning model:', error);
            toast({
                variant: 'destructive',
                title: 'Tuning Error',
                description: 'An error occurred while tuning the model.',
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
                    <CardDescription>Select a base model and tune its hyperparameters to create a new, optimized model version.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <label>Select Base Model</label>
                        <Select onValueChange={(v) => setModelType(v as ModelType)} defaultValue={modelType}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a model" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Kepler">Kepler</SelectItem>
                                <SelectItem value="TESS">TESS</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <Button onClick={handleTuneModel} disabled={isTuning} className="w-full">
                        {isTuning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {isTuning ? 'Tuning Model...' : `Tune ${modelType} Model`}
                    </Button>
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
