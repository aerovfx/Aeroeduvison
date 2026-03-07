"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Beaker, 
  Zap, 
  Thermometer, 
  Atom, 
  Play, 
  RotateCcw,
  FlaskConical,
  CheckCircle,
  XCircle,
  Loader2
} from "lucide-react";

interface ReactionResult {
  original: string;
  balanced: string;
  coefficients: {
    reactants: number[];
    products: number[];
  };
  elements: string[];
  success: boolean;
}

interface ThermodynamicsResult {
  deltaH: number;
  reaction_type: 'exothermic' | 'endothermic' | 'neutral';
  description: string;
  unit: string;
}

interface Molecule3D {
  success: boolean;
  formula: string;
  molecular_weight: number;
  atoms: Array<{
    element: string;
    x: number;
    y: number;
    z: number;
  }>;
  bonds: Array<{
    atom1: number;
    atom2: number;
    type: string;
  }>;
}

export default function ChemLabSimulator() {
  const [equation, setEquation] = useState('CH4 + O2 -> CO2 + H2O');
  const [loading, setLoading] = useState(false);
  const [reactionResult, setReactionResult] = useState<ReactionResult | null>(null);
  const [thermoResult, setThermoResult] = useState<ThermodynamicsResult | null>(null);
  const [molecule3D, setMolecule3D] = useState<Molecule3D | null>(null);
  const [activeTab, setActiveTab] = useState('balance');

  // Common reactions for quick testing
  const commonReactions = [
    { name: 'Đốt cháy methane', eq: 'CH4 + O2 -> CO2 + H2O' },
    { name: 'Quang hợp', eq: 'CO2 + H2O -> C6H12O6 + O2' },
    { name: 'Trung hòa', eq: 'HCl + NaOH -> NaCl + H2O' },
    { name: 'Phân hủy đá vôi', eq: 'CaCO3 -> CaO + CO2' }
  ];

  const commonMolecules = [
    { name: 'Nước', smiles: 'O', formula: 'H2O' },
    { name: 'Methane', smiles: 'C', formula: 'CH4' },
    { name: 'Ethanol', smiles: 'CCO', formula: 'C2H5OH' },
    { name: 'Benzene', smiles: 'c1ccccc1', formula: 'C6H6' }
  ];

  const balanceEquation = async () => {
    if (!equation.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8015/api/balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ equation })
      });
      
      const data = await response.json();
      if (data.success) {
        setReactionResult(data.result);
        setActiveTab('balance');
      }
    } catch (error) {
      console.error('Balance error:', error);
    }
    setLoading(false);
  };

  const calculateThermodynamics = async () => {
    if (!reactionResult) return;
    
    setLoading(true);
    try {
      // Simplified - in real app, parse balanced equation
      const reactants = { 'CH4(g)': 1, 'O2(g)': 2 };
      const products = { 'CO2(g)': 1, 'H2O(l)': 2 };
      
      const response = await fetch('http://localhost:8015/api/enthalpy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reactants, products })
      });
      
      const data = await response.json();
      if (data.success) {
        setThermoResult(data.result);
        setActiveTab('thermo');
      }
    } catch (error) {
      console.error('Thermo error:', error);
    }
    setLoading(false);
  };

  const generate3DMolecule = async (smiles: string) => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8015/api/molecule/3d', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ smiles })
      });
      
      const data = await response.json();
      if (data.success) {
        setMolecule3D(data.result);
        setActiveTab('molecule');
      }
    } catch (error) {
      console.error('3D molecule error:', error);
    }
    setLoading(false);
  };

  const resetAll = () => {
    setReactionResult(null);
    setThermoResult(null);
    setMolecule3D(null);
    setEquation('CH4 + O2 -> CO2 + H2O');
    setActiveTab('balance');
  };

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Beaker className="h-5 w-5" />
            <span>Chemical Equation Input</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-2">
            <Input
              value={equation}
              onChange={(e) => setEquation(e.target.value)}
              placeholder="Enter equation (e.g., CH4 + O2 -> CO2 + H2O)"
              className="flex-1"
            />
            <Button 
              onClick={balanceEquation} 
              disabled={loading}
              className="flex items-center space-x-2"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              <span>Balance</span>
            </Button>
          </div>
          
          {/* Quick Examples */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Quick examples:</p>
            <div className="flex flex-wrap gap-2">
              {commonReactions.map((rxn, i) => (
                <Button
                  key={i}
                  variant="outline"
                  size="sm"
                  onClick={() => setEquation(rxn.eq)}
                  className="text-xs"
                >
                  {rxn.name}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="balance" className="flex items-center space-x-2">
            <CheckCircle className="h-4 w-4" />
            <span>Balance</span>
          </TabsTrigger>
          <TabsTrigger value="thermo" className="flex items-center space-x-2">
            <Thermometer className="h-4 w-4" />
            <span>Thermo</span>
          </TabsTrigger>
          <TabsTrigger value="molecule" className="flex items-center space-x-2">
            <Atom className="h-4 w-4" />
            <span>3D Molecule</span>
          </TabsTrigger>
          <TabsTrigger value="experiment" className="flex items-center space-x-2">
            <FlaskConical className="h-4 w-4" />
            <span>Experiment</span>
          </TabsTrigger>
        </TabsList>

        {/* Balance Tab */}
        <TabsContent value="balance">
          <Card>
            <CardHeader>
              <CardTitle>Equation Balancing</CardTitle>
            </CardHeader>
            <CardContent>
              {reactionResult ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold mb-2">Original:</h4>
                      <code className="block p-3 bg-muted rounded text-sm">
                        {reactionResult.original}
                      </code>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Balanced:</h4>
                      <code className="block p-3 bg-green-50 border border-green-200 rounded text-sm">
                        {reactionResult.balanced}
                      </code>
                    </div>
                  </div>
                  
                  {reactionResult.success && (
                    <div className="flex justify-center">
                      <Button 
                        onClick={calculateThermodynamics}
                        className="flex items-center space-x-2"
                      >
                        <Thermometer className="h-4 w-4" />
                        <span>Calculate Thermodynamics</span>
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Beaker className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Enter an equation and click &quot;Balance&quot; to see results</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Thermodynamics Tab */}
        <TabsContent value="thermo">
          <Card>
            <CardHeader>
              <CardTitle>Thermodynamics Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              {thermoResult ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 border rounded">
                      <Thermometer className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                      <h4 className="font-semibold">Enthalpy Change</h4>
                      <p className="text-2xl font-bold">
                        {thermoResult.deltaH > 0 ? '+' : ''}{thermoResult.deltaH.toFixed(1)}
                      </p>
                      <p className="text-sm text-muted-foreground">{thermoResult.unit}</p>
                    </div>
                    
                    <div className="text-center p-4 border rounded">
                      <Zap className="h-8 w-8 mx-auto mb-2 text-orange-600" />
                      <h4 className="font-semibold">Reaction Type</h4>
                      <Badge 
                        variant={thermoResult.reaction_type === 'exothermic' ? 'destructive' : 'default'}
                        className="text-lg px-4 py-2"
                      >
                        {thermoResult.reaction_type}
                      </Badge>
                    </div>
                    
                    <div className="text-center p-4 border rounded">
                      <FlaskConical className="h-8 w-8 mx-auto mb-2 text-green-600" />
                      <h4 className="font-semibold">Description</h4>
                      <p className="text-sm">{thermoResult.description}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Thermometer className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Balance an equation first to calculate thermodynamics</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 3D Molecule Tab */}
        <TabsContent value="molecule">
          <Card>
            <CardHeader>
              <CardTitle>3D Molecule Visualization</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {commonMolecules.map((mol, i) => (
                    <Button
                      key={i}
                      variant="outline"
                      onClick={() => generate3DMolecule(mol.smiles)}
                      className="flex flex-col items-center space-y-1 h-auto p-3"
                    >
                      <Atom className="h-4 w-4" />
                      <span className="text-xs">{mol.name}</span>
                      <span className="text-xs text-muted-foreground">{mol.formula}</span>
                    </Button>
                  ))}
                </div>
                
                {molecule3D ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center p-4 border rounded">
                        <h4 className="font-semibold">Formula</h4>
                        <p className="text-xl">{molecule3D.formula}</p>
                      </div>
                      <div className="text-center p-4 border rounded">
                        <h4 className="font-semibold">Molecular Weight</h4>
                        <p className="text-xl">{molecule3D.molecular_weight.toFixed(2)} g/mol</p>
                      </div>
                      <div className="text-center p-4 border rounded">
                        <h4 className="font-semibold">Atoms</h4>
                        <p className="text-xl">{molecule3D.atoms.length}</p>
                      </div>
                    </div>
                    
                    <div className="text-center p-8 border-2 border-dashed border-muted-foreground/25 rounded">
                      <Atom className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground">
                        3D Visualization Placeholder
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {molecule3D.atoms.length} atoms, {molecule3D.bonds.length} bonds
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Atom className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Select a molecule to generate 3D structure</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Experiment Tab */}
        <TabsContent value="experiment">
          <Card>
            <CardHeader>
              <CardTitle>Virtual Experiment</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <FlaskConical className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Complete Experiment</h3>
                <p className="text-muted-foreground mb-4">
                  Run full virtual experiment with animation
                </p>
                <Button 
                  onClick={resetAll}
                  variant="outline"
                  className="flex items-center space-x-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>Reset All</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
