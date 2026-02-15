import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient, PaymentLog, AuthorizationSummary, AuthorizationStatsResponse } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Loader2, DollarSign, TrendingUp, ArrowLeft, RefreshCw, Eye, X, Download, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface FinancialStats {
  // Today
  today_captured: number;
  today_authorized: number;
  today_voided: number;
  today_failed: number;
  // Yesterday
  yesterday_captured: number;
  yesterday_authorized: number;
  yesterday_voided: number;
  yesterday_failed: number;
  // 7-Day
  revenue_7_days_captured: number;
  revenue_7_days_authorized: number;
  revenue_7_days_voided: number;
  revenue_7_days_failed: number;
  // 30-Day
  revenue_30_days_captured: number;
  revenue_30_days_authorized: number;
  revenue_30_days_voided: number;
  revenue_30_days_failed: number;
  // Existing
  avg_order_value: number;
  total_successful_payments: number;
  total_failed_payments: number;
}

const FinancialPanel = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<FinancialStats | null>(null);
  const [paymentLogs, setPaymentLogs] = useState<PaymentLog[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedLog, setSelectedLog] = useState<PaymentLog | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportingAnalytics, setExportingAnalytics] = useState(false);

  // Authorization states
  const [activeTab, setActiveTab] = useState<'revenue' | 'authorizations'>('revenue');
  const [authStats, setAuthStats] = useState<AuthorizationStatsResponse | null>(null);
  const [authFilter, setAuthFilter] = useState<'pending' | 'failed' | 'voided' | 'ready' | undefined>(undefined);
  const [capturingAuth, setCapturingAuth] = useState<string | null>(null);
  const [voidingAuth, setVoidingAuth] = useState<string | null>(null);

  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!apiClient.isAdminAuthenticated()) {
      navigate('/');
      return;
    }
    loadData();
  }, [navigate]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [financialStats, logs, authorizationStats] = await Promise.all([
        apiClient.getFinancialStats(),
        apiClient.getPaymentLogs({ limit: 50 }),
        apiClient.getAuthorizationStats(authFilter)
      ]);

      setStats(financialStats);
      setPaymentLogs(logs);
      setAuthStats(authorizationStats);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load financial data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadAuthorizationStats = async (filter?: 'pending' | 'failed' | 'voided' | 'ready') => {
    try {
      const authorizationStats = await apiClient.getAuthorizationStats(filter);
      setAuthStats(authorizationStats);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load authorization stats",
        variant: "destructive"
      });
    }
  };

  const handleAuthFilterChange = async (filter: 'pending' | 'failed' | 'voided' | 'ready' | undefined) => {
    setAuthFilter(filter);
    await loadAuthorizationStats(filter);
  };

  const handleCaptureAuth = async (app: AuthorizationSummary) => {
    if (!app.authorization_id) return;

    try {
      setCapturingAuth(app.id);
      await apiClient.captureAuthorization(app.id, app.authorization_id);
      toast({
        title: "Payment captured",
        description: `Funds for ${app.session_id} have been captured successfully`,
      });
      await loadAuthorizationStats(authFilter);
    } catch (error: any) {
      toast({
        title: "Capture failed",
        description: error.message || "Failed to capture payment",
        variant: "destructive"
      });
    } finally {
      setCapturingAuth(null);
    }
  };

  const handleVoidAuth = async (app: AuthorizationSummary) => {
    if (!app.authorization_id) return;

    try {
      setVoidingAuth(app.id);
      await apiClient.voidAuthorization(app.id, app.authorization_id);
      toast({
        title: "Authorization voided",
        description: `Authorization for ${app.session_id} has been voided`,
      });
      await loadAuthorizationStats(authFilter);
    } catch (error: any) {
      toast({
        title: "Void failed",
        description: error.message || "Failed to void authorization",
        variant: "destructive"
      });
    } finally {
      setVoidingAuth(null);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
    toast({
      title: "Refreshed",
      description: "Financial data has been updated",
    });
  };

  const getAuthStatusBadge = (status?: string) => {
    if (!status) return <Badge variant="secondary">N/A</Badge>;

    const variants: Record<string, string> = {
      CREATED: "bg-blue-100 text-blue-800",
      PENDING: "bg-yellow-100 text-yellow-800",
      CAPTURED: "bg-green-100 text-green-800",
      VOIDED: "bg-red-100 text-red-800",
      EXPIRED: "bg-gray-100 text-gray-800",
      DENIED: "bg-red-100 text-red-800",
      FAILED: "bg-red-100 text-red-800",
      CAPTURE_FAILED: "bg-red-100 text-red-800",
    };

    return (
      <Badge className={variants[status] || "bg-gray-100 text-gray-800"}>
        {status}
      </Badge>
    );
  };

  const handleExportPaymentLogs = async () => {
    try {
      setExporting(true);
      const blob = await apiClient.exportPaymentLogsCSV();

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payment_logs_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Export successful",
        description: "Payment logs CSV has been downloaded",
      });
    } catch (error: any) {
      toast({
        title: "Export failed",
        description: error.message || "Failed to export CSV",
        variant: "destructive"
      });
    } finally {
      setExporting(false);
    }
  };

  const handleExportAnalytics = async () => {
    try {
      setExportingAnalytics(true);
      const blob = await apiClient.exportAnalyticsCSV();

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics_export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Export successful",
        description: "Analytics CSV has been downloaded",
      });
    } catch (error: any) {
      toast({
        title: "Export failed",
        description: error.message || "Failed to export analytics CSV",
        variant: "destructive"
      });
    } finally {
      setExportingAnalytics(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    // Display raw UTC timestamp without timezone conversion
    const date = new Date(dateString);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    const seconds = String(date.getUTCSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds} UTC`;
  };

  const getEventTypeBadge = (eventType: string) => {
    if (eventType.includes('success')) {
      return <Badge className="bg-green-500">Success</Badge>;
    } else if (eventType.includes('error')) {
      return <Badge variant="destructive">Error</Badge>;
    } else if (eventType.includes('rejected')) {
      return <Badge variant="destructive">Rejected</Badge>;
    } else if (eventType.includes('request')) {
      return <Badge variant="outline">Request</Badge>;
    }
    return <Badge variant="secondary">{eventType}</Badge>;
  };

  const handleViewDetails = (log: PaymentLog) => {
    setSelectedLog(log);
    setDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-50 to-white">
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Financial Dashboard</h1>
            <p className="text-slate-600 mt-1">Revenue analytics and payment logs</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => navigate('/')}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Applications
            </Button>
            <Button
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'revenue' | 'authorizations')} className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="revenue">
              <DollarSign className="mr-2 h-4 w-4" />
              Revenue
            </TabsTrigger>
            <TabsTrigger value="authorizations">
              <AlertTriangle className="mr-2 h-4 w-4" />
              Authorizations
              {authStats && (authStats.pending_authorizations + authStats.failed_captures) > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {authStats.pending_authorizations + authStats.failed_captures}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="revenue" className="space-y-6">
        {/* Revenue Metrics - 4 Timeframes */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Today */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Today</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Captured</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(stats?.today_captured || 0)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Authorized (Pending)</p>
                  <p className="text-2xl font-bold text-amber-600">
                    {formatCurrency(stats?.today_authorized || 0)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Voided</p>
                  <p className="text-2xl font-bold text-red-600">
                    {formatCurrency(stats?.today_voided || 0)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Failed</p>
                  <p className="text-2xl font-bold text-red-800">
                    {formatCurrency(stats?.today_failed || 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Yesterday */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Yesterday</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Captured</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(stats?.yesterday_captured || 0)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Authorized (Pending)</p>
                  <p className="text-2xl font-bold text-amber-600">
                    {formatCurrency(stats?.yesterday_authorized || 0)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Voided</p>
                  <p className="text-2xl font-bold text-red-600">
                    {formatCurrency(stats?.yesterday_voided || 0)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Failed</p>
                  <p className="text-2xl font-bold text-red-800">
                    {formatCurrency(stats?.yesterday_failed || 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 7-Day */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Last 7 Days</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Captured</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(stats?.revenue_7_days_captured || 0)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Authorized (Pending)</p>
                  <p className="text-2xl font-bold text-amber-600">
                    {formatCurrency(stats?.revenue_7_days_authorized || 0)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Voided</p>
                  <p className="text-2xl font-bold text-red-600">
                    {formatCurrency(stats?.revenue_7_days_voided || 0)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Failed</p>
                  <p className="text-2xl font-bold text-red-800">
                    {formatCurrency(stats?.revenue_7_days_failed || 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 30-Day */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Last 30 Days</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Captured</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(stats?.revenue_30_days_captured || 0)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Authorized (Pending)</p>
                  <p className="text-2xl font-bold text-amber-600">
                    {formatCurrency(stats?.revenue_30_days_authorized || 0)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Voided</p>
                  <p className="text-2xl font-bold text-red-600">
                    {formatCurrency(stats?.revenue_30_days_voided || 0)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Failed</p>
                  <p className="text-2xl font-bold text-red-800">
                    {formatCurrency(stats?.revenue_30_days_failed || 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Additional Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Order Value (AOV)</CardTitle>
              <DollarSign className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats?.avg_order_value || 0)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                From {stats?.total_successful_payments || 0} captured payments
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Successful Payments</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {stats?.total_successful_payments || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">All-time captured</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Failed Payments</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {stats?.total_failed_payments || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Voided/Expired/Failed</p>
            </CardContent>
          </Card>
        </div>

        {/* Payment Logs Table */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>Recent Payment Logs</CardTitle>
                <CardDescription>
                  Last {paymentLogs.length} payment events
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleExportAnalytics}
                  disabled={exportingAnalytics}
                  variant="outline"
                  size="sm"
                >
                  {exportingAnalytics ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  Export Analytics
                </Button>
                <Button
                  onClick={handleExportPaymentLogs}
                  disabled={exporting}
                  variant="outline"
                  size="sm"
                >
                  {exporting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  Export Logs
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date/Time</TableHead>
                    <TableHead>Event Type</TableHead>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Error Details</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paymentLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground">
                        No payment logs found
                      </TableCell>
                    </TableRow>
                  ) : (
                    paymentLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-mono text-xs">
                          {formatDate(log.created_at)}
                        </TableCell>
                        <TableCell>
                          {getEventTypeBadge(log.event_type)}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {log.order_id || '-'}
                        </TableCell>
                        <TableCell>
                          {log.amount ? formatCurrency(log.amount) : '-'}
                        </TableCell>
                        <TableCell>
                          {log.capture_status && (
                            <Badge variant={log.capture_status === 'COMPLETED' ? 'default' : 'secondary'}>
                              {log.capture_status}
                            </Badge>
                          )}
                          {log.order_status && !log.capture_status && (
                            <Badge variant="secondary">{log.order_status}</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs max-w-xs">
                          {log.paypal_error_name || log.paypal_error_code || log.error_message ? (
                            <div className="space-y-1">
                              {log.paypal_error_name && (
                                <div className="font-semibold text-red-600">{log.paypal_error_name}</div>
                              )}
                              {log.paypal_error_code && (
                                <Badge variant="destructive" className="text-xs">{log.paypal_error_code}</Badge>
                              )}
                              {log.error_message && (
                                <div className="text-muted-foreground truncate" title={log.error_message}>
                                  {log.error_message}
                                </div>
                              )}
                              {log.paypal_debug_id && (
                                <div className="font-mono text-xs text-blue-600" title="PayPal Debug ID">
                                  {log.paypal_debug_id}
                                </div>
                              )}
                            </div>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {log.ip_address || '-'}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetails(log)}
                            className="h-8 w-8 p-0"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
          </TabsContent>

          <TabsContent value="authorizations" className="space-y-6">
            {/* Authorization Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card
                className={`cursor-pointer transition-all ${authFilter === 'pending' ? 'ring-2 ring-blue-500' : ''}`}
                onClick={() => handleAuthFilterChange(authFilter === 'pending' ? undefined : 'pending')}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending Authorizations</CardTitle>
                  <Clock className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">{authStats?.pending_authorizations || 0}</div>
                  <p className="text-xs text-muted-foreground">Awaiting capture</p>
                </CardContent>
              </Card>

              <Card
                className={`cursor-pointer transition-all ${authFilter === 'ready' ? 'ring-2 ring-green-500' : ''}`}
                onClick={() => handleAuthFilterChange(authFilter === 'ready' ? undefined : 'ready')}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Ready for Capture</CardTitle>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{authStats?.ready_for_capture || 0}</div>
                  <p className="text-xs text-muted-foreground">Delivered 7+ days ago</p>
                </CardContent>
              </Card>

              <Card
                className={`cursor-pointer transition-all ${authFilter === 'failed' ? 'ring-2 ring-red-500' : ''}`}
                onClick={() => handleAuthFilterChange(authFilter === 'failed' ? undefined : 'failed')}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Failed Captures</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{authStats?.failed_captures || 0}</div>
                  <p className="text-xs text-muted-foreground">Expired/Failed/Denied</p>
                </CardContent>
              </Card>

              <Card
                className={`cursor-pointer transition-all ${authFilter === 'voided' ? 'ring-2 ring-gray-500' : ''}`}
                onClick={() => handleAuthFilterChange(authFilter === 'voided' ? undefined : 'voided')}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Voided</CardTitle>
                  <X className="h-4 w-4 text-gray-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-600">{authStats?.voided_authorizations || 0}</div>
                  <p className="text-xs text-muted-foreground">Manually voided</p>
                </CardContent>
              </Card>
            </div>

            {/* Authorizations Table */}
            <Card>
              <CardHeader>
                <CardTitle>
                  {authFilter === 'pending' && 'Pending Authorizations'}
                  {authFilter === 'ready' && 'Ready for Capture'}
                  {authFilter === 'failed' && 'Failed Captures'}
                  {authFilter === 'voided' && 'Voided Authorizations'}
                  {!authFilter && 'All Uncaptured Authorizations'}
                </CardTitle>
                <CardDescription>
                  {authFilter ? `Showing ${authFilter} authorizations` : 'Click a card above to filter'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Reference</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Auth Status</TableHead>
                        <TableHead>Fulfillment</TableHead>
                        <TableHead>Authorized At</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {!authStats?.applications || authStats.applications.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                            No authorizations found
                          </TableCell>
                        </TableRow>
                      ) : (
                        authStats.applications.map((app) => (
                          <TableRow key={app.id}>
                            <TableCell className="font-mono text-xs">{app.session_id}</TableCell>
                            <TableCell className="text-sm">{app.first_traveler_email || '-'}</TableCell>
                            <TableCell>{app.amount_paid ? formatCurrency(app.amount_paid) : '-'}</TableCell>
                            <TableCell>{getAuthStatusBadge(app.authorization_status)}</TableCell>
                            <TableCell>
                              <Badge variant={app.fulfillment_status === 'delivered' ? 'default' : 'secondary'}>
                                {app.fulfillment_status}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              {app.authorized_at ? formatDate(app.authorized_at) : '-'}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                {(app.authorization_status === 'CREATED' || app.authorization_status === 'PENDING') && (
                                  <>
                                    <Button
                                      size="sm"
                                      onClick={() => handleCaptureAuth(app)}
                                      disabled={capturingAuth === app.id || voidingAuth === app.id}
                                      className="bg-green-600 hover:bg-green-700"
                                    >
                                      {capturingAuth === app.id ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                      ) : (
                                        'Capture'
                                      )}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => handleVoidAuth(app)}
                                      disabled={capturingAuth === app.id || voidingAuth === app.id}
                                    >
                                      {voidingAuth === app.id ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                      ) : (
                                        'Void'
                                      )}
                                    </Button>
                                  </>
                                )}
                                {(app.authorization_status === 'EXPIRED' || app.authorization_status === 'CAPTURE_FAILED') && (
                                  <span className="text-xs text-red-600">Needs attention</span>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Payment Log Details Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Payment Log Details</DialogTitle>
            <DialogDescription>
              Full PayPal API request and response data
            </DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-6">
              {/* Summary Information */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg">
                <div>
                  <div className="text-sm font-semibold text-slate-600">Event Type</div>
                  <div className="mt-1">{getEventTypeBadge(selectedLog.event_type)}</div>
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-600">Date/Time</div>
                  <div className="mt-1 font-mono text-sm">{formatDate(selectedLog.created_at)}</div>
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-600">Order ID</div>
                  <div className="mt-1 font-mono text-sm">{selectedLog.order_id || '-'}</div>
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-600">Transaction ID</div>
                  <div className="mt-1 font-mono text-sm">{selectedLog.transaction_id || '-'}</div>
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-600">Amount</div>
                  <div className="mt-1 text-sm">{selectedLog.amount ? formatCurrency(selectedLog.amount) : '-'}</div>
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-600">Status</div>
                  <div className="mt-1">
                    {selectedLog.capture_status && (
                      <Badge variant={selectedLog.capture_status === 'COMPLETED' ? 'default' : 'secondary'}>
                        {selectedLog.capture_status}
                      </Badge>
                    )}
                    {selectedLog.order_status && !selectedLog.capture_status && (
                      <Badge variant="secondary">{selectedLog.order_status}</Badge>
                    )}
                  </div>
                </div>
                {selectedLog.payer_email && (
                  <div>
                    <div className="text-sm font-semibold text-slate-600">Payer Email</div>
                    <div className="mt-1 text-sm">{selectedLog.payer_email}</div>
                  </div>
                )}
                {selectedLog.ip_address && (
                  <div>
                    <div className="text-sm font-semibold text-slate-600">IP Address</div>
                    <div className="mt-1 font-mono text-sm">{selectedLog.ip_address}</div>
                  </div>
                )}
              </div>

              {/* Error Details */}
              {(selectedLog.paypal_error_name || selectedLog.paypal_error_code || selectedLog.error_message) && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="text-sm font-semibold text-red-800 mb-2">Error Information</div>
                  {selectedLog.paypal_error_name && (
                    <div className="mb-2">
                      <span className="text-xs font-semibold text-red-600">Error Name:</span>
                      <div className="font-semibold text-red-700">{selectedLog.paypal_error_name}</div>
                    </div>
                  )}
                  {selectedLog.paypal_error_code && (
                    <div className="mb-2">
                      <span className="text-xs font-semibold text-red-600">Error Code:</span>
                      <Badge variant="destructive" className="ml-2">{selectedLog.paypal_error_code}</Badge>
                    </div>
                  )}
                  {selectedLog.error_message && (
                    <div className="mb-2">
                      <span className="text-xs font-semibold text-red-600">Message:</span>
                      <div className="text-sm text-red-700 mt-1">{selectedLog.error_message}</div>
                    </div>
                  )}
                  {selectedLog.paypal_debug_id && (
                    <div>
                      <span className="text-xs font-semibold text-red-600">PayPal Debug ID:</span>
                      <div className="font-mono text-sm text-blue-600 mt-1">{selectedLog.paypal_debug_id}</div>
                      <div className="text-xs text-slate-500 mt-1">Use this ID when contacting PayPal support</div>
                    </div>
                  )}
                </div>
              )}

              {/* Request Payload */}
              {selectedLog.request_payload && (
                <div>
                  <div className="text-sm font-semibold text-slate-700 mb-2">Request Payload (Sent to PayPal)</div>
                  <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto text-xs">
                    {JSON.stringify(selectedLog.request_payload, null, 2)}
                  </pre>
                </div>
              )}

              {/* Response Payload */}
              {selectedLog.response_payload && (
                <div>
                  <div className="text-sm font-semibold text-slate-700 mb-2">Response Payload (Received from PayPal)</div>
                  <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto text-xs">
                    {JSON.stringify(selectedLog.response_payload, null, 2)}
                  </pre>
                </div>
              )}

              {/* Close Button */}
              <div className="flex justify-end">
                <Button onClick={() => setDialogOpen(false)} variant="outline">
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FinancialPanel;
