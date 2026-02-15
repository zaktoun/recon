'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Activity,
  Target,
  Shield,
  Zap,
  Plus,
  Play,
  Search,
  Globe,
  Server,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  Trash2,
  Download
} from 'lucide-react'
import { AlertCircle } from 'lucide-react'

interface ReconTarget {
  id: string
  target: string
  targetType: string
  description?: string
  isActive: boolean
  createdAt: string
}

interface ReconTask {
  id: string
  taskType: string
  status: string
  progress: number
  startedAt?: string
  completedAt?: string
  target: string
}

export default function Home() {
  const [targets, setTargets] = useState<ReconTarget[]>([])
  const [tasks, setTasks] = useState<ReconTask[]>([])
  const [newTarget, setNewTarget] = useState('')
  const [targetType, setTargetType] = useState<'domain' | 'ip' | 'url'>('domain')
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalTargets: 0,
    activeScans: 0,
    completedScans: 0,
    totalFindings: 0
  })

  // Load initial data
  useEffect(() => {
    fetchTargets()
    fetchTasks()
  }, [])

  const fetchTargets = async () => {
    try {
      const response = await fetch('/api/recon/targets')
      if (response.ok) {
        const data = await response.json()
        setTargets(data.targets || [])
      }
    } catch (error) {
      console.error('Failed to fetch targets:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchTasks = async () => {
    try {
      const response = await fetch('/api/recon/tasks')
      if (response.ok) {
        const data = await response.json()
        setTasks(data.tasks || [])
        updateStats(data.tasks || [])
      }
    } catch (error) {
      console.error('Failed to fetch tasks:', error)
    }
  }

  const updateStats = (taskData: ReconTask[]) => {
    const activeScans = taskData.filter(t => t.status === 'running').length
    const completedScans = taskData.filter(t => t.status === 'completed').length
    const totalFindings = taskData.reduce((acc, t) => acc + (t.progress || 0), 0)
    
    setStats({
      totalTargets: targets.length,
      activeScans,
      completedScans,
      totalFindings: Math.floor(totalFindings / 10) // Rough estimate
    })
  }

  const addTarget = async () => {
    if (!newTarget.trim()) return

    // Security validation
    const targetInput = newTarget.trim()
    
    // Basic validation - prevent XSS and malicious input
    const dangerousPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+=/i,
      /eval\(/i,
      /<iframe/i
    ]
    
    for (const pattern of dangerousPatterns) {
      if (pattern.test(targetInput)) {
        alert('Invalid target: contains potentially dangerous input')
        return
      }
    }

    try {
      const response = await fetch('/api/recon/targets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target: targetInput,
          targetType,
          description: `Target added via dashboard`
        })
      })

      if (response.ok) {
        setNewTarget('')
        fetchTargets()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to add target')
      }
    } catch (error) {
      alert('Failed to add target. Please try again.')
    }
  }

  const deleteTarget = async (id: string) => {
    if (!confirm('Are you sure you want to delete this target?')) return
    
    try {
      const response = await fetch(`/api/recon/targets/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        fetchTargets()
      }
    } catch (error) {
      alert('Failed to delete target')
    }
  }

  const startScan = async (targetId: string, taskType: string) => {
    try {
      const response = await fetch('/api/recon/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetId, taskType })
      })

      if (response.ok) {
        fetchTasks()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to start scan')
      }
    } catch (error) {
      alert('Failed to start scan. Please try again.')
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'running':
        return <Badge className="bg-blue-500"><Activity className="w-3 h-3 mr-1" /> Running</Badge>
      case 'completed':
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" /> Completed</Badge>
      case 'failed':
        return <Badge className="bg-red-500"><AlertTriangle className="w-3 h-3 mr-1" /> Failed</Badge>
      default:
        return <Badge className="bg-gray-500"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>
    }
  }

  const getTaskIcon = (taskType: string) => {
    switch (taskType) {
      case 'subdomain':
        return <Globe className="w-4 h-4" />
      case 'port':
        return <Server className="w-4 h-4" />
      case 'service':
        return <Shield className="w-4 h-4" />
      default:
        return <Zap className="w-4 h-4" />
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <Target className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Recon Platform</h1>
                <p className="text-sm text-muted-foreground">Advanced Reconnaissance Tool</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="gap-2">
                <Activity className="w-4 h-4" />
                {stats.activeScans} Active
              </Badge>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Targets</CardTitle>
              <Target className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalTargets}</div>
              <p className="text-xs text-muted-foreground mt-1">Registered targets</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Scans</CardTitle>
              <Activity className="w-4 h-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.activeScans}</div>
              <p className="text-xs text-muted-foreground mt-1">Currently running</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed Scans</CardTitle>
              <CheckCircle className="w-4 h-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.completedScans}</div>
              <p className="text-xs text-muted-foreground mt-1">Successfully finished</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Findings</CardTitle>
              <AlertTriangle className="w-4 h-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalFindings}</div>
              <p className="text-xs text-muted-foreground mt-1">Items discovered</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="targets" className="space-y-6">
          <TabsList>
            <TabsTrigger value="targets">Targets</TabsTrigger>
            <TabsTrigger value="scans">Active Scans</TabsTrigger>
          </TabsList>

          {/* Targets Tab */}
          <TabsContent value="targets" className="space-y-6">
            {/* Add New Target Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  Add New Target
                </CardTitle>
                <CardDescription>
                  Add a domain, IP address, or URL for reconnaissance
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="target">Target</Label>
                    <Input
                      id="target"
                      placeholder="example.com or 192.168.1.1"
                      value={newTarget}
                      onChange={(e) => setNewTarget(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addTarget()}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="targetType">Target Type</Label>
                    <select
                      id="targetType"
                      className="w-full px-3 py-2 border rounded-md bg-background"
                      value={targetType}
                      onChange={(e) => setTargetType(e.target.value as any)}
                    >
                      <option value="domain">Domain</option>
                      <option value="ip">IP Address</option>
                      <option value="url">URL</option>
                    </select>
                  </div>
                </div>
                <Button onClick={addTarget} className="w-full md:w-auto">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Target
                </Button>
              </CardContent>
            </Card>

            {/* Targets List */}
            <Card>
              <CardHeader>
                <CardTitle>Registered Targets</CardTitle>
                <CardDescription>
                  Manage your reconnaissance targets
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Loading targets...
                  </div>
                ) : targets.length === 0 ? (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>No Targets</AlertTitle>
                    <AlertDescription>
                      Add your first target above to start reconnaissance
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {targets.map((target) => (
                      <div
                        key={target.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            {target.targetType === 'domain' && <Globe className="w-4 h-4 text-blue-500" />}
                            {target.targetType === 'ip' && <Server className="w-4 h-4 text-green-500" />}
                            {target.targetType === 'url' && <Search className="w-4 h-4 text-purple-500" />}
                            <div>
                              <div className="font-semibold">{target.target}</div>
                              <div className="text-sm text-muted-foreground">
                                {target.targetType} • {target.description}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => startScan(target.id, 'subdomain')}
                          >
                            <Play className="w-3 h-3 mr-1" />
                            Scan
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteTarget(target.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Active Scans Tab */}
          <TabsContent value="scans" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Scan Tasks
                </CardTitle>
                <CardDescription>
                  Monitor active and completed reconnaissance tasks
                </CardDescription>
              </CardHeader>
              <CardContent>
                {tasks.length === 0 ? (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>No Scans</AlertTitle>
                    <AlertDescription>
                      Start a scan from the Targets tab
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-4 max-h-[600px] overflow-y-auto">
                    {tasks.map((task) => (
                      <div
                        key={task.id}
                        className="p-4 border rounded-lg space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {getTaskIcon(task.taskType)}
                            <div>
                              <div className="font-semibold flex items-center gap-2">
                                {task.target}
                                <Badge variant="outline" className="text-xs">
                                  {task.taskType}
                                </Badge>
                              </div>
                              <div className="text-sm text-muted-foreground flex items-center gap-2">
                                <Clock className="w-3 h-3" />
                                {task.startedAt ? new Date(task.startedAt).toLocaleString() : 'Not started'}
                              </div>
                            </div>
                          </div>
                          {getStatusBadge(task.status)}
                        </div>

                        {task.status === 'running' && (
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>Progress</span>
                              <span>{task.progress}%</span>
                            </div>
                            <Progress value={task.progress} className="h-2" />
                          </div>
                        )}

                        {task.status === 'failed' && task.error && (
                          <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>{task.error}</AlertDescription>
                          </Alert>
                        )}

                        {task.status === 'completed' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full"
                            onClick={() => alert('Export functionality coming soon!')}
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Export Report
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="border-t mt-auto">
        <div className="container mx-auto px-4 py-6">
          <div className="text-center text-sm text-muted-foreground">
            <p>Recon Platform • Advanced Reconnaissance Tool for Ubuntu</p>
            <p className="mt-1 text-xs">Use responsibly and only on targets you have permission to scan</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
