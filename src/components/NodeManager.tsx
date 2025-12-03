'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Play, Square, RefreshCw, Server } from 'lucide-react';

interface Node {
  id: number;
  name: string;
  ip: string;
  username: string;
  password: string;
  port: number;
  status: string;
  isMonitoring: boolean;
}

export function NodeManager() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    ip: '',
    username: '',
    password: '',
    port: '8728',
  });

  useEffect(() => {
    loadNodes();
  }, []);

  const loadNodes = async () => {
    try {
      const response = await fetch('/api/nodes');
      const data = await response.json();
      setNodes(data);
    } catch (error) {
      console.error('Failed to load nodes:', error);
    }
  };

  const handleAddNode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/nodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setIsAddDialogOpen(false);
        setFormData({ name: '', ip: '', username: '', password: '', port: '8728' });
        loadNodes();
      }
    } catch (error) {
      console.error('Failed to add node:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteNode = async (id: number) => {
    if (!confirm('Are you sure you want to delete this node?')) return;

    try {
      await fetch(`/api/nodes/${id}`, { method: 'DELETE' });
      loadNodes();
    } catch (error) {
      console.error('Failed to delete node:', error);
    }
  };

  const handleStartMonitoring = async (id: number) => {
    try {
      await fetch(`/api/monitor/${id}/start`, { method: 'POST' });
      setTimeout(loadNodes, 1000);
    } catch (error) {
      console.error('Failed to start monitoring:', error);
    }
  };

  const handleStopMonitoring = async (id: number) => {
    try {
      await fetch(`/api/monitor/${id}/stop`, { method: 'POST' });
      setTimeout(loadNodes, 1000);
    } catch (error) {
      console.error('Failed to stop monitoring:', error);
    }
  };

  const handleRestartMonitoring = async (id: number) => {
    try {
      await fetch(`/api/monitor/${id}/restart`, { method: 'POST' });
      setTimeout(loadNodes, 1000);
    } catch (error) {
      console.error('Failed to restart monitoring:', error);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">MikroTik Nodes</h2>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Node
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add MikroTik Node</DialogTitle>
              <DialogDescription>
                Enter the connection details for your MikroTik router
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddNode} className="space-y-4">
              <div>
                <Label htmlFor="name">Node Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Main Router"
                  required
                />
              </div>
              <div>
                <Label htmlFor="ip">IP Address</Label>
                <Input
                  id="ip"
                  value={formData.ip}
                  onChange={(e) => setFormData({ ...formData, ip: e.target.value })}
                  placeholder="192.168.1.1"
                  required
                />
              </div>
              <div>
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="admin"
                  required
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="port">API Port</Label>
                <Input
                  id="port"
                  value={formData.port}
                  onChange={(e) => setFormData({ ...formData, port: e.target.value })}
                  placeholder="8728"
                />
              </div>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? 'Adding...' : 'Add Node'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {nodes.map((node) => (
          <Card key={node.id} className="relative">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <Server className="w-5 h-5" />
                  <CardTitle>{node.name}</CardTitle>
                </div>
                <Badge variant={node.isMonitoring ? 'default' : 'secondary'}>
                  {node.isMonitoring ? 'Monitoring' : 'Stopped'}
                </Badge>
              </div>
              <CardDescription>{node.ip}:{node.port}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                {!node.isMonitoring ? (
                  <Button
                    size="sm"
                    onClick={() => handleStartMonitoring(node.id)}
                    className="flex-1"
                  >
                    <Play className="w-4 h-4 mr-1" />
                    Start
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleStopMonitoring(node.id)}
                    className="flex-1"
                  >
                    <Square className="w-4 h-4 mr-1" />
                    Stop
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleRestartMonitoring(node.id)}
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleDeleteNode(node.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {nodes.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Server className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              No nodes configured yet. Add your first MikroTik node to start monitoring.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
