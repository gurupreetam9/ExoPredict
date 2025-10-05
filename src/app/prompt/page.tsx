
'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Wand2 } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { ModelType } from '@/lib/definitions';
import { populateParameters } from '@/ai/flows/prompt-assisted-parameter-entry';

const formSchema = z.object({
  modelType: z.enum(['Kepler', 'TESS']),
  prompt: z.string().min(20, { message: 'Please provide a more detailed scenario description.' }),
});

export default function PromptPage() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      modelType: 'Kepler',
      prompt: 'A hot Jupiter orbiting a sun-like star very closely, resulting in a short orbital period and high surface temperature.',
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    try {
      const result = await populateParameters({
        modelType: values.modelType,
        prompt: values.prompt,
      });

      const queryParams = new URLSearchParams();
      for (const [key, value] of Object.entries(result)) {
        if (value !== undefined && value !== null) {
            queryParams.append(key, String(value));
        }
      }
      queryParams.append('modelType', values.modelType);

      // Redirect to the home page with the parameters in the query string
      window.location.href = `/?${queryParams.toString()}`;

    } catch (error) {
      console.error('Error populating parameters:', error);
      toast({
        variant: 'destructive',
        title: 'Parameter Generation Failed',
        description: 'Could not generate parameters from the prompt. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto max-w-2xl py-8">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-2xl">Prompt-Assisted Parameter Entry</CardTitle>
          <CardDescription>
            Describe a hypothetical exoplanet scenario, and the AI will estimate the input parameters for you.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="modelType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Model</FormLabel>
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
                name="prompt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Exoplanet Scenario</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="e.g., A small, rocky planet in the habitable zone of a red dwarf star."
                        className="min-h-[120px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex flex-col sm:flex-row gap-2">
                <Button type="submit" disabled={isLoading} className="w-full">
                  {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Wand2 className="mr-2 h-4 w-4" />
                  )}
                  Generate and Apply Parameters
                </Button>
                <Button variant="outline" asChild className="w-full">
                    <Link href="/">Cancel</Link>
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

    