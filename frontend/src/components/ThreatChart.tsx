import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";

const ThreatChart = () => {
  const data = [
    { time: "00:00", threats: 12, requests: 450 },
    { time: "04:00", threats: 8, requests: 380 },
    { time: "08:00", threats: 25, requests: 820 },
    { time: "12:00", threats: 42, requests: 1200 },
    { time: "16:00", threats: 38, requests: 1100 },
    { time: "20:00", threats: 28, requests: 750 },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Threat Detection Trends</CardTitle>
        <CardDescription>24-hour overview of detected threats vs total requests</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="time" className="text-muted-foreground" />
            <YAxis className="text-muted-foreground" />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "6px"
              }}
            />
            <Area
              type="monotone"
              dataKey="requests"
              stackId="1"
              stroke="hsl(var(--primary))"
              fill="hsl(var(--primary))"
              fillOpacity={0.1}
              name="Total Requests"
            />
            <Area
              type="monotone"
              dataKey="threats"
              stackId="2"
              stroke="hsl(var(--destructive))"
              fill="hsl(var(--destructive))"
              fillOpacity={0.3}
              name="Threats Detected"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default ThreatChart;