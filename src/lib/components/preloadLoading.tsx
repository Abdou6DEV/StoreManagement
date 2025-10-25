import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
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
  Loader2,
  Download,
  Wifi,
  WifiOff
} from "lucide-react";
import { useUpdateChecker } from "../hooks/useUpdateChecker";

interface PreloadLoadingProps {
  onComplete?: () => void;
}

interface LoadingStep {
  id: string;
  nameKey: string;
  icon: React.ComponentType<{ className?: string }>;
  descriptionKey: string;
  threshold: number;
  color: string;
}

export default function PreloadLoading({ onComplete }: PreloadLoadingProps) {
  const { t } = useTranslation();
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [startTime] = useState(Date.now());
  const [updateStatus, setUpdateStatus] = useState<string>("");
  
  const { checkForUpdates, isChecking, updateInfo, error } = useUpdateChecker();

  const loadingSteps: LoadingStep[] = [
    {
      id: "main-menu",
      nameKey: "loading.mainMenu",
      icon: Home,
      descriptionKey: "loading.mainMenuDesc",
      threshold: 10,
      color: "text-primary"
    },
    {
      id: "dashboard",
      nameKey: "loading.dashboard",
      icon: ChartLine,
      descriptionKey: "loading.dashboardDesc",
      threshold: 25,
      color: "text-green-500"
    },
    {
      id: "clients",
      nameKey: "loading.clients",
      icon: Users,
      descriptionKey: "loading.clientsDesc",
      threshold: 40,
      color: "text-red-500"
    },
    {
      id: "cashier",
      nameKey: "loading.cashier",
      icon: ShoppingCart,
      descriptionKey: "loading.cashierDesc",
      threshold: 55,
      color: "text-yellow-500"
    },
    {
      id: "stock",
      nameKey: "loading.stock",
      icon: PackageSearch,
      descriptionKey: "loading.stockDesc",
      threshold: 70,
      color: "text-green-600"
    },
    {
      id: "history",
      nameKey: "loading.history",
      icon: History,
      descriptionKey: "loading.historyDesc",
      threshold: 80,
      color: "text-blue-500"
    },
    {
      id: "bills",
      nameKey: "loading.bills",
      icon: FileText,
      descriptionKey: "loading.billsDesc",
      threshold: 90,
      color: "text-purple-500"
    },
    {
      id: "services",
      nameKey: "loading.services",
      icon: Wrench,
      descriptionKey: "loading.servicesDesc",
      threshold: 95,
      color: "text-cyan-500"
    },
    {
      id: "administrator",
      nameKey: "loading.administrator",
      icon: Settings,
      descriptionKey: "loading.administratorDesc",
      threshold: 100,
      color: "text-orange-500"
    }
  ];

  // Check for updates on component mount
  useEffect(() => {
    const checkUpdates = async () => {
      setUpdateStatus(t("updates.checking"));
      const result = await checkForUpdates();
      
      if (result.error) {
        if (result.error.includes("fetch") || result.error.includes("network")) {
          setUpdateStatus(t("updates.noInternet"));
        } else {
          setUpdateStatus(t("updates.checkFailed", { error: result.error }));
        }
      } else if (result.available) {
        setUpdateStatus(t("updates.updateAvailable", { version: result.latestVersion }));
      } else if (result.currentVersion === result.latestVersion && !result.downloadUrl) {
        setUpdateStatus(t("updates.noReleases"));
      } else {
        setUpdateStatus(t("updates.upToDate"));
      }
    };
    
    checkUpdates();
  }, [checkForUpdates, t]);

  useEffect(() => {
    // Ensure minimum 8 seconds loading time to allow reading update status
    const minLoadingTime = 8000;
    
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
            setTimeout(onComplete, 1500); // Longer delay to show completion and update status
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
          {isComplete ? t("loading.ready", "Ready!") : t("loading.title", "Loading...")}
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
                {t(loadingSteps[currentStep].nameKey, loadingSteps[currentStep].nameKey)}
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
                  {t(step.nameKey, step.nameKey)}
                </span>
              </div>
            );
          })}
        </div>

        {/* Update Status */}
        {updateStatus && (
          <div className="mt-6 p-3 bg-muted/50 rounded-lg border border-border">
            <div className="flex items-center justify-center space-x-2">
              {isChecking ? (
                <Loader2 className="w-4 h-4 text-primary animate-spin" />
              ) : updateInfo?.available ? (
                <Download className="w-4 h-4 text-green-600" />
              ) : error ? (
                <WifiOff className="w-4 h-4 text-red-500" />
              ) : (
                <Wifi className="w-4 h-4 text-green-600" />
              )}
              <span className={`text-sm font-medium ${
                updateInfo?.available ? 'text-green-600' : 
                error ? 'text-red-500' : 
                'text-muted-foreground'
              }`}>
                {updateStatus}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
