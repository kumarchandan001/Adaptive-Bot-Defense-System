import { Shield, Bot, BarChart3, Clock, Lock, Globe, Users, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const Features = () => {
  const features = [
    {
      icon: <Bot className="w-8 h-8" />,
      title: "Advanced Bot Detection",
      description: "Machine learning algorithms analyze behavioral patterns, user agents, and request fingerprints to identify automated traffic with 99.9% accuracy.",
      highlights: ["Behavioral Analysis", "User-Agent Fingerprinting", "Request Pattern Recognition"]
    },
    {
      icon: <Clock className="w-8 h-8" />,
      title: "Real-time Monitoring",
      description: "Instant threat detection and response with sub-100ms analysis times. Monitor your traffic 24/7 with live dashboards and alerts.",
      highlights: ["<100ms Response", "Live Dashboards", "Instant Alerts"]
    },
    {
      icon: <BarChart3 className="w-8 h-8" />,
      title: "Comprehensive Analytics",
      description: "Detailed insights into traffic patterns, threat trends, and system performance with customizable reports and visualizations.",
      highlights: ["Traffic Analysis", "Threat Trends", "Custom Reports"]
    },
    {
      icon: <Shield className="w-8 h-8" />,
      title: "Automated Protection",
      description: "Intelligent rate limiting, IP blocking, and challenge responses that adapt to threat levels automatically.",
      highlights: ["Smart Rate Limiting", "Auto IP Blocking", "Challenge System"]
    },
    {
      icon: <Globe className="w-8 h-8" />,
      title: "Geolocation Analysis",
      description: "Track and analyze traffic by geographic location to identify suspicious patterns and implement location-based security policies.",
      highlights: ["GEO Tracking", "Location Policies", "VPN Detection"]
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: "User Behavior Tracking",
      description: "Monitor user sessions and identify unusual patterns that may indicate compromised accounts or automated behavior.",
      highlights: ["Session Tracking", "Anomaly Detection", "Account Security"]
    }
  ];

  const securityLevels = [
    {
      level: "Basic Protection",
      description: "Essential bot detection and rate limiting",
      features: ["IP Rate Limiting", "Basic User-Agent Analysis", "Simple Blocking"],
      color: "outline"
    },
    {
      level: "Advanced Security",
      description: "Comprehensive threat detection and response",
      features: ["Behavioral Analysis", "Fingerprinting", "Geo Analysis", "Auto Response"],
      color: "secondary"
    },
    {
      level: "Enterprise Shield",
      description: "Military-grade protection with custom rules",
      features: ["ML-Powered Detection", "Custom Rules", "API Integration", "24/7 Support"],
      color: "destructive"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <section className="py-16 px-4">
        <div className="container mx-auto text-center">
          <Badge variant="outline" className="mb-4">
            Advanced Security Features
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Complete Bot Detection Suite
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Protect your platform with our comprehensive suite of advanced security features, 
            designed to detect and prevent automated threats in real-time.
          </p>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg">
                <CardHeader>
                  <div className="text-primary mb-4">{feature.icon}</div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                  <CardDescription className="text-base leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {feature.highlights.map((highlight, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {highlight}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Security Levels */}
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Security Levels</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Choose the right level of protection for your needs, from basic rate limiting 
              to enterprise-grade threat detection.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {securityLevels.map((level, index) => (
              <Card key={index} className={`border-2 ${
                index === 1 ? "border-primary shadow-lg scale-105" : "border-border"
              } transition-all duration-300`}>
                <CardHeader className="text-center">
                  <div className="flex justify-center mb-4">
                    <AlertTriangle className={`w-12 h-12 ${
                      index === 0 ? "text-muted-foreground" :
                      index === 1 ? "text-primary" : "text-destructive"
                    }`} />
                  </div>
                  <CardTitle className="text-2xl">{level.level}</CardTitle>
                  <CardDescription className="text-base">
                    {level.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {level.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Technical Specifications */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Technical Specifications</h2>
            <p className="text-muted-foreground">
              Built with performance and reliability in mind
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-4xl font-bold text-primary mb-2">99.9%</div>
              <div className="text-sm text-muted-foreground">Detection Accuracy</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-accent mb-2">&lt;100ms</div>
              <div className="text-sm text-muted-foreground">Response Time</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-success mb-2">10M+</div>
              <div className="text-sm text-muted-foreground">Requests/Hour</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-primary mb-2">24/7</div>
              <div className="text-sm text-muted-foreground">Monitoring</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Features;