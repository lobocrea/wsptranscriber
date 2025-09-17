"use client";

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Circle, Loader2 } from 'lucide-react';
import { ProcessingState } from '@/types/chat';

interface ProcessingStepsProps {
  state: ProcessingState;
}

export default function ProcessingSteps({ state }: ProcessingStepsProps) {
  const steps = [
    { key: 'upload', label: 'Cargar Archivos', description: 'Subiendo archivos del chat' },
    { key: 'parsing', label: 'Analizar Chat', description: 'Procesando archivo de texto' },
    { key: 'transcribing', label: 'Transcribir Audio', description: 'Convirtiendo audios a texto' },
    { key: 'organizing', label: 'Organizar con IA', description: 'Ordenando cronológicamente' },
    { key: 'complete', label: 'Completado', description: 'Conversación lista' }
  ];

  const getStepStatus = (stepKey: string) => {
    const currentIndex = steps.findIndex(s => s.key === state.step);
    const stepIndex = steps.findIndex(s => s.key === stepKey);
    
    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'current';
    return 'pending';
  };

  const getStepIcon = (stepKey: string) => {
    const status = getStepStatus(stepKey);
    
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'current':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      default:
        return <Circle className="w-5 h-5 text-gray-300" />;
    }
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Progreso del Procesamiento</h3>
            <span className="text-sm text-gray-500">{Math.round(state.progress)}%</span>
          </div>
          
          <Progress value={state.progress} className="mb-6" />
          
          <div className="space-y-4">
            {steps.map((step, index) => (
              <div key={step.key} className="flex items-center gap-3">
                {getStepIcon(step.key)}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`font-medium ${
                      getStepStatus(step.key) === 'completed' ? 'text-green-700' :
                      getStepStatus(step.key) === 'current' ? 'text-blue-700' :
                      'text-gray-500'
                    }`}>
                      {step.label}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
          
          {state.currentAction && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-700 font-medium">{state.currentAction}</p>
            </div>
          )}
          
          {state.error && (
            <div className="mt-4 p-3 bg-red-50 rounded-lg">
              <p className="text-sm text-red-700 font-medium">Error: {state.error}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}