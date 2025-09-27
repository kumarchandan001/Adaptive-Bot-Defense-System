import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { initiatePayment, processPayment, getPaymentStatus } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { 
  Shield, 
  CreditCard, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Bot,
  Clock,
  Smartphone,
  Mail
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PaymentData {
  platform: string;
  ticketId: string;
  amount: number;
  currency: string;
  paymentMethod: string;
}

interface BotDetectionResult {
  botScore: number;
  detectionReasons: string[];
  riskFactors: any;
  requiresVerification: boolean;
  verificationSteps?: string[];
}

const PaymentPage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [paymentData, setPaymentData] = useState<PaymentData>({
    platform: "",
    ticketId: "",
    amount: 0,
    currency: "USD",
    paymentMethod: ""
  });
  
  const [botDetection, setBotDetection] = useState<BotDetectionResult | null>(null);
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<string>("idle");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [verificationStep, setVerificationStep] = useState<string | null>(null);
  const [verificationData, setVerificationData] = useState<any>(null);

  const platforms = [
    { value: "ticketmaster", label: "Ticketmaster" },
    { value: "eventbrite", label: "Eventbrite" },
    { value: "stubhub", label: "StubHub" },
    { value: "seatgeek", label: "SeatGeek" },
    { value: "vividseats", label: "Vivid Seats" }
  ];

  const paymentMethods = [
    { value: "credit_card", label: "Credit Card" },
    { value: "debit_card", label: "Debit Card" },
    { value: "paypal", label: "PayPal" },
    { value: "apple_pay", label: "Apple Pay" },
    { value: "google_pay", label: "Google Pay" }
  ];

  const getBotScoreColor = (score: number) => {
    if (score >= 0.6) return "destructive";
    if (score >= 0.3) return "secondary";
    return "outline";
  };

  const getBotScoreLabel = (score: number) => {
    if (score >= 0.6) return "High Risk";
    if (score >= 0.3) return "Medium Risk";
    return "Low Risk";
  };

  const getRiskIcon = (reason: string) => {
    switch (reason) {
      case "headless_browser": return <Bot className="w-4 h-4" />;
      case "rapid_purchase": return <Clock className="w-4 h-4" />;
      case "multiple_devices": return <Smartphone className="w-4 h-4" />;
      case "geo_mismatch": return <AlertTriangle className="w-4 h-4" />;
      default: return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const handleInitiatePayment = async () => {
    setLoading(true);
    setError("");
    
    try {
      const result = await initiatePayment(paymentData);
      
      if (result.reason === "bot_detected") {
        setBotDetection({
          botScore: result.botScore,
          detectionReasons: result.detectionReasons,
          riskFactors: {},
          requiresVerification: true,
          verificationSteps: result.verificationSteps
        });
        setPaymentStatus("blocked");
        toast({
          title: "Payment Blocked",
          description: "Bot activity detected. Payment has been blocked.",
          variant: "destructive"
        });
      } else if (result.reason === "medium_risk") {
        setBotDetection({
          botScore: result.botScore,
          detectionReasons: result.detectionReasons,
          riskFactors: {},
          requiresVerification: true,
          verificationSteps: result.verificationSteps
        });
        setPaymentStatus("verification_required");
        setVerificationStep("captcha");
        toast({
          title: "Verification Required",
          description: "Additional verification is required to complete your payment.",
          variant: "secondary"
        });
      } else {
        setTransactionId(result.transactionId);
        setPaymentStatus("processing");
        toast({
          title: "Payment Initiated",
          description: "Your payment is being processed.",
        });
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Payment initiation failed");
      toast({
        title: "Payment Failed",
        description: err.response?.data?.message || "Payment initiation failed",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerification = async (step: string, passed: boolean, details?: any) => {
    if (!transactionId) return;
    
    setLoading(true);
    
    try {
      const result = await processPayment(transactionId, {
        step,
        passed,
        details
      });
      
      if (result.success) {
        setPaymentStatus("completed");
        toast({
          title: "Payment Completed",
          description: "Your ticket purchase was successful!",
        });
        setTimeout(() => navigate("/dashboard"), 2000);
      } else {
        setPaymentStatus("failed");
        toast({
          title: "Payment Failed",
          description: result.message || "Payment could not be completed",
          variant: "destructive"
        });
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const simulateCaptcha = () => {
    // Simulate CAPTCHA completion
    handleVerification("captcha", true, { captchaToken: "simulated_token" });
  };

  const simulatePhoneVerification = () => {
    // Simulate phone verification
    handleVerification("phone_verification", true, { phoneVerified: true });
  };

  const simulateEmailVerification = () => {
    // Simulate email verification
    handleVerification("email_verification", true, { emailVerified: true });
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Secure Ticket Purchase</h1>
          <p className="text-muted-foreground">
            Advanced bot detection protects your ticket purchase
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Payment Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Payment Details
              </CardTitle>
              <CardDescription>
                Enter your ticket purchase information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="platform">Platform</Label>
                <Select 
                  value={paymentData.platform} 
                  onValueChange={(value) => setPaymentData(prev => ({ ...prev, platform: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select platform" />
                  </SelectTrigger>
                  <SelectContent>
                    {platforms.map(platform => (
                      <SelectItem key={platform.value} value={platform.value}>
                        {platform.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ticketId">Ticket ID</Label>
                <Input
                  id="ticketId"
                  placeholder="Enter ticket ID"
                  value={paymentData.ticketId}
                  onChange={(e) => setPaymentData(prev => ({ ...prev, ticketId: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="0.00"
                  value={paymentData.amount || ""}
                  onChange={(e) => setPaymentData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentMethod">Payment Method</Label>
                <Select 
                  value={paymentData.paymentMethod} 
                  onValueChange={(value) => setPaymentData(prev => ({ ...prev, paymentMethod: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map(method => (
                      <SelectItem key={method.value} value={method.value}>
                        {method.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button 
                onClick={handleInitiatePayment}
                disabled={loading || !paymentData.platform || !paymentData.ticketId || !paymentData.amount || !paymentData.paymentMethod}
                className="w-full"
              >
                {loading ? "Processing..." : "Initiate Payment"}
              </Button>
            </CardContent>
          </Card>

          {/* Bot Detection Results */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Bot Detection Results
              </CardTitle>
              <CardDescription>
                Real-time security analysis
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {paymentStatus === "idle" && (
                <div className="text-center text-muted-foreground py-8">
                  <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Bot detection will analyze your request</p>
                </div>
              )}

              {botDetection && (
                <>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Risk Score</span>
                      <Badge variant={getBotScoreColor(botDetection.botScore)}>
                        {getBotScoreLabel(botDetection.botScore)}
                      </Badge>
                    </div>
                    <Progress value={botDetection.botScore * 100} className="h-2" />
                    <p className="text-xs text-muted-foreground">
                      Score: {(botDetection.botScore * 100).toFixed(1)}%
                    </p>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Detection Reasons</h4>
                    <div className="space-y-2">
                      {botDetection.detectionReasons.map((reason, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm">
                          {getRiskIcon(reason)}
                          <span className="capitalize">{reason.replace(/_/g, " ")}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Status</h4>
                    {paymentStatus === "blocked" && (
                      <Alert variant="destructive">
                        <XCircle className="h-4 w-4" />
                        <AlertDescription>
                          Payment blocked due to bot detection
                        </AlertDescription>
                      </Alert>
                    )}
                    {paymentStatus === "verification_required" && (
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          Additional verification required
                        </AlertDescription>
                      </Alert>
                    )}
                    {paymentStatus === "processing" && (
                      <Alert>
                        <CheckCircle className="h-4 w-4" />
                        <AlertDescription>
                          Payment processing
                        </AlertDescription>
                      </Alert>
                    )}
                    {paymentStatus === "completed" && (
                      <Alert>
                        <CheckCircle className="h-4 w-4" />
                        <AlertDescription>
                          Payment completed successfully
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Verification Steps */}
        {verificationStep && (
          <Card>
            <CardHeader>
              <CardTitle>Additional Verification Required</CardTitle>
              <CardDescription>
                Complete the verification steps to proceed with your payment
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {verificationStep === "captcha" && (
                <div className="space-y-4">
                  <div className="p-4 border rounded-lg bg-muted/30">
                    <h4 className="font-medium mb-2">CAPTCHA Verification</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      Please complete the CAPTCHA to verify you are human
                    </p>
                    <Button onClick={simulateCaptcha} disabled={loading}>
                      Complete CAPTCHA
                    </Button>
                  </div>
                </div>
              )}

              {botDetection?.verificationSteps?.includes("phone_verification") && (
                <div className="space-y-4">
                  <div className="p-4 border rounded-lg bg-muted/30">
                    <h4 className="font-medium mb-2">Phone Verification</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      Verify your phone number to continue
                    </p>
                    <Button onClick={simulatePhoneVerification} disabled={loading}>
                      Verify Phone
                    </Button>
                  </div>
                </div>
              )}

              {botDetection?.verificationSteps?.includes("email_verification") && (
                <div className="space-y-4">
                  <div className="p-4 border rounded-lg bg-muted/30">
                    <h4 className="font-medium mb-2">Email Verification</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      Verify your email address to continue
                    </p>
                    <Button onClick={simulateEmailVerification} disabled={loading}>
                      Verify Email
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default PaymentPage;
