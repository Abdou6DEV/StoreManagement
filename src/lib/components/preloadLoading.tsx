import React, { useState, useEffect } from "react";
import { 
  Home, 
  ChartLine, 
  Users, 
  ShoppingCart, 
  PackageSearch, 
  History, 
  FileText, 
  Wrench, 
  Settings,
  CheckCircle,
  Loader2
} from "lucide-react";

interface PreloadLoadingProps {
  onComplete?: () => void;
}

interface LoadingStep {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  threshold: number;
  color: string;
}

const loadingSteps: LoadingStep[] = [
  {
    id: "main-menu",
    name: "Main Menu",
    icon: Home,
    description: "Loading main navigation",
    threshold: 10,
    color: "text-primary"
  },
  {
    id: "dashboard",
    name: "Dashboard",
    icon: ChartLine,
    description: "Preparing analytics dashboard",
    threshold: 25,
    color: "text-green-500"
  },
  {
    id: "clients",
    name: "Clients",
    icon: Users,
    description: "Loading client management",
    threshold: 40,
    color: "text-red-500"
  },
  {
    id: "cashier",
    name: "Cashier",
    icon: ShoppingCart,
    description: "Preparing point of sale",
    threshold: 55,
    color: "text-yellow-500"
  },
  {
    id: "stock",
    name: "Stock",
    icon: PackageSearch,
    description: "Loading inventory management",
    threshold: 70,
    color: "text-green-600"
  },
  {
    id: "history",
    name: "History",
    icon: History,
    description: "Preparing transaction history",
    threshold: 80,
    color: "text-blue-500"
  },
  {
    id: "bills",
    name: "Bills",
    icon: FileText,
    description: "Loading billing system",
    threshold: 90,
    color: "text-purple-500"
  },
  {
    id: "services",
    name: "Services",
    icon: Wrench,
    description: "Preparing service management",
    threshold: 95,
    color: "text-cyan-500"
  },
  {
    id: "administrator",
    name: "Administrator",
    icon: Settings,
    description: "Loading admin panel",
    threshold: 100,
    color: "text-orange-500"
  }
];

export default function PreloadLoading({ onComplete }: PreloadLoadingProps) {
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [startTime] = useState(Date.now());

  useEffect(() => {
    // Ensure minimum 3 seconds loading time
    const minLoadingTime = 3000;
    
    const interval = setInterval(() => {
      setProgress(prev => {
        const elapsed = Date.now() - startTime;
        const timeProgress = Math.min((elapsed / minLoadingTime) * 100, 100);
        
        // Use the higher of time-based or random progress
        const randomProgress = prev + Math.random() * 8 + 2;
        const newProgress = Math.max(timeProgress, randomProgress);
        
        // Update current step based on progress
        const step = loadingSteps.findIndex(s => newProgress >= s.threshold);
        if (step !== -1 && step !== currentStep) {
          setCurrentStep(step);
        }
        
        if (newProgress >= 100) {
          clearInterval(interval);
          setIsComplete(true);
          if (onComplete) {
            setTimeout(onComplete, 800); // Delay to show completion
          }
          return 100;
        }
        return newProgress;
      });
    }, 150);

    return () => clearInterval(interval);
  }, [onComplete, startTime, currentStep]);

  return (
    <div className="h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        {/* Logo */}
        <div className="w-16 h-16 mx-auto mb-6 bg-primary rounded-lg flex items-center justify-center shadow-lg">
          {isComplete ? (
            <CheckCircle className="w-8 h-8 text-primary-foreground animate-bounce" />
          ) : (
            <Loader2 className="w-8 h-8 text-primary-foreground animate-spin" />
          )}
        </div>
        
        {/* Title */}
        <h1 className="text-2xl font-semibold text-foreground mb-4">
          {isComplete ? "Ready!" : "Loading..."}
        </h1>

        {/* Progress */}
        <div className="w-64 mx-auto mb-6">
          <div className="w-full bg-muted rounded-full h-1">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
          <div className="text-sm text-muted-foreground mt-2">
            {Math.round(Math.min(progress, 100))}%
          </div>
        </div>

        {/* Current Step */}
        {!isComplete && currentStep < loadingSteps.length && (
          <div className="mb-6">
            <div className="flex items-center justify-center space-x-2">
              {React.createElement(loadingSteps[currentStep].icon, {
                className: `w-5 h-5 ${loadingSteps[currentStep].color}`
              })}
              <span className="text-sm text-foreground font-medium">
                {loadingSteps[currentStep].name}
              </span>
            </div>
          </div>
        )}

        {/* Steps */}
        <div className="space-y-2">
          {loadingSteps.map((step, index) => {
            const isCompleted = progress >= step.threshold;
            const isCurrent = currentStep === index && !isComplete;
            const Icon = step.icon;
            
            return (
              <div key={step.id} className={`flex items-center justify-center space-x-3 transition-all duration-300 ${
                isCurrent ? 'scale-105' : ''
              }`}>
                <div className="w-5 h-5 flex items-center justify-center">
                  {isCompleted ? (
                    <CheckCircle className="w-5 h-5 text-green-600 animate-pulse" />
                  ) : (
                    <Icon className={`w-5 h-5 ${isCurrent ? step.color : 'text-muted-foreground'} ${
                      isCurrent ? 'animate-pulse' : ''
                    }`} />
                  )}
                </div>
                <span className={`text-sm font-medium transition-colors duration-300 ${
                  isCompleted ? 'text-green-600' : isCurrent ? step.color : 'text-muted-foreground'
                }`}>
                  {step.name}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
