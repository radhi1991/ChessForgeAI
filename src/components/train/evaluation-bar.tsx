
"use client";

import React, { useEffect, useState } from 'react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface EvaluationBarProps {
  evaluation: number; // e.g., from -10 (strong black) to +10 (strong white)
  maxAbsEval?: number; // Maximum absolute evaluation for scaling, default 10
}

const EvaluationBar: React.FC<EvaluationBarProps> = ({ evaluation, maxAbsEval = 10 }) => {
  const [barValue, setBarValue] = useState(50); // 0-100 scale for progress bar

  useEffect(() => {
    const clampedEval = Math.max(-maxAbsEval, Math.min(maxAbsEval, evaluation));
    const normalizedValue = ((clampedEval + maxAbsEval) / (2 * maxAbsEval)) * 100;
    setBarValue(normalizedValue);
  }, [evaluation, maxAbsEval]);
  
  const evalText = evaluation > 0 ? `+${evaluation.toFixed(1)}` : evaluation.toFixed(1);

  return (
    <div className="w-full p-2 rounded-lg bg-muted/30 border border-border/30">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-muted-foreground">Black</span>
        <span className="text-sm font-bold text-foreground">{evalText}</span>
        <span className="text-xs font-medium text-muted-foreground">White</span>
      </div>
      {/* The Progress component's indicator by default uses primary color. 
          This might need adjustment if a specific color independent of primary is needed.
          For Soft UI, a single color bar or a very subtle color change might be appropriate.
          Let's assume it uses the primary color for the fill for now.
      */}
      <Progress value={barValue} className="h-3 w-full bg-secondary" />
    </div>
  );
};

// Add indicatorClassName to Progress props if not already there
// Or, if Progress is simple, we might need to adjust its internal styling in progress.tsx
// For now, I will assume Progress component can take indicatorClassName or its default primary is acceptable.
// Let's adjust progress.tsx to use a different color for indicator if needed, or rely on primary.
// The current progress.tsx uses bg-primary for indicator.
// We can make the track use --muted and indicator use --primary or --accent based on evaluation
// For Soft UI, it's often a solid bar that changes length.

export default EvaluationBar;
