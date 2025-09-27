import { useState } from "react";
import { initiatePayment } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  CreditCard, 
  Bot, 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Clock,
  Smartphone,
  Mail
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PaymentSimulation {
  id: string;
  platform: string;
  amount: number;
  botScore: number;
  detectionReasons: string[];
  status: "success" | "blocked" | "verification_required";
  timestamp: Date;
}

const PaymentSimulator = () => {
  const { toast } = useToast();
  const [simulating, setSimulating] = useState<string | null>(null);
  const [simulations, setSimulations] = useState<PaymentSimulation[]>([]);

  const platforms = [
    { name: "Ticketmaster", value: "ticketmaster" },
    { name: "Eventbrite", value: "eventbrite" },
    { name: "StubHub", value: "stubhub" },
    { name: "SeatGeek", value: "seatgeek" },
    { name: "Vivid Seats", value: "vividseats" }
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success": return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "blocked": return <XCircle className="w-4 h-4 text-red-500" />;
      case "verification_required": return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      default: return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getRiskIcon = (reason: string) => {
    switch (reason) {
      case "headless_browser": return <Bot className="w-3 h-3" />;
      case "rapid_purchase": return <Clock className="w-3 h-3" />;
      case "multiple_devices": return <Smartphone className="w-3 h-3" />;
      case "geo_mismatch": return <AlertTriangle className="w-3 h-3" />;
      default: return <AlertTriangle className="w-3 h-3" />;
    }
  };

  const simulatePayment = async (scenario: string) => {
    setSimulating(scenario);
    
    try {
      let paymentData;
      
      switch (scenario) {
        case "human":
          paymentData = {
            platform: "ticketmaster",
            ticketId: `ticket_${Date.now()}`,
            amount: 150.00,
            currency: "USD",
            paymentMethod: "credit_card"
          };
          break;
        case "bot":
          paymentData = {
            platform: "eventbrite",
            ticketId: `ticket_${Date.now()}`,
            amount: 500.00,
            currency: "USD",
            paymentMethod: "credit_card"
          };
          break;
        case "rapid":
          paymentData = {
            platform: "stubhub",
            ticketId: `ticket_${Date.now()}`,
            amount: 200.00,
            currency: "USD",
            paymentMethod: "credit_card"
          };
          break;
        case "high_value":
          paymentData = {
            platform: "seatgeek",
            ticketId: `ticket_${Date.now()}`,
            amount: 2500.00,
            currency: "USD",
            paymentMethod: "credit_card"
          };
          break;
        default:
          paymentData = {
            platform: "vividseats",
            ticketId: `ticket_${Date.now()}`,
            amount: 100.00,
            currency: "USD",
            paymentMethod: "credit_card"
          };
      }

      const result = await initiatePayment(paymentData);
      
      const simulation: PaymentSimulation = {
        id: `sim_${Date.now()}`,
        platform: paymentData.platform,
        amount: paymentData.amount,
        botScore: result.botScore || 0,
        detectionReasons: result.detectionReasons || [],
        status: result.reason === "bot_detected" ? "blocked" : 
                result.reason === "medium_risk" ? "verification_required" : "success",
        timestamp: new Date()
      };

      setSimulations(prev => [simulation, ...prev.slice(0, 9)]); // Keep last 10

      toast({
        title: "Payment Simulation Complete",
        description: `Bot score: ${(result.botScore * 100).toFixed(1)}% - ${getBotScoreLabel(result.botScore)}`,
      });

    } catch (error: any) {
      toast({
        title: "Simulation Failed",
        description: error.response?.data?.message || "Payment simulation failed",
        variant: "destructive"
      });
    } finally {
      setSimulating(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Payment Bot Detection Simulator
          </CardTitle>
          <CardDescription>
            Test different payment scenarios to see bot detection in action
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button
              variant="outline"
              onClick={() => simulatePayment("human")}
              disabled={simulating !== null}
              className="h-auto p-4 flex flex-col items-center gap-2"
            >
              <Shield className="w-6 h-6 text-green-500" />
              <span className="text-sm font-medium">Human User</span>
              <span className="text-xs text-muted-foreground">Normal purchase</span>
            </Button>

            <Button
              variant="outline"
              onClick={() => simulatePayment("bot")}
              disabled={simulating !== null}
              className="h-auto p-4 flex flex-col items-center gap-2"
            >
              <Bot className="w-6 h-6 text-red-500" />
              <span className="text-sm font-medium">Bot Detection</span>
              <span className="text-xs text-muted-foreground">Suspicious behavior</span>
            </Button>

            <Button
              variant="outline"
              onClick={() => simulatePayment("rapid")}
              disabled={simulating !== null}
              className="h-auto p-4 flex flex-col items-center gap-2"
            >
              <Clock className="w-6 h-6 text-yellow-500" />
              <span className="text-sm font-medium">Rapid Purchase</span>
              <span className="text-xs text-muted-foreground">Multiple tickets</span>
            </Button>

            <Button
              variant="outline"
              onClick={() => simulatePayment("high_value")}
              disabled={simulating !== null}
              className="h-auto p-4 flex flex-col items-center gap-2"
            >
              <AlertTriangle className="w-6 h-6 text-orange-500" />
              <span className="text-sm font-medium">High Value</span>
              <span className="text-xs text-muted-foreground">Expensive tickets</span>
            </Button>
          </div>

          {simulating && (
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription>
                Simulating {simulating} payment scenario...
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Simulation Results */}
      {simulations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Simulations</CardTitle>
            <CardDescription>
              Latest payment simulation results
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {simulations.map((sim) => (
                <div key={sim.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(sim.status)}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium capitalize">{sim.platform}</span>
                        <span className="text-sm text-muted-foreground">
                          ${sim.amount.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={getBotScoreColor(sim.botScore)} className="text-xs">
                          {getBotScoreLabel(sim.botScore)}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {(sim.botScore * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    {sim.detectionReasons.slice(0, 3).map((reason, index) => (
                      <div key={index} className="flex items-center gap-1 text-xs text-muted-foreground">
                        {getRiskIcon(reason)}
                        <span className="hidden sm:inline">
                          {reason.replace(/_/g, " ")}
                        </span>
                      </div>
                    ))}
                    {sim.detectionReasons.length > 3 && (
                      <span className="text-xs text-muted-foreground">
                        +{sim.detectionReasons.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PaymentSimulator;
