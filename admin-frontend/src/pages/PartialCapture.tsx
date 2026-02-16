import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient, ApplicationLookupResponse } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Search, DollarSign, User, CreditCard, AlertTriangle, CheckCircle, ArrowLeft } from 'lucide-react';

const PartialCapture = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Search state
  const [searchType, setSearchType] = useState<'session_id' | 'email' | 'authorization_id'>('session_id');
  const [searchValue, setSearchValue] = useState('');
  const [searching, setSearching] = useState(false);

  // Application state
  const [application, setApplication] = useState<ApplicationLookupResponse | null>(null);
  const [captureAmount, setCaptureAmount] = useState('');

  // Capture state
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [captureSuccess, setCaptureSuccess] = useState(false);

  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (apiClient.isAdminAuthenticated()) {
      setIsAuthenticated(true);
    } else {
      navigate('/');
    }
    setIsLoading(false);
  }, [navigate]);

  const handleSearch = async () => {
    if (!searchValue.trim()) {
      toast({
        title: "Error",
        description: "Please enter a search value",
        variant: "destructive"
      });
      return;
    }

    setSearching(true);
    setApplication(null);
    setCaptureSuccess(false);

    try {
      const result = await apiClient.lookupApplicationForCapture(searchType, searchValue.trim());
      setApplication(result);
      setCaptureAmount(result.amount_paid.toFixed(2));
    } catch (error: any) {
      if (error.message.includes('Session expired')) {
        setIsAuthenticated(false);
        navigate('/');
      }
      toast({
        title: "Not found",
        description: error.message || "Application not found",
        variant: "destructive"
      });
    } finally {
      setSearching(false);
    }
  };

  const handleCaptureClick = () => {
    const amount = parseFloat(captureAmount);

    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter an amount greater than 0",
        variant: "destructive"
      });
      return;
    }

    if (application && amount > application.amount_paid) {
      toast({
        title: "Invalid amount",
        description: `Amount cannot exceed the authorized amount ($${application.amount_paid.toFixed(2)})`,
        variant: "destructive"
      });
      return;
    }

    setShowConfirmDialog(true);
  };

  const handleConfirmCapture = async () => {
    if (!application || !application.authorization_id) return;

    setCapturing(true);
    setShowConfirmDialog(false);

    try {
      await apiClient.partialCaptureAuthorization(
        application.id,
        application.authorization_id,
        captureAmount
      );

      setCaptureSuccess(true);
      toast({
        title: "Capture successful",
        description: `Successfully captured $${parseFloat(captureAmount).toFixed(2)} for order ${application.session_id}`,
      });

      // Refresh the application data
      const updated = await apiClient.lookupApplicationForCapture(searchType, searchValue.trim());
      setApplication(updated);

    } catch (error: any) {
      toast({
        title: "Capture failed",
        description: error.message || "Failed to capture payment",
        variant: "destructive"
      });
    } finally {
      setCapturing(false);
    }
  };

  const getAuthStatusBadge = (status: string | null) => {
    if (!status) return <Badge variant="secondary">Unknown</Badge>;

    switch (status) {
      case 'CREATED':
      case 'PENDING':
        return <Badge className="bg-yellow-500 hover:bg-yellow-600">{status}</Badge>;
      case 'CAPTURED':
        return <Badge className="bg-green-600 hover:bg-green-700">{status}</Badge>;
      case 'VOIDED':
        return <Badge className="bg-gray-500 hover:bg-gray-600">{status}</Badge>;
      case 'EXPIRED':
        return <Badge className="bg-red-500 hover:bg-red-600">{status}</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString();
  };

  const releasedAmount = application
    ? application.amount_paid - parseFloat(captureAmount || '0')
    : 0;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Admin Panel
          </Button>

          <h1 className="text-2xl font-bold text-gray-900">Partial Capture</h1>
          <p className="text-gray-600 mt-1">
            Capture a partial amount from a pre-authorized payment
          </p>
        </div>

        {/* Search Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Find Order</CardTitle>
            <CardDescription>
              Search by Session ID, Customer Email, or Authorization ID
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3">
              <Select
                value={searchType}
                onValueChange={(value: 'session_id' | 'email' | 'authorization_id') => setSearchType(value)}
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Search type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="session_id">Session ID</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="authorization_id">Auth ID</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex-1 flex gap-2">
                <Input
                  placeholder={
                    searchType === 'session_id' ? 'CDIC-XXXXXX' :
                    searchType === 'email' ? 'customer@example.com' :
                    'Authorization ID'
                  }
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Button onClick={handleSearch} disabled={searching}>
                  {searching ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Order Details Card */}
        {application && (
          <Card className="mb-6">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">Order: {application.session_id}</CardTitle>
                  <CardDescription>
                    Created {formatDate(application.created_at)}
                  </CardDescription>
                </div>
                {getAuthStatusBadge(application.authorization_status)}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Order Info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-gray-500">Customer</p>
                    <p className="font-medium">{application.customer_name || '-'}</p>
                    <p className="text-gray-600">{application.customer_email || '-'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-gray-500">Authorized Amount</p>
                    <p className="font-medium text-lg">{formatCurrency(application.amount_paid)}</p>
                    <p className="text-gray-600">{application.traveler_count} traveler(s)</p>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Authorization ID</p>
                    <p className="font-mono text-xs break-all">{application.authorization_id || '-'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Payment Status</p>
                    <p className="font-medium">{application.payment_status || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Capture Form or Status */}
              {application.can_capture ? (
                <div className="border-t pt-4 space-y-4">
                  <div>
                    <Label htmlFor="captureAmount">Capture Amount (USD)</Label>
                    <div className="flex gap-2 mt-1">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                        <Input
                          id="captureAmount"
                          type="number"
                          step="0.01"
                          min="0.01"
                          max={application.amount_paid}
                          value={captureAmount}
                          onChange={(e) => setCaptureAmount(e.target.value)}
                          className="pl-7"
                          placeholder="0.00"
                        />
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => setCaptureAmount(application.amount_paid.toFixed(2))}
                      >
                        Full Amount
                      </Button>
                    </div>
                    {parseFloat(captureAmount) > 0 && parseFloat(captureAmount) < application.amount_paid && (
                      <p className="text-sm text-amber-600 mt-2 flex items-center gap-1">
                        <AlertTriangle className="h-4 w-4" />
                        {formatCurrency(releasedAmount)} will be released back to the customer
                      </p>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setApplication(null);
                        setSearchValue('');
                        setCaptureAmount('');
                      }}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCaptureClick}
                      disabled={capturing || !captureAmount}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      {capturing ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <CreditCard className="h-4 w-4 mr-2" />
                      )}
                      Capture {captureAmount ? formatCurrency(parseFloat(captureAmount)) : ''}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="border-t pt-4">
                  {application.authorization_status === 'CAPTURED' ? (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-green-800">Already Captured</p>
                        <p className="text-sm text-green-700">
                          This authorization was captured on {formatDate(application.captured_at)}
                        </p>
                        {application.capture_id && (
                          <p className="text-xs text-green-600 mt-1 font-mono">
                            Capture ID: {application.capture_id}
                          </p>
                        )}
                      </div>
                    </div>
                  ) : application.authorization_status === 'VOIDED' ? (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-gray-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-gray-800">Authorization Voided</p>
                        <p className="text-sm text-gray-600">
                          This authorization has been voided and cannot be captured.
                        </p>
                      </div>
                    </div>
                  ) : application.authorization_status === 'EXPIRED' ? (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-red-800">Authorization Expired</p>
                        <p className="text-sm text-red-600">
                          This authorization has expired and cannot be captured.
                        </p>
                      </div>
                    </div>
                  ) : !application.authorization_id ? (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-yellow-800">No Authorization</p>
                        <p className="text-sm text-yellow-600">
                          This order does not have a valid authorization to capture.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-gray-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-gray-800">Cannot Capture</p>
                        <p className="text-sm text-gray-600">
                          This authorization cannot be captured. Status: {application.authorization_status || 'Unknown'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Success Message */}
        {captureSuccess && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-6 w-6 text-green-600" />
                <div>
                  <p className="font-medium text-green-800">Capture Completed Successfully</p>
                  <p className="text-sm text-green-600">
                    The payment has been captured and the order has been updated.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Partial Capture</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  You are about to capture <strong>{formatCurrency(parseFloat(captureAmount || '0'))}</strong> from order <strong>{application?.session_id}</strong>.
                </p>
                {application && (
                  <div className="bg-gray-50 rounded-lg p-3 space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Original authorized amount:</span>
                      <span className="font-medium">{formatCurrency(application.amount_paid)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Capture amount:</span>
                      <span className="font-medium text-green-600">{formatCurrency(parseFloat(captureAmount || '0'))}</span>
                    </div>
                    {releasedAmount > 0 && (
                      <div className="flex justify-between border-t pt-1 mt-1">
                        <span>Released to customer:</span>
                        <span className="font-medium text-amber-600">{formatCurrency(releasedAmount)}</span>
                      </div>
                    )}
                  </div>
                )}
                <p className="text-red-600 font-medium">
                  This action cannot be undone.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmCapture}
              className="bg-green-600 hover:bg-green-700"
            >
              Confirm Capture
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PartialCapture;
