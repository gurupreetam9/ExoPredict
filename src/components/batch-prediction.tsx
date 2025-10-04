"use client";

import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { useToast } from '@/hooks/use-toast';
import { ModelType, keplerFields, tessFields } from '@/lib/definitions';
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

type DataRow = Record<string, string | number>;
type ResultRow = DataRow & {
    prediction: string;
    confidence: number;
};

const BatchPrediction = () => {
    const [modelType, setModelType] = useState<ModelType>('Kepler');
    const [file, setFile] = useState<File | null>(null);
    const [data, setData] = useState<DataRow[]>([]);
    const [results, setResults] = useState<ResultRow[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const { toast } = useToast();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFile(e.target.files[0]);
            setData([]);
            setResults([]);
            setProgress(0);
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

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const workbook = XLSX.read(e.target?.result, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet) as DataRow[];
                setData(jsonData);
                toast({
                    title: 'File processed',
                    description: `${jsonData.length} rows loaded successfully.`,
                });
                runPredictions(jsonData);
            } catch (error) {
                console.error('Error processing file:', error);
                toast({
                    variant: 'destructive',
                    title: 'File processing error',
                    description: 'Could not read data from the file. Please ensure it is a valid CSV or XLSX file.',
                });
            }
        };
        reader.readAsBinaryString(file);
    };

    const runPredictions = async (rows: DataRow[]) => {
        setIsLoading(true);
        setResults([]);
        setProgress(0);

        const fields = modelType === 'Kepler' ? keplerFields : tessFields;
        const fieldNames = fields.map(f => f.name);

        const batchSize = 10;
        let processedResults: ResultRow[] = [];

        for (let i = 0; i < rows.length; i += batchSize) {
            const batch = rows.slice(i, i + batchSize);
            const payloads = batch.map(row => {
                const features = fieldNames.map(name => {
                    const val = row[name];
                    if (val === undefined || val === null) {
                        toast({
                            variant: 'destructive',
                            title: 'Missing Data',
                            description: `Column "${name}" is missing in the uploaded file.`,
                        });
                        throw new Error(`Missing column: ${name}`);
                    }
                    return typeof val === 'string' ? parseFloat(val) : (val as number);
                });
                return { model: modelType.toLowerCase(), features };
            });

            try {
                const batchResults = await getBatchPredictions(payloads);
                const newProcessedResults = batch.map((originalRow, index) => ({
                    ...originalRow,
                    prediction: batchResults[index].prediction,
                    confidence: parseFloat((batchResults[index].confidence * 100).toFixed(2)),
                }));
                processedResults = [...processedResults, ...newProcessedResults];
                setResults(processedResults);
            } catch (error) {
                 console.error('Error during batch prediction:', error);
                 toast({
                     variant: 'destructive',
                     title: 'Prediction Error',
                     description: `An error occurred during prediction for batch starting at row ${i + 1}.`,
                 });
            }

            setProgress(((i + batch.length) / rows.length) * 100);
        }

        setIsLoading(false);
    };

    const downloadResults = (includeAllFeatures: boolean) => {
        const fields = modelType === 'Kepler' ? keplerFields : tessFields;
        const selectedFeatureNames = fields.map(f => f.name);

        let dataToDownload;

        if (includeAllFeatures) {
            dataToDownload = results;
        } else {
            dataToDownload = results.map(row => {
                const selectedData: ResultRow = { prediction: row.prediction, confidence: row.confidence };
                for (const key of selectedFeatureNames) {
                    selectedData[key] = row[key];
                }
                return selectedData;
            });
        }

        const ws = XLSX.utils.json_to_sheet(dataToDownload);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Predictions');
        const fileName = `prediction_results_${includeAllFeatures ? 'all_columns' : 'selected_columns'}.xlsx`;
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
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1 space-y-2">
                         <Label>Select Model</Label>
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
                    <div className="flex-1 space-y-2">
                        <Label htmlFor="file-upload">Upload File</Label>
                        <Input id="file-upload" type="file" onChange={handleFileChange} accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" />
                    </div>
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
                                    Download Selected
                                </Button>
                                <Button onClick={() => downloadResults(true)} variant="outline" size="sm">
                                    <Download className="mr-2 h-4 w-4" />
                                    Download All
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
