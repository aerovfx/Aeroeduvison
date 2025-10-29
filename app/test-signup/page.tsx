'use client';

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function TestSignupPage() {
  const [result, setResult] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const testSignup = async () => {
    setLoading(true);
    setResult("Testing signup...");
    
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Test User " + Date.now(),
          email: `test${Date.now()}@example.com`,
          password: "test123",
          role: "STUDENT",
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setResult(`✅ Success: ${data.message}`);
      } else {
        setResult(`❌ Error: ${data.error || "Unknown error"}`);
      }
    } catch (error) {
      setResult(`❌ Network Error: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Test Signup Page</h1>
      
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Test User Registration</CardTitle>
          <CardDescription>
            Test the signup functionality with a new user
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={testSignup} 
            disabled={loading}
            className="w-full"
          >
            {loading ? "Testing..." : "Test Signup"}
          </Button>
          
          {result && (
            <div className="mt-4 p-3 rounded-md bg-gray-100">
              <pre className="text-sm">{result}</pre>
            </div>
          )}
        </CardContent>
      </Card>
      
      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-4">Test Accounts Available:</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold">Admin</h3>
            <p>Email: admin@example.com</p>
            <p>Password: admin123</p>
          </div>
          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold">Teacher</h3>
            <p>Email: teacher@example.com</p>
            <p>Password: teacher123</p>
          </div>
          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold">Student</h3>
            <p>Email: student@example.com</p>
            <p>Password: student123</p>
          </div>
          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold">Student 2</h3>
            <p>Email: student2@example.com</p>
            <p>Password: student123</p>
          </div>
        </div>
      </div>
    </div>
  );
}
