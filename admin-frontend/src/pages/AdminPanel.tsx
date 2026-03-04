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
import { Loader2, Users, Clock, LogOut, Search, Download, Eye, CheckCircle, ChevronLeft, ChevronRight, FileText } from 'lucide-react';

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
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [capturingPayment, setCapturingPayment] = useState(false);
  const [voidingPayment, setVoidingPayment] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);
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
      doc.text('CANADA eTA - ORDER RECEIPT', pageWidth / 2, y, { align: 'center' });
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
      doc.text('Canada eTA (Electronic Travel Authorization) application support service', pageWidth / 2, y, { align: 'center' });
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

      // Applicant Information Section
      addText('APPLICANT INFORMATION', 12, true);
      y += 3;
      addLabelValue('Surname', selectedApp.surname);
      addLabelValue('Given Names', selectedApp.given_names);
      addLabelValue('Date of Birth', selectedApp.date_of_birth);
      addLabelValue('Gender', selectedApp.gender);
      addLabelValue('Email', selectedApp.email);
      addLabelValue('Nationality', selectedApp.nationality);
      addLabelValue('Country of Birth', selectedApp.country_of_birth);
      addLabelValue('City of Birth', selectedApp.city_of_birth);

      y += sectionGap;
      doc.line(margin, y, pageWidth - margin, y);
      y += sectionGap;

      // Passport Information
      addText('PASSPORT INFORMATION', 12, true);
      y += 3;
      addLabelValue('Applying On Behalf', selectedApp.applying_on_behalf);
      addLabelValue('Travel Document Type', selectedApp.travel_document_type);
      addLabelValue('Passport Country Code', selectedApp.passport_country_code);
      addLabelValue('Passport Number', selectedApp.passport_number);
      addLabelValue('Passport Issue Date', selectedApp.passport_issue_date);
      addLabelValue('Passport Expiry Date', selectedApp.passport_expiry_date);
      if (selectedApp.additional_nationalities && selectedApp.additional_nationalities.length > 0) {
        addLabelValue('Additional Nationalities', selectedApp.additional_nationalities.join(', '));
      }
      addLabelValue('Previous Canada Visa', selectedApp.previous_canada_visa);
      addLabelValue('UCI Number', selectedApp.uci_number);

      y += sectionGap;
      doc.line(margin, y, pageWidth - margin, y);
      y += sectionGap;

      // Representative (if applicable)
      if (selectedApp.representative_surname || selectedApp.representative_given_names) {
        y += 6;
        doc.setFont('helvetica', 'bold');
        doc.text('Representative Information', 14, y);
        y += 5;
        doc.setFont('helvetica', 'normal');
        addLabelValue('Representative Surname', selectedApp.representative_surname);
        addLabelValue('Representative Given Names', selectedApp.representative_given_names);
      }

      // Additional Personal Details
      y += 6;
      doc.setFont('helvetica', 'bold');
      doc.text('Additional Personal Details', 14, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      addLabelValue('Middle Name', selectedApp.middle_name);
      addLabelValue('Marital Status', selectedApp.marital_status);

      // Employment
      y += 6;
      doc.setFont('helvetica', 'bold');
      doc.text('Employment Information', 14, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      addLabelValue('Occupation', selectedApp.occupation);
      addLabelValue('Job Title', selectedApp.job_title);
      addLabelValue('Employer Name', selectedApp.employer_name);
      addLabelValue('Employer Country', selectedApp.employer_country);
      addLabelValue('Employer City', selectedApp.employer_city);
      addLabelValue('Employment Since', selectedApp.employment_since_year);

      // Background Questions
      y += 6;
      doc.setFont('helvetica', 'bold');
      doc.text('Background Questions', 14, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      addLabelValue('Refused Visa/Entry', selectedApp.bg_refused_visa);
      if (selectedApp.bg_refused_visa_details) addLabelValue('Refused Visa Details', selectedApp.bg_refused_visa_details);
      addLabelValue('Criminal Offence', selectedApp.bg_criminal_offence);
      if (selectedApp.bg_criminal_offence_details) addLabelValue('Criminal Details', selectedApp.bg_criminal_offence_details);
      addLabelValue('TB Contact', selectedApp.bg_tuberculosis);
      addLabelValue('TB Health Worker', selectedApp.bg_tb_health_worker);
      addLabelValue('TB Diagnosed', selectedApp.bg_tb_diagnosed);
      addLabelValue('Medical Condition', selectedApp.bg_medical_condition);
      if (selectedApp.bg_additional_details) addLabelValue('Additional Details', selectedApp.bg_additional_details);

      // Address Information
      addText('ADDRESS INFORMATION', 12, true);
      y += 3;
      addLabelValue('Apartment/Unit', selectedApp.apartment_unit);
      addLabelValue('Street Address', selectedApp.street_address);
      addLabelValue('City', selectedApp.city);
      addLabelValue('Country of Residence', selectedApp.country_residence);
      addLabelValue('District/Region', selectedApp.district_region);
      addLabelValue('Postal Code', selectedApp.postal_code);

      y += sectionGap;
      doc.line(margin, y, pageWidth - margin, y);
      y += sectionGap;

      // Travel Details
      addText('TRAVEL DETAILS', 12, true);
      y += 3;
      addLabelValue('Travel Date Known', selectedApp.travel_date_known);
      addLabelValue('Travel Date', selectedApp.travel_date);
      if (selectedApp.travel_hour || selectedApp.travel_minute) {
        addLabelValue('Travel Time', `${selectedApp.travel_hour || '--'}:${selectedApp.travel_minute || '--'}`);
      }
      addLabelValue('Travel Timezone', selectedApp.travel_timezone);
      addLabelValue('Language Preference', selectedApp.language_preference);

      y += sectionGap;
      doc.line(margin, y, pageWidth - margin, y);
      y += sectionGap;

      // Consent
      addText('CONSENT & SIGNATURE', 12, true);
      y += 3;
      addLabelValue('Consent Agreed', selectedApp.consent_agreed ? 'Yes' : 'No');
      addLabelValue('Signature', selectedApp.signature);
      addLabelValue('Declaration Agreed', selectedApp.declaration_agreed ? 'Yes' : 'No');

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
      a.download = `canada_eta_applications_${date}.csv`;
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
      CREATED: "bg-blue-100 text-blue-800",
      PENDING: "bg-yellow-100 text-yellow-800",
      CAPTURED: "bg-green-100 text-green-800",
      VOIDED: "bg-red-100 text-red-800",
      EXPIRED: "bg-gray-100 text-gray-800",
      DENIED: "bg-red-100 text-red-800",
      FAILED: "bg-red-100 text-red-800",
      PARTIALLY_CAPTURED: "bg-orange-100 text-orange-800",
      CAPTURE_FAILED: "bg-red-100 text-red-800",
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
              <h1 className="text-3xl font-bold text-slate-800 mb-2">Canada eTA Admin Dashboard</h1>
              <p className="text-slate-600">Manage eTA applications and view statistics</p>
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
                placeholder="Search by session ID, email, or name..."
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
              <CardTitle>Canada eTA Workflow</CardTitle>
              <CardDescription>
                Manage Canada eTA application fulfillment
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
                      <TableHead>Session ID</TableHead>
                      <TableHead>Surname</TableHead>
                      <TableHead>Given Names</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Nationality</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Processing</TableHead>
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
                      applications.map((app) => (
                        <TableRow key={app.id}>
                          <TableCell className="font-mono text-xs">
                            {app.session_id}
                          </TableCell>
                          <TableCell className="text-sm font-medium">
                            {app.surname || 'N/A'}
                          </TableCell>
                          <TableCell className="text-sm">
                            {app.given_names || 'N/A'}
                          </TableCell>
                          <TableCell className="text-sm">
                            {app.email || 'N/A'}
                          </TableCell>
                          <TableCell className="text-sm">
                            {app.nationality || 'N/A'}
                          </TableCell>
                          <TableCell>{getStatusBadge(app.status)}</TableCell>
                          <TableCell>{getProcessingBadge(app.processing_option)}</TableCell>
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
                              onClick={() => setSelectedApp(app)}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
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
          {selectedApp && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
              <Card className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Application Details</CardTitle>
                      <CardDescription className="mt-1">
                        <span className="font-mono text-xs">{selectedApp.session_id}</span>
                      </CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      onClick={() => { setSelectedApp(null);}}
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
                        <span className="text-slate-600 font-medium">Session ID:</span>
                        <span className="ml-2 font-mono font-semibold">{selectedApp.session_id}</span>
                      </div>
                      <div>
                        <span className="text-slate-600 font-medium">Order Time:</span>
                        <span className="ml-2 font-semibold">{formatDate(selectedApp.created_at)}</span>
                      </div>
                      <div>
                        <span className="text-slate-600 font-medium">Payment Status:</span>
                        <span className="ml-2 font-semibold">{selectedApp.payment_status || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-slate-600 font-medium">Payment Method:</span>
                        <span className="ml-2 font-semibold">{selectedApp.payment_method || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-slate-600 font-medium">Transaction ID:</span>
                        <span className="ml-2 font-mono font-semibold">{selectedApp.payment_transaction_id || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-slate-600 font-medium">PayPal Order ID:</span>
                        <span className="ml-2 font-mono font-semibold">{selectedApp.payment_order_id || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-slate-600 font-medium">Amount Paid:</span>
                        <span className="ml-2 font-semibold">{selectedApp.amount_paid ? `$${selectedApp.amount_paid.toFixed(2)} USD` : 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-slate-600 font-medium">Processing Option:</span>
                        <span className="ml-2">{getProcessingBadge(selectedApp.processing_option)}</span>
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

                  {/* Applicant Information */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Applicant Information</h3>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-slate-600 font-medium">Applying On Behalf:</span>
                          <span className="ml-2 font-semibold">{selectedApp.applying_on_behalf || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-slate-600 font-medium">Travel Document Type:</span>
                          <span className="ml-2 font-semibold">{selectedApp.travel_document_type || 'N/A'}</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-slate-600 font-medium">Surname:</span>
                          <span className="ml-2 font-semibold">{selectedApp.surname || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-slate-600 font-medium">Given Names:</span>
                          <span className="ml-2 font-semibold">{selectedApp.given_names || 'N/A'}</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-slate-600 font-medium">Date of Birth:</span>
                          <span className="ml-2 font-semibold">{selectedApp.date_of_birth || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-slate-600 font-medium">Gender:</span>
                          <span className="ml-2 font-semibold capitalize">{selectedApp.gender || 'N/A'}</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-slate-600 font-medium">Country of Birth:</span>
                          <span className="ml-2 font-semibold">{selectedApp.country_of_birth || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-slate-600 font-medium">City of Birth:</span>
                          <span className="ml-2 font-semibold">{selectedApp.city_of_birth || 'N/A'}</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-slate-600 font-medium">Nationality:</span>
                          <span className="ml-2 font-semibold">{selectedApp.nationality || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-slate-600 font-medium">Email:</span>
                          <span className="ml-2 font-semibold">{selectedApp.email || 'N/A'}</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-slate-600 font-medium">Language Preference:</span>
                          <span className="ml-2 font-semibold">{selectedApp.language_preference || 'N/A'}</span>
                        </div>
                      </div>
                    </div>

                  {/* Representative Information (for minors) */}
                  {(selectedApp.representative_surname || selectedApp.representative_given_names) && (
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Representative Information</h3>
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="text-slate-600 font-medium">Representative Surname:</span>
                            <span className="ml-2 font-semibold">{selectedApp.representative_surname || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-slate-600 font-medium">Representative Given Names:</span>
                            <span className="ml-2 font-semibold">{selectedApp.representative_given_names || 'N/A'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Additional Personal Details */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Additional Personal Details</h3>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-slate-600 font-medium">Middle Name:</span>
                          <span className="ml-2 font-semibold">{selectedApp.middle_name || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-slate-600 font-medium">Marital Status:</span>
                          <span className="ml-2 font-semibold capitalize">{selectedApp.marital_status || 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  </div>

                  {/* Passport Information */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Passport Information</h3>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-slate-600 font-medium">Passport Country Code:</span>
                          <span className="ml-2 font-semibold">{selectedApp.passport_country_code || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-slate-600 font-medium">Passport Number:</span>
                          <span className="ml-2 font-semibold font-mono">{selectedApp.passport_number || 'N/A'}</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-slate-600 font-medium">Passport Issue Date:</span>
                          <span className="ml-2 font-semibold">{selectedApp.passport_issue_date || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-slate-600 font-medium">Passport Expiry Date:</span>
                          <span className="ml-2 font-semibold">{selectedApp.passport_expiry_date || 'N/A'}</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-slate-600 font-medium">Previous Canada Visa:</span>
                          <span className="ml-2 font-semibold">{selectedApp.previous_canada_visa || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-slate-600 font-medium">UCI Number:</span>
                          <span className="ml-2 font-semibold font-mono">{selectedApp.uci_number || 'N/A'}</span>
                        </div>
                      </div>
                      {selectedApp.additional_nationalities && selectedApp.additional_nationalities.length > 0 && (
                        <div className="grid grid-cols-1 gap-4">
                          <div>
                            <span className="text-slate-600 font-medium">Additional Nationalities:</span>
                            <span className="ml-2 font-semibold">{selectedApp.additional_nationalities.join(', ')}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Address Information */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Address Information</h3>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-slate-600 font-medium">Apartment/Unit:</span>
                          <span className="ml-2 font-semibold">{selectedApp.apartment_unit || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-slate-600 font-medium">Street Address:</span>
                          <span className="ml-2 font-semibold">{selectedApp.street_address || 'N/A'}</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-slate-600 font-medium">City:</span>
                          <span className="ml-2 font-semibold">{selectedApp.city || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-slate-600 font-medium">Country of Residence:</span>
                          <span className="ml-2 font-semibold">{selectedApp.country_residence || 'N/A'}</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-slate-600 font-medium">District/Region:</span>
                          <span className="ml-2 font-semibold">{selectedApp.district_region || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-slate-600 font-medium">Postal Code:</span>
                          <span className="ml-2 font-semibold">{selectedApp.postal_code || 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Travel Details */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Travel Details</h3>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-slate-600 font-medium">Travel Date Known:</span>
                          <span className="ml-2 font-semibold">{selectedApp.travel_date_known || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-slate-600 font-medium">Travel Date:</span>
                          <span className="ml-2 font-semibold">{selectedApp.travel_date || 'N/A'}</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-slate-600 font-medium">Travel Time:</span>
                          <span className="ml-2 font-semibold">
                            {selectedApp.travel_hour && selectedApp.travel_minute
                              ? `${selectedApp.travel_hour}:${selectedApp.travel_minute}`
                              : 'N/A'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-600 font-medium">Travel Timezone:</span>
                          <span className="ml-2 font-semibold">{selectedApp.travel_timezone || 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                  </div>


                  {/* Representative Information (for minors) */}
                  {(selectedApp.representative_surname || selectedApp.representative_given_names) && (
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Representative Information</h3>
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="text-slate-600 font-medium">Representative Surname:</span>
                            <span className="ml-2 font-semibold">{selectedApp.representative_surname || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-slate-600 font-medium">Representative Given Names:</span>
                            <span className="ml-2 font-semibold">{selectedApp.representative_given_names || 'N/A'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Additional Personal Details */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Additional Personal Details</h3>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-slate-600 font-medium">Middle Name:</span>
                          <span className="ml-2 font-semibold">{selectedApp.middle_name || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-slate-600 font-medium">Marital Status:</span>
                          <span className="ml-2 font-semibold capitalize">{selectedApp.marital_status || 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Employment Information */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Employment Information</h3>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-slate-600 font-medium">Occupation:</span>
                          <span className="ml-2 font-semibold">{selectedApp.occupation || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-slate-600 font-medium">Job Title:</span>
                          <span className="ml-2 font-semibold">{selectedApp.job_title || 'N/A'}</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-slate-600 font-medium">Employer Name:</span>
                          <span className="ml-2 font-semibold">{selectedApp.employer_name || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-slate-600 font-medium">Employer Country:</span>
                          <span className="ml-2 font-semibold">{selectedApp.employer_country || 'N/A'}</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-slate-600 font-medium">Employer City:</span>
                          <span className="ml-2 font-semibold">{selectedApp.employer_city || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-slate-600 font-medium">Employment Since:</span>
                          <span className="ml-2 font-semibold">{selectedApp.employment_since_year || 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Background Questions */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Background Questions</h3>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-slate-600 font-medium">Refused Visa/Entry to Canada:</span>
                          <span className="ml-2 font-semibold">{selectedApp.bg_refused_visa || 'N/A'}</span>
                        </div>
                        {selectedApp.bg_refused_visa_details && (
                          <div>
                            <span className="text-slate-600 font-medium">Refused Visa Details:</span>
                            <span className="ml-2 font-semibold">{selectedApp.bg_refused_visa_details}</span>
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-slate-600 font-medium">Criminal Offence:</span>
                          <span className="ml-2 font-semibold">{selectedApp.bg_criminal_offence || 'N/A'}</span>
                        </div>
                        {selectedApp.bg_criminal_offence_details && (
                          <div>
                            <span className="text-slate-600 font-medium">Criminal Offence Details:</span>
                            <span className="ml-2 font-semibold">{selectedApp.bg_criminal_offence_details}</span>
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-slate-600 font-medium">Tuberculosis Contact:</span>
                          <span className="ml-2 font-semibold">{selectedApp.bg_tuberculosis || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-slate-600 font-medium">TB Health Worker:</span>
                          <span className="ml-2 font-semibold">{selectedApp.bg_tb_health_worker || 'N/A'}</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-slate-600 font-medium">TB Diagnosed:</span>
                          <span className="ml-2 font-semibold">{selectedApp.bg_tb_diagnosed || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-slate-600 font-medium">Medical Condition:</span>
                          <span className="ml-2 font-semibold">{selectedApp.bg_medical_condition || 'N/A'}</span>
                        </div>
                      </div>
                      {selectedApp.bg_additional_details && (
                        <div className="grid grid-cols-1 gap-4">
                          <div>
                            <span className="text-slate-600 font-medium">Additional Details:</span>
                            <span className="ml-2 font-semibold">{selectedApp.bg_additional_details}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Consent & Signature */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Consent & Signature</h3>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-slate-600 font-medium">Consent Agreed:</span>
                          <span className="ml-2 font-semibold">{selectedApp.consent_agreed ? 'Yes' : 'No'}</span>
                        </div>
                        <div>
                          <span className="text-slate-600 font-medium">Signature:</span>
                          <span className="ml-2 font-semibold">{selectedApp.signature || 'N/A'}</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-slate-600 font-medium">Declaration Agreed:</span>
                          <span className="ml-2 font-semibold">{selectedApp.declaration_agreed ? 'Yes' : 'No'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end items-center gap-2">
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
                      disabled={markingDelivered}
                      className={selectedApp.fulfillment_status === 'pending'
                        ? "bg-green-600 hover:bg-green-700"
                        : "bg-yellow-600 hover:bg-yellow-700"}
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
                    <Button onClick={() => { setSelectedApp(null);}} variant="outline">
                      Close
                    </Button>
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
