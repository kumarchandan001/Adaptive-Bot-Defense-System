import { useState, useEffect } from "react";
import { io, Socket } from "socket.io-client";
const API_BASE = import.meta.env.VITE_API_BASE || '';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle, Shield, Bot, Clock } from "lucide-react";

interface ActivityEvent {
  id: string;
  timestamp: Date;
  type: "threat" | "block" | "detection" | "alert";
  message: string;
  severity: "low" | "medium" | "high";
  ip?: string;
}

const ActivityFeed = () => {
  const [events, setEvents] = useState<ActivityEvent[]>([
    {
      id: "1",
      timestamp: new Date(),
      type: "block",
      message: "Suspicious IP blocked after failed login attempts",
      severity: "high",
      ip: "192.168.1.100"
    },
    {
      id: "2",
      timestamp: new Date(Date.now() - 120000),
      type: "detection",
      message: "Bot-like behavior detected from user agent",
      severity: "medium",
      ip: "203.45.67.89"
    },
    {
      id: "3",
      timestamp: new Date(Date.now() - 240000),
      type: "threat",
      message: "Rate limit exceeded from multiple IPs",
      severity: "high"
    },
    {
      id: "4",
      timestamp: new Date(Date.now() - 360000),
      type: "alert",
      message: "Unusual traffic pattern detected",
      severity: "low"
    }
  ]);

  // Real-time activity via Socket.io
  useEffect(() => {
    const socket: Socket = io(API_BASE, { transports: ["websocket"] });
    socket.on("suspicious", (payload: any) => {
      const newEvent: ActivityEvent = {
        id: String(payload.id || Date.now()),
        timestamp: new Date(),
        type: "detection",
        message: `${payload.reason || "suspicious"} on ${payload.path || "/"}`,
        severity: payload.score >= 0.8 ? "high" : payload.score >= 0.6 ? "medium" : "low",
        ip: payload.ip
      };
      setEvents(prev => [newEvent, ...prev.slice(0, 49)]);
    });
    return () => socket.disconnect();
  }, []);

  const getEventIcon = (type: string) => {
    switch (type) {
      case "block": return <Shield className="w-4 h-4" />;
      case "threat": return <AlertTriangle className="w-4 h-4" />;
      case "detection": return <Bot className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getSeverityVariant = (severity: string) => {
    switch (severity) {
      case "high": return "destructive";
      case "medium": return "secondary";
      default: return "outline";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Live Activity Feed
        </CardTitle>
        <CardDescription>Real-time security events and system alerts</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px]">
          <div className="space-y-4">
            {events.map((event) => (
              <div key={event.id} className="flex items-start gap-3 p-3 rounded-lg border bg-card/50">
                <div className={`p-1 rounded-full ${
                  event.severity === "high" ? "bg-destructive/10 text-destructive" :
                  event.severity === "medium" ? "bg-orange-100 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400" :
                  "bg-muted text-muted-foreground"
                }`}>
                  {getEventIcon(event.type)}
                </div>
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium leading-none">{event.message}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{event.timestamp.toLocaleTimeString()}</span>
                    {event.ip && <span>• {event.ip}</span>}
                  </div>
                </div>
                <Badge variant={getSeverityVariant(event.severity)} className="text-xs">
                  {event.severity}
                </Badge>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default ActivityFeed;