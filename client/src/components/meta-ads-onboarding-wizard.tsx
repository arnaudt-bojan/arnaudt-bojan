import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { 
  CheckCircle2, 
  ChevronDown, 
  ChevronRight,
  ExternalLink, 
  HelpCircle,
  AlertCircle
} from "lucide-react";
import { SiFacebook, SiInstagram } from "react-icons/si";

interface MetaAdsOnboardingWizardProps {
  onConnect: () => void;
}

export function MetaAdsOnboardingWizard({ onConnect }: MetaAdsOnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [showHelp, setShowHelp] = useState<Record<number, boolean>>({});

  const steps = [
    {
      number: 1,
      title: "Facebook/Instagram Account",
      description: "You need an active Meta account to continue",
      helpTitle: "What is a Meta Account?",
      helpContent: (
        <div className="space-y-2 text-sm">
          <p>A Meta account is your login for Facebook and Instagram. If you can log into Facebook or Instagram, you have a Meta account.</p>
          <p className="font-medium">Don't have one?</p>
          <a 
            href="https://www.facebook.com/signup" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-primary hover:underline"
            data-testid="link-create-meta-account"
          >
            Create a Facebook account <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      )
    },
    {
      number: 2,
      title: "Meta Business Manager",
      description: "Required to manage ad accounts and run campaigns",
      helpTitle: "What is Meta Business Manager?",
      helpContent: (
        <div className="space-y-2 text-sm">
          <p>Meta Business Manager is a free tool that helps you organize and manage your business's Facebook Pages, ad accounts, and team members all in one place.</p>
          <p className="font-medium">How to set it up:</p>
          <ol className="list-decimal list-inside space-y-1 ml-2">
            <li>Go to business.facebook.com</li>
            <li>Click "Create Account"</li>
            <li>Enter your business name and details</li>
            <li>Verify your business email</li>
          </ol>
          <a 
            href="https://business.facebook.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-primary hover:underline"
            data-testid="link-create-business-manager"
          >
            Go to Business Manager <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      )
    },
    {
      number: 3,
      title: "Meta Ad Account",
      description: "The account that will run your advertising campaigns",
      helpTitle: "What is an Ad Account?",
      helpContent: (
        <div className="space-y-2 text-sm">
          <p>An ad account is where you create, manage, and track your Facebook and Instagram advertising campaigns. Each ad account has its own budget, payment method, and campaign settings.</p>
          <p className="font-medium">How to create one:</p>
          <ol className="list-decimal list-inside space-y-1 ml-2">
            <li>Log into Business Manager</li>
            <li>Go to Business Settings</li>
            <li>Click "Ad Accounts" in the left menu</li>
            <li>Click "Add" → "Create a new ad account"</li>
            <li>Enter account name and set currency/timezone</li>
          </ol>
          <a 
            href="https://business.facebook.com/adsmanager/creation" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-primary hover:underline"
            data-testid="link-create-ad-account"
          >
            Create an Ad Account <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      )
    }
  ];

  const currentStepData = steps[currentStep - 1];

  const toggleHelp = (step: number) => {
    setShowHelp(prev => ({ ...prev, [step]: !prev[step] }));
  };

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <Card className="p-8" data-testid="card-onboarding-wizard">
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="flex items-center gap-3 p-6 bg-muted rounded-2xl">
              <SiFacebook className="h-12 w-12 text-[#1877F2]" />
              <SiInstagram className="h-12 w-12 text-[#E4405F]" />
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-bold mb-2" data-testid="text-wizard-title">
              Connect Your Meta Ad Account
            </h2>
            <p className="text-muted-foreground">
              Before we connect, let's make sure you have everything ready
            </p>
          </div>
        </div>

        {/* Progress Indicator */}
        <div className="flex items-center justify-center gap-2">
          {steps.map((step, index) => (
            <div key={step.number} className="flex items-center">
              <div 
                className={`flex items-center justify-center w-8 h-8 rounded-full font-medium text-sm ${
                  currentStep > step.number
                    ? 'bg-primary text-primary-foreground' 
                    : currentStep === step.number
                    ? 'bg-primary/20 text-primary'
                    : 'bg-muted text-muted-foreground'
                }`}
                data-testid={`indicator-step-${step.number}`}
              >
                {currentStep > step.number ? <CheckCircle2 className="h-5 w-5" /> : step.number}
              </div>
              {index < steps.length - 1 && (
                <div className={`w-12 h-0.5 mx-2 ${currentStep > step.number ? 'bg-primary' : 'bg-muted'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Current Step */}
        <div className="space-y-4">
          <div className="flex items-start gap-4 p-6 bg-muted/50 rounded-lg">
            <div className="flex-1">
              <div className="space-y-1">
                <p className="font-semibold" data-testid={`text-step-${currentStep}-title`}>
                  Step {currentStep} of 3: {currentStepData.title}
                </p>
                <p className="text-sm text-muted-foreground">
                  {currentStepData.description}
                </p>
              </div>
            </div>
          </div>

          {/* Help Section */}
          <Collapsible open={showHelp[currentStep]} onOpenChange={() => toggleHelp(currentStep)}>
            <CollapsibleTrigger asChild>
              <Button 
                variant="ghost" 
                className="w-full justify-between"
                data-testid={`button-toggle-help-${currentStep}`}
              >
                <span className="flex items-center gap-2">
                  <HelpCircle className="h-4 w-4" />
                  {currentStepData.helpTitle}
                </span>
                {showHelp[currentStep] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="p-4 bg-muted/30 rounded-lg mt-2" data-testid={`help-content-${currentStep}`}>
                {currentStepData.helpContent}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        {/* Navigation & Connect Button */}
        <div className="space-y-4">
          <div className="flex gap-3">
            {currentStep > 1 && (
              <Button 
                variant="outline" 
                onClick={handleBack}
                data-testid="button-back"
              >
                Back
              </Button>
            )}
            {currentStep < 3 ? (
              <Button 
                className="flex-1"
                onClick={handleNext}
                data-testid="button-next"
              >
                Next Step
              </Button>
            ) : (
              <Button 
                className="flex-1"
                onClick={onConnect}
                data-testid="button-connect-meta"
              >
                <SiFacebook className="h-5 w-5 mr-2" />
                Connect Meta Account
              </Button>
            )}
          </div>
        </div>

        {/* Info Footer */}
        <div className="pt-4 border-t text-center">
          <p className="text-sm text-muted-foreground">
            Required permissions: <span className="font-medium">ads_management</span>, <span className="font-medium">ads_read</span>, <span className="font-medium">business_management</span>
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            You'll be redirected to Meta to authorize access
          </p>
        </div>
      </div>
    </Card>
  );
}
