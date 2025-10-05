"use client";

import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { useToast } from '@/hooks/use-toast';
import { ModelType, keplerFields, tessFields, TunedModel } from '@/lib/definitions';
import { getBatchPredictions } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Upload, Download } from 'lucide-react';
import { Form, FormControl, FormItem, FormLabel } from './ui/form';
import { useForm } from 'react-hook-form';

type DataRow = Record<string, string | number>;
type ResultRow = DataRow & {
    prediction: string;
    confidence: number;
};

interface BatchPredictionProps {
    tunedModels: TunedModel[];
}

const BatchPrediction: React.FC<BatchPredictionProps> = ({ tunedModels }) => {
    const [modelType, setModelType] = useState<ModelType>('Kepler');
    const [selectedModel, setSelectedModel] = useState<string>("default");
    const [file, setFile] = useState<File | null>(null);
    const [data, setData] = useState<DataRow[]>([]);
    const [results, setResults] = useState<ResultRow[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const { toast } = useToast();

    // Dummy form to satisfy FormProvider context for shadcn components
    const form = useForm();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const selectedFile = e.target.files[0];
            setFile(selectedFile);
            setData([]);
            setResults([]);
            setProgress(0);
            toast({
                title: 'File Selected',
                description: `${selectedFile.name} is ready to be processed.`,
            });
        }
    };

    const processFile = () => {
        if (!file) {
            toast({
                variant: 'destructive',
                title: 'No file selected',
                description: 'Please select a file to process.',
            });
            return;
        }

        setIsLoading(true);
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const workbook = XLSX.read(e.target?.result, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet) as DataRow[];
                setData(jsonData);
                toast({
                    title: 'File Processed',
                    description: `${jsonData.length} rows loaded. Starting predictions...`,
                });
                runPredictions(jsonData);
            } catch (error) {
                console.error('Error processing file:', error);
                toast({
                    variant: 'destructive',
                    title: 'File processing error',
                    description: 'Could not read data from the file. Please ensure it is a valid CSV or XLSX file.',
                });
                setIsLoading(false);
            }
        };
        reader.onerror = () => {
            toast({
                variant: 'destructive',
                title: 'File Read Error',
                description: 'There was an error reading the file.',
            });
            setIsLoading(false);
        };
        reader.readAsBinaryString(file);
    };

    const runPredictions = async (rows: DataRow[]) => {
        setResults([]);
        setProgress(0);

        const fields = modelType === 'Kepler' ? keplerFields : tessFields;
        const fieldNames = fields.map(f => f.name);

        // Validate that all required columns exist in the first row
        if (rows.length > 0) {
            const firstRowKeys = Object.keys(rows[0]);
            const missingColumns = fieldNames.filter(name => !firstRowKeys.includes(name));
            if (missingColumns.length > 0) {
                toast({
                    variant: 'destructive',
                    title: 'Missing Required Columns',
                    description: `Your file is missing the following columns: ${missingColumns.join(', ')}`,
                });
                setIsLoading(false);
                return;
            }
        } else {
             toast({
                variant: 'destructive',
                title: 'Empty File',
                description: `The file has no data to process.`,
            });
            setIsLoading(false);
            return;
        }

        const batchSize = 10;
        let processedResults: ResultRow[] = [];

        const useTuned = selectedModel !== 'default';

        for (let i = 0; i < rows.length; i += batchSize) {
            const batch = rows.slice(i, i + batchSize);
            const payloads = batch.map(row => {
                const features = fieldNames.map(name => {
                    const val = row[name];
                    return typeof val === 'string' ? parseFloat(val) : (val as number);
                });
                const modelIdentifier = useTuned ? selectedModel : modelType.toLowerCase();
                return { model: modelIdentifier, features };
            });

            try {
                const batchResults = await getBatchPredictions(payloads, useTuned);
                const newProcessedResults = batch.map((originalRow, index) => ({
                    ...originalRow,
                    prediction: batchResults[index].prediction,
                    confidence: parseFloat((batchResults[index].confidence * 100).toFixed(2)),
                }));
                processedResults = [...processedResults, ...newProcessedResults];
                setResults(processedResults);
            } catch (error) {
                 console.error('Error during batch prediction:', error);
                 const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
                 toast({
                     variant: 'destructive',
                     title: 'Prediction Error',
                     description: `Batch starting at row ${i + 1} failed: ${errorMessage}`,
                 });
                 setIsLoading(false);
                 return; // Stop further processing on error
            }

            setProgress(((i + batch.length) / rows.length) * 100);
        }

        setIsLoading(false);
        toast({
            title: 'Predictions Complete',
            description: `All ${rows.length} rows have been processed.`,
        });
    };

    const downloadResults = (includeAllFeatures: boolean) => {
        const fields = modelType === 'Kepler' ? keplerFields : tessFields;
        const selectedFeatureNames = fields.map(f => f.name);

        let dataToDownload: Partial<ResultRow>[];

        if (includeAllFeatures) {
            // Keep all original columns plus prediction/confidence
            dataToDownload = results;
        } else {
            // Include only the model's features plus prediction/confidence
            dataToDownload = results.map(row => {
                const selectedData: Partial<ResultRow> = { 
                    prediction: row.prediction, 
                    confidence: row.confidence 
                };
                for (const key of selectedFeatureNames) {
                    selectedData[key] = row[key];
                }
                return selectedData;
            });
        }

        const ws = XLSX.utils.json_to_sheet(dataToDownload);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Predictions');
        const fileName = `prediction_results_${modelType}_${includeAllFeatures ? 'all_columns' : 'selected_columns'}.xlsx`;
        XLSX.writeFile(wb, fileName);
    };

    const allHeaders = (results.length > 0 ? Object.keys(results[0]) : []);

    return (
        <Card className="mt-4">
            <CardHeader>
                <CardTitle>Batch Prediction</CardTitle>
                <CardDescription>Upload a CSV or XLSX file to get predictions for multiple exoplanet candidates at once.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <Form {...form}>
                    <form className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FormItem>
                                <FormLabel>Select Base Model</FormLabel>
                                <Select onValueChange={(v) => setModelType(v as ModelType)} defaultValue={modelType} disabled={isLoading}>
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
                            </FormItem>
                            <FormItem>
                                <FormLabel>Select Model Version</FormLabel>
                                <Select onValueChange={setSelectedModel} value={selectedModel} disabled={isLoading}>
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
                    </form>
                </Form>
                 <div className="space-y-2">
                    <Label htmlFor="file-upload">Upload File</Label>
                    <Input id="file-upload" type="file" onChange={handleFileChange} accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" disabled={isLoading}/>
                </div>


                <Button onClick={processFile} disabled={!file || isLoading} className="w-full sm:w-auto">
                    {isLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <Upload className="mr-2 h-4 w-4" />
                    )}
                    {isLoading ? 'Processing...' : 'Upload and Run Predictions'}
                </Button>

                {isLoading && (
                    <div className="space-y-2">
                        <Label>Progress</Label>
                        <Progress value={progress} />
                        <p className="text-sm text-muted-foreground text-center">{Math.round(progress)}% complete</p>
                    </div>
                )}
                
                {results.length > 0 && !isLoading && (
                    <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <h3 className="text-lg font-medium">Prediction Results</h3>
                            <div className="flex gap-2">
                                <Button onClick={() => downloadResults(false)} variant="outline" size="sm">
                                    <Download className="mr-2 h-4 w-4" />
                                    Download Selected Features
                                </Button>
                                <Button onClick={() => downloadResults(true)} variant="outline" size="sm">
                                    <Download className="mr-2 h-4 w-4" />
                                    Download All Features
                                </Button>
                            </div>
                        </div>
                        <div className="max-h-[400px] overflow-auto rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        {allHeaders.map(header => <TableHead key={header}>{header}</TableHead>)}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {results.map((row, index) => (
                                        <TableRow key={index}>
                                            {allHeaders.map(header => <TableCell key={header}>{String(row[header])}</TableCell>)}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default BatchPrediction;
