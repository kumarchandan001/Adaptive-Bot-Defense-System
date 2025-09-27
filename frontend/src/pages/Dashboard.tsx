import { useState, useEffect } from "react";
import { getAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { Shield, AlertTriangle, TrendingUp, Users, Bot, Activity } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ThreatChart from "@/components/ThreatChart";
import ActivityFeed from "@/components/ActivityFeed";
import BlockManagement from "@/components/BlockManagement";
import PaymentSimulator from "@/components/PaymentSimulator";

const Dashboard = () => {
  const [realtimeData, setRealtimeData] = useState({
    totalRequests: 12847,
    botRequests: 1284,
    blockedRequests: 327,
    suspiciousIPs: 42,
    threatLevel: "medium" as "low" | "medium" | "high"
  });

  const [logs, setLogs] = useState<any[]>([]);
  const authNow = getAuth();
  const isAdmin = !!authNow.user && authNow.user.role === 'admin';

  useEffect(() => {
    // Initial logs fetch (admin-only)
    (async () => {
      try {
        const auth = getAuth();
        if (!auth.accessToken || auth.user?.role !== 'admin') return;
        const r = await api.get('/admin/logs', { params: { limit: 25 } });
        const items = r.data.items.map((x: any) => ({
          id: x._id,
          timestamp: new Date(x.createdAt),
          ip: x.ip,
          userAgent: x.userAgent,
          confidence: x.score ?? 0,
          action: x.reason === 'blocklist' ? 'blocked' : 'flagged',
          reason: x.reason
        }));
        setLogs(items);
      } catch (e) {
        // ignore for non-admin users
        console.log(e);
      }
    })();
  }, []);

  const [simulating, setSimulating] = useState<string | null>(null);

  async function simulate (kind: string) {
    const base = (import.meta as any).env.VITE_API_BASE || 'http://localhost:4001';
    setSimulating(kind);
    
    try {
      if (kind === 'human') {
        // Simulate normal human browser
        await fetch(`${base}/api/health`, { 
          headers: { 
            'x-js-ok': '1',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate, br'
          } 
        });
      } else if (kind === 'nojs') {
        // Simulate bot without JS execution
        await fetch(`${base}/api/health`, { 
          headers: { 
            'User-Agent': 'Mozilla/5.0 (compatible; BotDetector/1.0)',
            'Accept': '*/*'
          } 
        });
      } else if (kind === 'headless') {
        // Simulate headless browser
        await fetch(`${base}/api/health`, { 
          headers: { 
            'x-js-ok': '1',
            'User-Agent': 'HeadlessChrome/120.0.6099.109'
          } 
        });
      } else if (kind === 'geo') {
        // Simulate geo mismatch
        await fetch(`${base}/api/health`, { 
          headers: { 
            'x-js-ok': '1',
            'x-expected-country': 'US',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          } 
        });
      } else if (kind === 'login-fail') {
        // Simulate multiple failed login attempts
        for (let i = 0; i < 5; i++) {
          try {
            await fetch(`${base}/api/auth/login`, {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json', 
                'x-js-ok': '1',
                'User-Agent': 'Mozilla/5.0 (compatible; LoginBot/1.0)'
              },
              body: JSON.stringify({ email: `bot${i}@example.com`, password: 'wrongpassword' })
            });
          } catch (e) {
            // Expected to fail
            console.log(e);
          }
          // Add delay between attempts
          if (i < 4) await new Promise(resolve => setTimeout(resolve, 200));
        }
      } else if (kind === 'burst') {
        // Simulate burst of requests
        const requests = Array.from({ length: 15 }).map((_, i) => 
          fetch(`${base}/api/health`, { 
            headers: { 
              'x-js-ok': '1',
              'User-Agent': `Bot${i}/1.0`
            } 
          }).catch(() => null)
        );
        await Promise.all(requests);
      }
    } catch (e) {
      console.log('Simulation completed with expected behavior');
    } finally {
      setSimulating(null);
    }
  }

  const getThreatColor = (level: string) => {
    switch (level) {
      case "high": return "destructive" as const;
      case "medium": return "secondary" as const;
      default: return "outline" as const;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "destructive" as const;
    if (confidence >= 0.6) return "secondary" as const;
    return "outline" as const;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Security Dashboard</h1>
          <p className="text-muted-foreground">Real-time bot detection and threat monitoring</p>
        </div>
        <Badge variant={getThreatColor(realtimeData.threatLevel)} className="text-sm px-3 py-1">
          <Activity className="w-4 h-4 mr-1" />
          Threat Level: {realtimeData.threatLevel.toUpperCase()}
        </Badge>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{realtimeData.totalRequests.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">+12% from last hour</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bot Requests</CardTitle>
            <Bot className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{realtimeData.botRequests.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {((realtimeData.botRequests / realtimeData.totalRequests) * 100).toFixed(1)}% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Blocked</CardTitle>
            <Shield className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{realtimeData.blockedRequests.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">+8% from last hour</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Suspicious IPs</CardTitle>
            <AlertTriangle className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{realtimeData.suspiciousIPs}</div>
            <p className="text-xs text-muted-foreground">Active monitoring</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard Content */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          {isAdmin && <TabsTrigger value="logs">Security Logs</TabsTrigger>}
          <TabsTrigger value="activity">Live Activity</TabsTrigger>
          <TabsTrigger value="payment">Payment Simulator</TabsTrigger>
          {isAdmin && <TabsTrigger value="management">Block Management</TabsTrigger>}
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ThreatChart />
            <div className="space-y-3">
              <ActivityFeed />
              <Card>
                <CardHeader>
                  <CardTitle>Simulate Traffic</CardTitle>
                  <CardDescription>Quickly generate events to see detection in action</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => simulate('human')}
                    disabled={simulating !== null}
                  >
                    {simulating === 'human' ? 'Simulating...' : 'Human (JS ok)'}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => simulate('nojs')}
                    disabled={simulating !== null}
                  >
                    {simulating === 'nojs' ? 'Simulating...' : 'No JS'}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => simulate('headless')}
                    disabled={simulating !== null}
                  >
                    {simulating === 'headless' ? 'Simulating...' : 'Headless UA'}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => simulate('geo')}
                    disabled={simulating !== null}
                  >
                    {simulating === 'geo' ? 'Simulating...' : 'Geo mismatch'}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => simulate('login-fail')}
                    disabled={simulating !== null}
                  >
                    {simulating === 'login-fail' ? 'Simulating...' : 'Failed logins'}
                  </Button>
                  <Button 
                    onClick={() => simulate('burst')}
                    disabled={simulating !== null}
                  >
                    {simulating === 'burst' ? 'Simulating...' : 'Burst (rate-limit)'}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="logs" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Security Event Logs</CardTitle>
                <CardDescription>Detailed view of all security events and detections</CardDescription>
                <div className="flex gap-4">
                  <Input placeholder="Search by IP or user agent..." className="max-w-sm" />
                  <Select>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filter by action" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Actions</SelectItem>
                      <SelectItem value="blocked">Blocked</SelectItem>
                      <SelectItem value="flagged">Flagged</SelectItem>
                      <SelectItem value="allowed">Allowed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>IP Address</TableHead>
                      <TableHead>User Agent</TableHead>
                      <TableHead>Confidence</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-mono text-sm">
                          {log.timestamp.toLocaleTimeString()}
                        </TableCell>
                        <TableCell className="font-mono">{log.ip}</TableCell>
                        <TableCell className="max-w-xs truncate">{log.userAgent}</TableCell>
                        <TableCell>
                          <Badge variant={getConfidenceColor(log.confidence)}>
                            {(log.confidence * 100).toFixed(0)}%
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={log.action === "blocked" ? "destructive" : "secondary"}>
                            {log.action}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{log.reason}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="activity">
          <ActivityFeed />
        </TabsContent>

        <TabsContent value="payment">
          <PaymentSimulator />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="management">
            <BlockManagement />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default Dashboard;