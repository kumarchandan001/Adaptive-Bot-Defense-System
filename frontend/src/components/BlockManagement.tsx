import { useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trash2, Plus, Shield, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface BlockedItem {
  id: string;
  value: string;
  type: "ip" | "user";
  reason: string;
  blockedAt: Date;
  expiresAt?: Date;
}

const BlockManagement = () => {
  const { toast } = useToast();
  const [newBlockValue, setNewBlockValue] = useState("");
  const [newBlockReason, setNewBlockReason] = useState("");
  
  const [blockedItems, setBlockedItems] = useState<BlockedItem[]>([]);

  const handleBlock = async (type: "ip" | "user") => {
    if (!newBlockValue.trim() || !newBlockReason.trim()) {
      toast({
        title: "Error",
        description: "Please provide both value and reason",
        variant: "destructive"
      });
      return;
    }

    await api.post('/admin/block', { ip: type === 'ip' ? newBlockValue.trim() : undefined, userId: type === 'user' ? newBlockValue.trim() : undefined });

    const newBlock: BlockedItem = {
      id: Date.now().toString(),
      value: newBlockValue.trim(),
      type,
      reason: newBlockReason.trim(),
      blockedAt: new Date(),
      expiresAt: new Date(Date.now() + 86400000)
    };

    setBlockedItems(prev => [newBlock, ...prev]);
    setNewBlockValue("");
    setNewBlockReason("");
    
    toast({
      title: "Block Added",
      description: `${type === "ip" ? "IP address" : "User"} has been blocked successfully`,
    });
  };

  const handleUnblock = async (id: string) => {
    const item = blockedItems.find(b => b.id === id);
    if (!item) return;
    await api.post('/admin/unblock', { ip: item.type === 'ip' ? item.value : undefined, userId: item.type === 'user' ? item.value : undefined });
    setBlockedItems(prev => prev.filter(b => b.id !== id));
    
    toast({
      title: "Block Removed",
      description: `${item?.value} has been unblocked`,
    });
  };

  const formatTimeRemaining = (expiresAt?: Date) => {
    if (!expiresAt) return "Permanent";
    
    const remaining = expiresAt.getTime() - Date.now();
    if (remaining <= 0) return "Expired";
    
    const hours = Math.floor(remaining / 3600000);
    const minutes = Math.floor((remaining % 3600000) / 60000);
    
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Block Management</CardTitle>
          <CardDescription>Manage blocked IP addresses and users</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="list" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="list">Blocked Items</TabsTrigger>
              <TabsTrigger value="add">Add Block</TabsTrigger>
            </TabsList>
            
            <TabsContent value="list" className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Blocked At</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {blockedItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Badge variant="outline" className="flex items-center gap-1 w-fit">
                          {item.type === "ip" ? <Shield className="w-3 h-3" /> : <User className="w-3 h-3" />}
                          {item.type.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono">{item.value}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{item.reason}</TableCell>
                      <TableCell className="text-sm">
                        {item.blockedAt.toLocaleDateString()} {item.blockedAt.toLocaleTimeString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant={item.expiresAt ? "secondary" : "outline"}>
                          {formatTimeRemaining(item.expiresAt)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUnblock(item.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>
            
            <TabsContent value="add" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">IP Address or User ID</label>
                    <Input
                      placeholder="e.g., 192.168.1.100 or user@example.com"
                      value={newBlockValue}
                      onChange={(e) => setNewBlockValue(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Reason</label>
                    <Input
                      placeholder="e.g., Suspicious activity detected"
                      value={newBlockReason}
                      onChange={(e) => setNewBlockReason(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleBlock("ip")}
                      className="flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Block IP
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleBlock("user")}
                      className="flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Block User
                    </Button>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-muted/30 border">
                    <h4 className="font-medium mb-2">Block Guidelines</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• IP blocks are temporary (24 hours by default)</li>
                      <li>• User blocks are permanent until manually removed</li>
                      <li>• Always provide a clear reason for auditing</li>
                      <li>• Review blocks regularly to avoid false positives</li>
                    </ul>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default BlockManagement;