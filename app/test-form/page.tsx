'use client';

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function TestFormPage() {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form submitted:", formData);
    alert("Form submitted successfully! Check console for data.");
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Test Form Page</h1>
      
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Test Form Components</CardTitle>
          <CardDescription>
            Test all form components to ensure React 19 ref compatibility
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Course Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Enter course title"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter course description"
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="algebra">Algebra</SelectItem>
                  <SelectItem value="geometry">Geometry</SelectItem>
                  <SelectItem value="calculus">Calculus</SelectItem>
                  <SelectItem value="statistics">Statistics</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-4">
              <Button type="submit">Submit Form</Button>
              <Button type="button" variant="outline" onClick={() => setFormData({ title: "", description: "", category: "" })}>
                Clear Form
              </Button>
            </div>
          </form>

          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold mb-2">Form Data:</h3>
            <pre className="text-sm">{JSON.stringify(formData, null, 2)}</pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
