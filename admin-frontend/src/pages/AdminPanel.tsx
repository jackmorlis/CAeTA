import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import { apiClient, ApplicationResponse } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Users, Clock, LogOut, Search, Download, Eye, CheckCircle, ChevronLeft, ChevronRight, FileText, Mail, Upload } from 'lucide-react';

interface Stats {
  total_applications: number;
  today_applications: number;
  total_revenue: number;
  authorized_revenue: number;
  pending_applications: number;
}

const AdminPanel = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  const [applications, setApplications] = useState<ApplicationResponse[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedApp, setSelectedApp] = useState<ApplicationResponse | null>(null);
  const [exporting, setExporting] = useState(false);
  const [activeTab, setActiveTab] = useState<'pending' | 'delivered'>('pending');
  const [markingDelivered, setMarkingDelivered] = useState(false);
  const [currentTravelerIndex, setCurrentTravelerIndex] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [capturingPayment, setCapturingPayment] = useState(false);
  const [voidingPayment, setVoidingPayment] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [selectedPdfFile, setSelectedPdfFile] = useState<File | null>(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const perPage = 50;

  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Check if already authenticated
    if (apiClient.isAdminAuthenticated()) {
      setIsAuthenticated(true);
      loadData();
    } else {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Reload data when tab or page changes
    if (isAuthenticated) {
      loadData();
    }
  }, [activeTab, currentPage]);

  // Reset to page 1 when tab or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoggingIn(true);

    try {
      await apiClient.adminLogin(username, password);
      setIsAuthenticated(true);
      toast({
        title: "Login successful",
        description: "Welcome to the admin panel",
      });
      await loadData();
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error.message || "Invalid credentials",
        variant: "destructive"
      });
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await apiClient.adminLogout();
    setIsAuthenticated(false);
    setApplications([]);
    setStats(null);
    toast({
      title: "Logged out",
      description: "You have been logged out successfully",
    });
  };

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [appsData, statsData] = await Promise.all([
        apiClient.getAdminApplications(searchQuery || undefined, undefined, activeTab, currentPage, perPage),
        apiClient.getAdminStats()
      ]);

      setApplications(appsData.items);
      setTotalItems(appsData.total);
      setStats(statsData);
    } catch (error: any) {
      if (error.message.includes('Session expired')) {
        setIsAuthenticated(false);
        toast({
          title: "Session expired",
          description: "Please login again",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to load data",
          variant: "destructive"
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async () => {
    await loadData();
  };

  const handleToggleFulfillmentStatus = async () => {
    if (!selectedApp) return;

    const isCurrentlyPending = selectedApp.fulfillment_status === 'pending';

    try {
      setMarkingDelivered(true);

      if (isCurrentlyPending) {
        await apiClient.markApplicationAsDelivered(selectedApp.id);
        toast({
          title: "Application marked as delivered",
          description: `Application ${selectedApp.session_id} has been marked as delivered`,
        });
      } else {
        await apiClient.markApplicationAsPending(selectedApp.id);
        toast({
          title: "Application marked as pending",
          description: `Application ${selectedApp.session_id} has been marked as pending`,
        });
      }

      // Close modal and reload data
      setSelectedApp(null);
      setSelectedPdfFile(null);
      await loadData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update fulfillment status",
        variant: "destructive"
      });
    } finally {
      setMarkingDelivered(false);
    }
  };

  const handleSendDeliveryEmail = async () => {
    if (!selectedApp || !selectedPdfFile) return;

    try {
      setSendingEmail(true);
      const result = await apiClient.sendDeliveryEmail(selectedApp.id, selectedPdfFile);
      toast({
        title: "Delivery email sent",
        description: result.message,
      });
      setSelectedPdfFile(null);
      setSelectedApp(prev => prev ? { ...prev, delivery_email_sent_at: result.delivery_email_sent_at } : null);
      await loadData();
    } catch (error: any) {
      toast({
        title: "Failed to send delivery email",
        description: error.message || "An error occurred while sending the delivery email",
        variant: "destructive"
      });
    } finally {
      setSendingEmail(false);
    }
  };

  const handleCapturePayment = async () => {
    if (!selectedApp || !selectedApp.authorization_id) return;

    try {
      setCapturingPayment(true);
      await apiClient.captureAuthorization(selectedApp.id, selectedApp.authorization_id);
      toast({
        title: "Payment captured",
        description: `Funds for ${selectedApp.session_id} have been captured successfully`,
      });
      // Close modal and reload data
      setSelectedApp(null);
      setSelectedPdfFile(null);
      await loadData();
    } catch (error: any) {
      toast({
        title: "Capture failed",
        description: error.message || "Failed to capture payment",
        variant: "destructive"
      });
    } finally {
      setCapturingPayment(false);
    }
  };

  const handleVoidPayment = async () => {
    if (!selectedApp || !selectedApp.authorization_id) return;

    try {
      setVoidingPayment(true);
      await apiClient.voidAuthorization(selectedApp.id, selectedApp.authorization_id);
      toast({
        title: "Authorization voided",
        description: `Authorization for ${selectedApp.session_id} has been voided. Funds released.`,
      });
      // Close modal and reload data
      setSelectedApp(null);
      setSelectedPdfFile(null);
      await loadData();
    } catch (error: any) {
      toast({
        title: "Void failed",
        description: error.message || "Failed to void authorization",
        variant: "destructive"
      });
    } finally {
      setVoidingPayment(false);
    }
  };

  const handleExportPDF = async () => {
    if (!selectedApp) return;

    try {
      setExportingPDF(true);

      // Fetch payment logs to get IP address
      let clientIP = 'N/A';
      if (selectedApp.payment_order_id) {
        try {
          const logs = await apiClient.getPaymentLogs({ order_id: selectedApp.payment_order_id, limit: 10 });
          const logWithIP = logs.find(log => log.ip_address);
          if (logWithIP?.ip_address) {
            clientIP = logWithIP.ip_address;
          }
        } catch {
          // If payment logs fail, continue without IP
        }
      }

      const doc = new jsPDF();
      let y = 20;
      const lineHeight = 7;
      const sectionGap = 12;
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      const contentWidth = pageWidth - 2 * margin;

      // Helper function to add text and handle page breaks
      const addText = (text: string, fontSize: number = 10, isBold: boolean = false) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        doc.setFontSize(fontSize);
        doc.setFont('helvetica', isBold ? 'bold' : 'normal');
        doc.text(text, margin, y);
        y += lineHeight;
      };

      const addLabelValue = (label: string, value: string | undefined | null) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(label + ':', margin, y);
        doc.setFont('helvetica', 'normal');
        doc.text(value || 'N/A', margin + 55, y);
        y += lineHeight;
      };

      // Header
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('ORDER RECEIPT', pageWidth / 2, y, { align: 'center' });
      y += 10;

      // Generation timestamp (use order date, treat as UTC)
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      const createdAtUtc = selectedApp.created_at.endsWith('Z') ? selectedApp.created_at : selectedApp.created_at + 'Z';
      const orderDate = new Date(createdAtUtc);
      doc.text(`Generated: ${orderDate.toISOString().replace('T', ' ').slice(0, 19)} UTC`, pageWidth / 2, y, { align: 'center' });
      y += lineHeight;

      // Service description
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text('E-Ticket and travel application document support service', pageWidth / 2, y, { align: 'center' });
      y += sectionGap;

      // Divider line
      doc.setLineWidth(0.5);
      doc.line(margin, y, pageWidth - margin, y);
      y += sectionGap;

      // Payment Information Section
      addText('PAYMENT INFORMATION', 12, true);
      y += 3;
      addLabelValue('Reference Number', selectedApp.session_id);
      addLabelValue('Order Date', formatDate(selectedApp.created_at));
      addLabelValue('Amount', selectedApp.amount_paid ? `$${selectedApp.amount_paid.toFixed(2)} USD` : 'N/A');
      addLabelValue('Processing Option', selectedApp.processing_option || 'standard');
      addLabelValue('Transaction ID', selectedApp.payment_transaction_id);
      addLabelValue('PayPal Order ID', selectedApp.payment_order_id);
      addLabelValue('Client IP Address', clientIP);

      // Authorization details if present
      if (selectedApp.authorization_id) {
        y += 5;
        addText('Authorization Details:', 10, true);
        addLabelValue('Authorization ID', selectedApp.authorization_id);
        addLabelValue('Auth Status', selectedApp.authorization_status);
        addLabelValue('Authorized At', selectedApp.authorized_at ? formatDate(selectedApp.authorized_at) : 'N/A');
        addLabelValue('Captured At', selectedApp.captured_at ? formatDate(selectedApp.captured_at) : 'Not captured');
        if (selectedApp.capture_id) {
          addLabelValue('Capture ID', selectedApp.capture_id);
        }
      }

      y += sectionGap;
      doc.line(margin, y, pageWidth - margin, y);
      y += sectionGap;

      // Travelers Section
      selectedApp.travelers.forEach((traveler, index) => {
        addText(`TRAVELER ${index + 1} OF ${selectedApp.travelers.length}`, 12, true);
        y += 3;
        addLabelValue('First Name', traveler.first_name);
        addLabelValue('Last Name', traveler.last_name);
        addLabelValue('Passport Number', traveler.passport_number);
        addLabelValue('Nationality', traveler.nationality);
        addLabelValue('Date of Birth', traveler.date_of_birth);
        addLabelValue('Gender', traveler.gender);
        addLabelValue('Passport Expiry', traveler.passport_expiry_date);
        addLabelValue('Email', traveler.email);
        addLabelValue('Phone', `${traveler.phone_code} ${traveler.phone}`);
        y += sectionGap;
      });

      doc.line(margin, y, pageWidth - margin, y);
      y += sectionGap;

      // Travel Details Section
      addText('TRAVEL DETAILS', 12, true);
      y += 3;
      addLabelValue('Arrival Date', selectedApp.arrival_date);
      addLabelValue('Departure Date', selectedApp.departure_date);
      if (selectedApp.arrival_date && selectedApp.departure_date) {
        const arrival = new Date(selectedApp.arrival_date);
        const departure = new Date(selectedApp.departure_date);
        const days = Math.ceil((departure.getTime() - arrival.getTime()) / (1000 * 60 * 60 * 24));
        addLabelValue('Length of Stay', days > 0 ? `${days} days` : 'N/A');
      }
      addLabelValue('Departure Airport', selectedApp.embarkation_port);
      addLabelValue('Arrival Airport (DR)', selectedApp.disembarkation_port);
      addLabelValue('Airline Name', selectedApp.airline_name);
      addLabelValue('Flight Number', selectedApp.flight_number);
      addLabelValue('Travel Purpose', selectedApp.travel_purpose);
      addLabelValue('Accommodation Type', selectedApp.accommodation_type);
      addLabelValue('Accommodation Address', selectedApp.accommodation_details);
      if (selectedApp.return_departure_airport) {
        addLabelValue('Return Departure Airport (DR)', selectedApp.return_departure_airport);
        addLabelValue('Return Destination Airport', selectedApp.return_destination_airport);
        addLabelValue('Return Airline', selectedApp.return_airline_name);
        addLabelValue('Return Flight No', selectedApp.return_flight_number);
        addLabelValue('Return Flight Date', selectedApp.return_flight_date);
      }

      // Device Fingerprint Section (if available)
      if (selectedApp.device_fingerprint) {
        y += sectionGap;
        doc.line(margin, y, pageWidth - margin, y);
        y += sectionGap;

        addText('DEVICE INFORMATION', 12, true);
        y += 3;
        const fp = selectedApp.device_fingerprint;
        addLabelValue('User Agent', fp.user_agent);
        addLabelValue('Platform', fp.platform);
        addLabelValue('Screen Resolution', fp.screen_resolution);
        addLabelValue('Timezone', fp.timezone);
        addLabelValue('Language', fp.language);
        if (fp.webgl_renderer) {
          addLabelValue('GPU Renderer', fp.webgl_renderer);
        }
        addLabelValue('Touch Support', fp.touch_support ? 'Yes' : 'No');
        if (fp.device_memory) {
          addLabelValue('Device Memory', `${fp.device_memory} GB`);
        }
        if (fp.hardware_concurrency) {
          addLabelValue('CPU Cores', String(fp.hardware_concurrency));
        }
      }

      // Footer
      y += sectionGap;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.text('This document is generated for record-keeping purposes.', pageWidth / 2, 285, { align: 'center' });

      // Save the PDF
      doc.save(`order_${selectedApp.session_id}.pdf`);

      toast({
        title: "PDF exported",
        description: `Order ${selectedApp.session_id} exported successfully`,
      });
    } catch (error: any) {
      toast({
        title: "Export failed",
        description: error.message || "Failed to export PDF",
        variant: "destructive"
      });
    } finally {
      setExportingPDF(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      setExporting(true);
      const blob = await apiClient.exportAdminCSV();

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const date = new Date().toISOString().split('T')[0].replace(/-/g, '_');
      a.download = `dret_applications_${date}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Export successful",
        description: "CSV file has been downloaded",
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

  const isArrivalDateUrgent = (arrivalDate: string) => {
    // Check if arrival date is more than 3 days away (inclusive counting)
    // No timezone conversion - compare dates as-is
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset to midnight for date-only comparison
    const arrival = new Date(arrivalDate + 'T00:00:00'); // Parse as local date
    const diffTime = arrival.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    // Yellow if arrival is 3+ days away (e.g., Oct 31 → Nov 2 = 2 days diff, but 3 days inclusive)
    return diffDays >= 3;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800",
      paid: "bg-blue-100 text-blue-800",
      submitted: "bg-purple-100 text-purple-800",
      completed: "bg-green-100 text-green-800"
    };

    return (
      <Badge className={variants[status] || "bg-gray-100 text-gray-800"}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  const getProcessingBadge = (processingOption?: string) => {
    if (!processingOption || processingOption === 'standard') {
      return <Badge variant="secondary">Standard</Badge>;
    } else if (processingOption === 'fast') {
      return <Badge className="bg-blue-500 text-white">Fast</Badge>;
    } else if (processingOption === 'ultra') {
      return <Badge className="bg-purple-600 text-white">Ultra Premium</Badge>;
    }
    return <Badge variant="secondary">{processingOption}</Badge>;
  };

  const getAuthStatusBadge = (authStatus?: string | null) => {
    if (!authStatus) {
      return <Badge variant="secondary">N/A</Badge>;
    }
    const variants: Record<string, string> = {
      CREATED: "bg-blue-100 text-blue-800",        // Authorized, awaiting capture
      PENDING: "bg-yellow-100 text-yellow-800",    // Authorization pending
      CAPTURED: "bg-green-100 text-green-800",     // Funds captured
      VOIDED: "bg-red-100 text-red-800",           // Authorization voided
      EXPIRED: "bg-gray-100 text-gray-800",        // Authorization expired
      DENIED: "bg-red-100 text-red-800",           // Authorization denied
      FAILED: "bg-red-100 text-red-800",           // Authorization/capture failed
      PARTIALLY_CAPTURED: "bg-orange-100 text-orange-800",  // Partial capture
      CAPTURE_FAILED: "bg-red-100 text-red-800",   // Capture attempt failed
    };
    return (
      <Badge className={variants[authStatus] || "bg-gray-100 text-gray-800"}>
        {authStatus}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    // Ensure the date is treated as UTC by appending 'Z' if no timezone info
    const utcDateString = dateString.endsWith('Z') || dateString.includes('+') ? dateString : dateString + 'Z';
    const date = new Date(utcDateString);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    const seconds = String(date.getUTCSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds} UTC`;
  };

  const formatSimpleDate = (dateString: string) => {
    // Display date as-is without any timezone conversion (for arrival_date field)
    // Input format: "YYYY-MM-DD", Output format: "YYYY-MM-DD"
    return dateString;
  };


  // Login Form
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <main className="flex items-center justify-center py-12 px-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-2xl">Admin Login</CardTitle>
              <CardDescription>
                Enter your credentials to access the admin panel
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter username"
                    required
                    disabled={loggingIn}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    required
                    disabled={loggingIn}
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={loggingIn}
                >
                  {loggingIn ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Logging in...
                    </>
                  ) : (
                    'Login'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // Loading State
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <main className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
      </div>
    );
  }

  // Admin Dashboard
  return (
    <div className="min-h-screen bg-background">
      <main className="py-8">
        <div className="container mx-auto px-4 max-w-7xl">
          {/* Header */}
          <div className="mb-8 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-slate-800 mb-2">Admin Dashboard</h1>
              <p className="text-slate-600">Manage applications and view statistics</p>
            </div>
            <Button onClick={handleLogout} variant="outline">
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>

          {/* Statistics Cards */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.total_applications}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Today's Applications</CardTitle>
                  <Clock className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.today_applications}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending</CardTitle>
                  <Clock className="h-4 w-4 text-yellow-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.pending_applications}</div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Search and Export */}
          <div className="mb-6 flex gap-4">
            <div className="flex-1 flex gap-2">
              <Input
                placeholder="Search by reference number, email, or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="flex-1"
              />
              <Button onClick={handleSearch} variant="outline">
                <Search className="h-4 w-4" />
              </Button>
            </div>
            <Button onClick={handleExportCSV} disabled={exporting} variant="outline">
              {exporting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Export CSV
            </Button>
          </div>

          {/* Applications Table */}
          <Card>
            <CardHeader>
              <CardTitle>E-Ticket Workflow</CardTitle>
              <CardDescription>
                Manage e-ticket application fulfillment
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'pending' | 'delivered')}>
                <TabsList className="grid w-full grid-cols-2 max-w-md mb-4">
                  <TabsTrigger value="pending">
                    <Clock className="w-4 h-4 mr-2" />
                    Pending
                  </TabsTrigger>
                  <TabsTrigger value="delivered">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Delivered
                  </TabsTrigger>
                </TabsList>

                <TabsContent value={activeTab}>
                  {/* Showing X-Y of Z display */}
                  <div className="text-sm text-slate-600 mb-4">
                    {totalItems > 0 ? (
                      <>Showing {((currentPage - 1) * perPage) + 1}-{Math.min(currentPage * perPage, totalItems)} of {totalItems} {activeTab} orders</>
                    ) : (
                      <>No {activeTab} orders</>
                    )}
                  </div>

                  <div className="overflow-x-auto">
                    <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Reference Number</TableHead>
                      <TableHead>Travelers</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Arrival Date</TableHead>
                      <TableHead>Processing</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Auth Status</TableHead>
                      <TableHead>Created</TableHead>
                      {activeTab === 'delivered' && <TableHead>Delivered At</TableHead>}
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {applications.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={activeTab === 'delivered' ? 10 : 9} className="text-center py-8 text-slate-500">
                          No applications found
                        </TableCell>
                      </TableRow>
                    ) : (
                      applications.map((app) => {
                        const isUrgent = app.arrival_date && isArrivalDateUrgent(app.arrival_date);
                        return (
                        <TableRow key={app.id} className={isUrgent ? "bg-yellow-50" : ""}>
                          <TableCell className="font-mono text-xs">
                            {app.session_id}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4" />
                              <span>{app.travelers.length}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">
                            {app.travelers[0]?.email || 'N/A'}
                          </TableCell>
                          <TableCell className="text-sm font-medium">
                            {app.arrival_date ? formatSimpleDate(app.arrival_date) : 'N/A'}
                          </TableCell>
                          <TableCell>{getProcessingBadge(app.processing_option)}</TableCell>
                          <TableCell>{getStatusBadge(app.status)}</TableCell>
                          <TableCell>{getAuthStatusBadge(app.authorization_status)}</TableCell>
                          <TableCell className="text-sm text-slate-600">
                            {formatDate(app.created_at)}
                          </TableCell>
                          {activeTab === 'delivered' && (
                            <TableCell className="text-sm text-slate-600">
                              {app.fulfillment_delivered_at ? formatDate(app.fulfillment_delivered_at) : 'N/A'}
                            </TableCell>
                          )}
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedApp(app);
                                setCurrentTravelerIndex(0);
                              }}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

                  {/* Pagination Controls */}
                  {totalItems > perPage && (
                    <div className="flex items-center justify-between mt-4">
                      <div className="text-sm text-slate-500">
                        Page {currentPage} of {Math.ceil(totalItems / perPage)}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4 mr-1" />
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(p => Math.min(Math.ceil(totalItems / perPage), p + 1))}
                          disabled={currentPage >= Math.ceil(totalItems / perPage)}
                        >
                          Next
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </div>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Application Details Modal */}
          {selectedApp && selectedApp.travelers.length > 0 && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
              <Card className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Application Details</CardTitle>
                      <CardDescription className="mt-1">
                        <span className="font-mono text-xs">{selectedApp.session_id}</span>
                        {selectedApp.travelers.length > 1 && (
                          <span className="ml-4">
                            Traveler {currentTravelerIndex + 1} of {selectedApp.travelers.length}
                          </span>
                        )}
                      </CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      onClick={() => { setSelectedApp(null); setSelectedPdfFile(null); }}
                    >
                      ✕
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Payment Information - Always at Top */}
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                    <h3 className="text-lg font-semibold mb-3 text-slate-800">Payment Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-slate-600 font-medium">Reference Number:</span>
                        <span className="ml-2 font-mono font-semibold">{selectedApp.session_id}</span>
                      </div>
                      <div>
                        <span className="text-slate-600 font-medium">Order Time:</span>
                        <span className="ml-2 font-semibold">{formatDate(selectedApp.created_at)}</span>
                      </div>
                      <div>
                        <span className="text-slate-600 font-medium">Transaction ID:</span>
                        <span className="ml-2 font-mono font-semibold">{selectedApp.payment_transaction_id || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-slate-600 font-medium">PayPal Order ID:</span>
                        <span className="ml-2 font-mono font-semibold">{selectedApp.payment_order_id || 'N/A'}</span>
                      </div>
                    </div>

                    {/* Authorization Details - Only show if authorization exists */}
                    {selectedApp.authorization_id && (
                      <div className="mt-4 pt-4 border-t border-slate-200">
                        <h4 className="text-md font-semibold mb-3 text-slate-700">Authorization Details</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="text-slate-600 font-medium">Authorization ID:</span>
                            <span className="ml-2 font-mono font-semibold">{selectedApp.authorization_id}</span>
                          </div>
                          <div>
                            <span className="text-slate-600 font-medium">Auth Status:</span>
                            <span className="ml-2">{getAuthStatusBadge(selectedApp.authorization_status)}</span>
                          </div>
                          <div>
                            <span className="text-slate-600 font-medium">Authorized At:</span>
                            <span className="ml-2 font-semibold">{selectedApp.authorized_at ? formatDate(selectedApp.authorized_at) : 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-slate-600 font-medium">Captured At:</span>
                            <span className="ml-2 font-semibold">{selectedApp.captured_at ? formatDate(selectedApp.captured_at) : 'Not captured'}</span>
                          </div>
                          {selectedApp.capture_id && (
                            <div>
                              <span className="text-slate-600 font-medium">Capture ID:</span>
                              <span className="ml-2 font-mono font-semibold">{selectedApp.capture_id}</span>
                            </div>
                          )}
                        </div>

                        {/* Capture/Void Buttons - Only show if authorization is CREATED or PENDING */}
                        {(selectedApp.authorization_status === 'CREATED' || selectedApp.authorization_status === 'PENDING') && (
                          <div className="mt-4 pt-4 border-t border-slate-200 flex gap-3">
                            <Button
                              onClick={handleCapturePayment}
                              disabled={capturingPayment || voidingPayment}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              {capturingPayment ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Capturing...
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  Capture Payment
                                </>
                              )}
                            </Button>
                            <Button
                              onClick={handleVoidPayment}
                              disabled={capturingPayment || voidingPayment}
                              variant="destructive"
                            >
                              {voidingPayment ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Voiding...
                                </>
                              ) : (
                                'Void Authorization'
                              )}
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {(() => {
                    const traveler = selectedApp.travelers[currentTravelerIndex];
                    return (
                      <>
                        {/* Section 1: Personal Information */}
                        <div>
                          <h3 className="text-lg font-semibold mb-4">Section 1: Personal Information</h3>
                          <div className="space-y-3">
                            {/* Row 1: First Name and Last Name */}
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <span className="text-slate-600 font-medium">First Name:</span>
                                <span className="ml-2 font-semibold">{traveler.first_name}</span>
                              </div>
                              <div>
                                <span className="text-slate-600 font-medium">Last Name:</span>
                                <span className="ml-2 font-semibold">{traveler.last_name}</span>
                              </div>
                            </div>

                            {/* Row 2: Passport No. | Nationality */}
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <span className="text-slate-600 font-medium">Passport No.:</span>
                                <span className="ml-2 font-semibold font-mono">{traveler.passport_number}</span>
                              </div>
                              <div>
                                <span className="text-slate-600 font-medium">Nationality / Citizenship:</span>
                                <span className="ml-2 font-semibold">{traveler.nationality}</span>
                              </div>
                            </div>

                            {/* Row 3: Date of Birth | Sex */}
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <span className="text-slate-600 font-medium">Date of Birth:</span>
                                <span className="ml-2 font-semibold">{traveler.date_of_birth || 'N/A'}</span>
                              </div>
                              <div>
                                <span className="text-slate-600 font-medium">Sex:</span>
                                <span className="ml-2 font-semibold capitalize">{traveler.gender}</span>
                              </div>
                            </div>

                            {/* Row 4: Passport Expiry | Place of Birth */}
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <span className="text-slate-600 font-medium">Date of Passport Expiry:</span>
                                <span className="ml-2 font-semibold">{traveler.passport_expiry_date || 'N/A'}</span>
                              </div>
                              <div>
                                <span className="text-slate-600 font-medium">Place of Birth:</span>
                                <span className="ml-2 font-semibold">{traveler.place_of_birth || 'N/A'}</span>
                              </div>
                            </div>

                            {/* Row 4b: Civil Status | Occupation */}
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <span className="text-slate-600 font-medium">Civil Status:</span>
                                <span className="ml-2 font-semibold capitalize">{traveler.civil_status || 'N/A'}</span>
                              </div>
                              <div>
                                <span className="text-slate-600 font-medium">Occupation:</span>
                                <span className="ml-2 font-semibold">{traveler.occupation || 'N/A'}</span>
                              </div>
                            </div>

                            {/* Row 4c: Country of Residence | City */}
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <span className="text-slate-600 font-medium">Country of Residence:</span>
                                <span className="ml-2 font-semibold">{traveler.country_of_residence || 'N/A'}</span>
                              </div>
                              <div>
                                <span className="text-slate-600 font-medium">City:</span>
                                <span className="ml-2 font-semibold">{traveler.city || 'N/A'}</span>
                              </div>
                            </div>

                            {/* Row 5: Email Address (Full Width) */}
                            <div className="grid grid-cols-1 gap-4">
                              <div>
                                <span className="text-slate-600 font-medium">Email Address:</span>
                                <span className="ml-2 font-semibold">{traveler.email}</span>
                              </div>
                            </div>

                            {/* Row 6: Confirm Email Address (Full Width) */}
                            <div className="grid grid-cols-1 gap-4">
                              <div>
                                <span className="text-slate-600 font-medium">Confirm Email Address:</span>
                                <span className="ml-2 font-semibold">{traveler.email}</span>
                              </div>
                            </div>

                            {/* Row 7: Country Code | Mobile No. */}
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <span className="text-slate-600 font-medium">Country / Region Code:</span>
                                <span className="ml-2 font-semibold">{traveler.phone_code}</span>
                              </div>
                              <div>
                                <span className="text-slate-600 font-medium">Mobile No.:</span>
                                <span className="ml-2 font-semibold">{traveler.phone}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Section 2: Traveling Information */}
                        <div>
                          <h3 className="text-lg font-semibold mb-2">Section 2: Traveling Information</h3>
                          <p className="text-sm text-red-600 mb-4">
                            ** Please note that your trip must be within 3 days (including the date of submission)
                          </p>
                          <div className="space-y-3">
                            {/* Row 1: Date of Arrival | Date of Departure */}
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <span className="text-slate-600 font-medium">Date of Arrival:</span>
                                <span className="ml-2 font-semibold">{selectedApp.arrival_date ? formatSimpleDate(selectedApp.arrival_date) : 'N/A'}</span>
                              </div>
                              <div>
                                <span className="text-slate-600 font-medium">Date of Departure:</span>
                                <span className="ml-2 font-semibold">{selectedApp.departure_date ? formatSimpleDate(selectedApp.departure_date) : 'N/A'}</span>
                              </div>
                            </div>

                            {/* Row 2: Arrival Date | Departure Date */}
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <span className="text-slate-600 font-medium">Arrival Date:</span>
                                <span className="ml-2 font-semibold">{selectedApp.arrival_date || 'N/A'}</span>
                              </div>
                              <div>
                                <span className="text-slate-600 font-medium">Departure Date:</span>
                                <span className="ml-2 font-semibold">{selectedApp.departure_date || 'N/A'}</span>
                              </div>
                            </div>

                            {/* Row 3: Length of Stay */}
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <span className="text-slate-600 font-medium">Length of Stay:</span>
                                <span className="ml-2 font-semibold">
                                  {selectedApp.arrival_date && selectedApp.departure_date && (() => {
                                    const arrival = new Date(selectedApp.arrival_date!);
                                    const departure = new Date(selectedApp.departure_date!);
                                    const days = Math.ceil((departure.getTime() - arrival.getTime()) / (1000 * 60 * 60 * 24));
                                    return days > 0 ? `${days} days` : 'N/A';
                                  })() || 'N/A'}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-600 font-medium">Departure Country:</span>
                                <span className="ml-2 font-semibold">{selectedApp.departure_country || 'N/A'}</span>
                              </div>
                            </div>

                            {/* Arrival: Departure Airport | Arrival Airport (DR) */}
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <span className="text-slate-600 font-medium">Departure Airport:</span>
                                <span className="ml-2 font-semibold">{selectedApp.embarkation_port || 'N/A'}</span>
                              </div>
                              <div>
                                <span className="text-slate-600 font-medium">Arrival Airport (DR):</span>
                                <span className="ml-2 font-semibold">{selectedApp.disembarkation_port || 'N/A'}</span>
                              </div>
                            </div>

                            {/* Airline Name | Flight Number */}
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <span className="text-slate-600 font-medium">Airline Name:</span>
                                <span className="ml-2 font-semibold">{selectedApp.airline_name || 'N/A'}</span>
                              </div>
                              <div>
                                <span className="text-slate-600 font-medium">Flight Number:</span>
                                <span className="ml-2 font-semibold">{selectedApp.flight_number || 'N/A'}</span>
                              </div>
                            </div>

                            {/* Travel Purpose */}
                            <div className="grid grid-cols-1 gap-4">
                              <div>
                                <span className="text-slate-600 font-medium">Travel Purpose:</span>
                                <span className="ml-2 font-semibold capitalize">{selectedApp.travel_purpose || 'N/A'}</span>
                              </div>
                            </div>

                            {/* Accommodation */}
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <span className="text-slate-600 font-medium">Accommodation Type:</span>
                                <span className="ml-2 font-semibold capitalize">{selectedApp.accommodation_type || 'N/A'}</span>
                              </div>
                              <div>
                                <span className="text-slate-600 font-medium">Accommodation Address:</span>
                                <span className="ml-2 font-semibold">{selectedApp.accommodation_details || 'N/A'}</span>
                              </div>
                            </div>

                            {/* Return / Departure Flight Details */}
                            {(selectedApp.return_departure_airport || selectedApp.return_destination_airport) && <>
                              <div className="border-t pt-3 mt-3">
                                <h4 className="text-md font-semibold text-slate-700 mb-2">Departure Details</h4>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <span className="text-slate-600 font-medium">Departure Airport (DR):</span>
                                  <span className="ml-2 font-semibold">{selectedApp.return_departure_airport || 'N/A'}</span>
                                </div>
                                <div>
                                  <span className="text-slate-600 font-medium">Destination Airport:</span>
                                  <span className="ml-2 font-semibold">{selectedApp.return_destination_airport || 'N/A'}</span>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <span className="text-slate-600 font-medium">Airline Name:</span>
                                  <span className="ml-2 font-semibold">{selectedApp.return_airline_name || 'N/A'}</span>
                                </div>
                                <div>
                                  <span className="text-slate-600 font-medium">Flight Number:</span>
                                  <span className="ml-2 font-semibold">{selectedApp.return_flight_number || 'N/A'}</span>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <span className="text-slate-600 font-medium">Flight Date:</span>
                                  <span className="ml-2 font-semibold">{selectedApp.return_flight_date || 'N/A'}</span>
                                </div>
                                <div></div>
                              </div>
                            </>}

                            {/* Permanent Address (legacy, show only if present) */}
                            {selectedApp.permanent_address && <div className="grid grid-cols-1 gap-4">
                              <div>
                                <span className="text-slate-600 font-medium">Permanent Address:</span>
                                <span className="ml-2 font-semibold">{selectedApp.permanent_address}</span>
                              </div>
                            </div>}
                          </div>
                        </div>

                        {/* Section 3: Customs Declarations */}
                        <div>
                          <h3 className="text-lg font-semibold mb-4">Section 3: Customs Declarations</h3>
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <span className="text-slate-600 font-medium">Currency &gt; $10K:</span>
                                <span className="ml-2 font-semibold capitalize">{selectedApp.exceeds_money_limit || 'no'}</span>
                              </div>
                              {selectedApp.exceeds_money_limit === 'yes' && selectedApp.currency_amount && (
                                <div>
                                  <span className="text-slate-600 font-medium">Amount:</span>
                                  <span className="ml-2 font-semibold">{selectedApp.currency_amount} {selectedApp.currency_type || ''}</span>
                                </div>
                              )}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <span className="text-slate-600 font-medium">Animals or Food Products:</span>
                                <span className="ml-2 font-semibold capitalize">{selectedApp.has_animals_or_food || 'no'}</span>
                              </div>
                              <div>
                                <span className="text-slate-600 font-medium">Taxable Goods:</span>
                                <span className="ml-2 font-semibold capitalize">{selectedApp.has_taxable_goods || 'no'}</span>
                              </div>
                            </div>
                            {selectedApp.has_taxable_goods === 'yes' && selectedApp.taxable_value && (
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <span className="text-slate-600 font-medium">Taxable Value:</span>
                                  <span className="ml-2 font-semibold">{selectedApp.taxable_value} {selectedApp.taxable_currency || ''}</span>
                                </div>
                                <div>
                                  <span className="text-slate-600 font-medium">Description:</span>
                                  <span className="ml-2 font-semibold">{selectedApp.taxable_description || 'N/A'}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    );
                  })()}

                  {/* Delivery Email Section */}
                  {selectedApp.fulfillment_status === 'pending' && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h3 className="text-lg font-semibold mb-3 text-blue-800 flex items-center gap-2">
                        <Mail className="h-5 w-5" />
                        Send E-Ticket Delivery Email
                      </h3>
                      {selectedApp.delivery_email_sent_at ? (
                        <div className="space-y-3">
                          <div className="text-sm text-green-700">
                            <CheckCircle className="inline h-4 w-4 mr-1" />
                            Delivery email sent on {formatDate(selectedApp.delivery_email_sent_at)}
                          </div>
                          <p className="text-xs text-blue-600">You can re-send with a different PDF if needed:</p>
                          <div className="flex items-center gap-3">
                            <label className="flex items-center gap-2 cursor-pointer border border-blue-300 rounded-md px-4 py-2 bg-white hover:bg-blue-50 transition-colors">
                              <Upload className="h-4 w-4 text-blue-600" />
                              <span className="text-sm">
                                {selectedPdfFile ? selectedPdfFile.name : 'Choose PDF file'}
                              </span>
                              <input
                                type="file"
                                accept=".pdf"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) setSelectedPdfFile(file);
                                }}
                              />
                            </label>
                            <Button
                              onClick={handleSendDeliveryEmail}
                              disabled={!selectedPdfFile || sendingEmail}
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              {sendingEmail ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Sending...
                                </>
                              ) : (
                                <>
                                  <Mail className="mr-2 h-4 w-4" />
                                  Re-send Email
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <p className="text-sm text-blue-700">
                            Upload the E-Ticket PDF and send it to the customer at{' '}
                            <strong>{selectedApp.travelers[0]?.email}</strong>
                          </p>
                          <div className="flex items-center gap-3">
                            <label className="flex items-center gap-2 cursor-pointer border border-blue-300 rounded-md px-4 py-2 bg-white hover:bg-blue-50 transition-colors">
                              <Upload className="h-4 w-4 text-blue-600" />
                              <span className="text-sm">
                                {selectedPdfFile ? selectedPdfFile.name : 'Choose PDF file'}
                              </span>
                              <input
                                type="file"
                                accept=".pdf"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) setSelectedPdfFile(file);
                                }}
                              />
                            </label>
                            <Button
                              onClick={handleSendDeliveryEmail}
                              disabled={!selectedPdfFile || sendingEmail}
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              {sendingEmail ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Sending...
                                </>
                              ) : (
                                <>
                                  <Mail className="mr-2 h-4 w-4" />
                                  Send Email
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Navigation and Actions */}
                  <div className="flex justify-between items-center">
                    <div className="flex gap-2">
                      {selectedApp.travelers.length > 1 && (
                        <>
                          <Button
                            variant="outline"
                            onClick={() => setCurrentTravelerIndex(Math.max(0, currentTravelerIndex - 1))}
                            disabled={currentTravelerIndex === 0}
                          >
                            Previous Traveler
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => setCurrentTravelerIndex(Math.min(selectedApp.travelers.length - 1, currentTravelerIndex + 1))}
                            disabled={currentTravelerIndex === selectedApp.travelers.length - 1}
                          >
                            Next Traveler
                          </Button>
                        </>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={handleExportPDF}
                        disabled={exportingPDF}
                        variant="outline"
                      >
                        {exportingPDF ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Exporting...
                          </>
                        ) : (
                          <>
                            <FileText className="mr-2 h-4 w-4" />
                            Export PDF
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={handleToggleFulfillmentStatus}
                        disabled={
                          markingDelivered ||
                          (selectedApp.fulfillment_status === 'pending' && !selectedApp.delivery_email_sent_at)
                        }
                        className={selectedApp.fulfillment_status === 'pending'
                          ? "bg-green-600 hover:bg-green-700"
                          : "bg-yellow-600 hover:bg-yellow-700"}
                        title={
                          selectedApp.fulfillment_status === 'pending' && !selectedApp.delivery_email_sent_at
                            ? "Send the delivery email first before marking as delivered"
                            : undefined
                        }
                      >
                        {markingDelivered ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Updating...
                          </>
                        ) : selectedApp.fulfillment_status === 'pending' ? (
                          <>
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Mark as Delivered
                          </>
                        ) : (
                          <>
                            <Clock className="mr-2 h-4 w-4" />
                            Mark as Pending
                          </>
                        )}
                      </Button>
                      <Button onClick={() => { setSelectedApp(null); setSelectedPdfFile(null); }} variant="outline">
                        Close
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminPanel;
