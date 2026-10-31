"use client";

import { useEffect, useState, useTransition } from "react";
import { apiFetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type DashboardData = {
  metrics: {
    activeSubscriptions: number;
    revenueReceived: string;
    outstandingAmount: string;
    overdueInvoices: number;
  };
  recentInvoices: any[];
};

type Invoice = {
  id: string;
  number: string;
  status: string;
  total: string;
  subtotal: string;
  taxTotal: string;
  discountAmount?: string;
  dueDate: string;
  customer?: { name?: string; email?: string } | null;
  items?: any[];
  payments?: any[];
};

type Subscription = {
  id: string;
  number: string;
  status: string;
  isPaused: boolean;
  startDate: string;
  expiryDate: string;
  currency: string;
  total: string;
  customer?: { name?: string; email?: string } | null;
  plan?: { name?: string } | null;
};

type Product = { id: string; name: string; type: string; salesPrice: string };
type Discount = { id: string; name: string; type: string; value: string; isActive: boolean; startsAt: string; endsAt: string };

function money(v?: string | number) {
  if (v == null) return "—";
  const num = typeof v === "string" ? parseFloat(v) : v;
  if (isNaN(num)) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(num);
}

export default function Home() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [discounts, setDiscounts] = useState<Discount[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Action modals/states
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("BANK_TRANSFER");
  const [paymentNote, setPaymentNote] = useState("");

  const [selectedDiscountId, setSelectedDiscountId] = useState("");

  // Generate invoice form state
  const [genSubId, setGenSubId] = useState("");
  const [genPeriodStart, setGenPeriodStart] = useState(new Date().toISOString().slice(0, 10));
  const [genPeriodEnd, setGenPeriodEnd] = useState(new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10));
  const [genDueDate, setGenDueDate] = useState(new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10));
  const [genTaxRate, setGenTaxRate] = useState("10");

  const loadAll = async () => {
    try {
      setLoading(true);
      setError(null);
      const [dashRes, invRes, subRes, prodRes, discRes] = await Promise.allSettled([
        apiFetch<DashboardData>("/api/finance/dashboard"),
        apiFetch<{ data?: Invoice[] } | Invoice[]>("/api/invoices?limit=50"),
        apiFetch<{ data?: Subscription[] } | Subscription[]>("/api/subscriptions?limit=50"),
        apiFetch<{ data?: Product[] } | Product[]>("/api/products?limit=50"),
        apiFetch<{ data?: Discount[] } | Discount[]>("/api/discounts?limit=50"),
      ]);

      if (dashRes.status === "fulfilled") setDashboard(dashRes.value);
      if (invRes.status === "fulfilled") {
        const d = invRes.value as any;
        setInvoices(Array.isArray(d) ? d : d?.data ?? []);
      }
      if (subRes.status === "fulfilled") {
        const d = subRes.value as any;
        setSubscriptions(Array.isArray(d) ? d : d?.data ?? []);
      }
      if (prodRes.status === "fulfilled") {
        const d = prodRes.value as any;
        setProducts(Array.isArray(d) ? d : d?.data ?? []);
      }
      if (discRes.status === "fulfilled") {
        const d = discRes.value as any;
        setDiscounts(Array.isArray(d) ? d : d?.data ?? []);
      }
    } catch (e: any) {
      setError(e?.message ?? "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleGenerateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!genSubId) {
      setError("Please enter a subscription ID");
      return;
    }
    setError(null);
    setSuccessMsg(null);
    startTransition(async () => {
      try {
        await apiFetch("/api/invoices/generate", {
          method: "POST",
          body: JSON.stringify({
            subscriptionId: genSubId,
            billingPeriodStart: genPeriodStart,
            billingPeriodEnd: genPeriodEnd,
            dueDate: genDueDate,
            taxRate: parseFloat(genTaxRate) || 0,
          }),
        });
        setSuccessMsg("Invoice generated successfully!");
        setGenSubId("");
        loadAll();
      } catch (err: any) {
        setError(err?.message ?? "Failed to generate invoice");
      }
    });
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice || !paymentAmount) return;
    setError(null);
    setSuccessMsg(null);
    startTransition(async () => {
      try {
        await apiFetch(`/api/invoices/${selectedInvoice.id}/payments`, {
          method: "POST",
          body: JSON.stringify({
            amount: parseFloat(paymentAmount),
            method: paymentMethod,
            note: paymentNote || undefined,
          }),
        });
        setSuccessMsg("Payment recorded successfully!");
        setPaymentAmount("");
        setPaymentNote("");
        // Reload details of selected invoice
        const updated = await apiFetch<{ invoice: Invoice }>(`/api/invoices/${selectedInvoice.id}`);
        setSelectedInvoice(updated.invoice);
        loadAll();
      } catch (err: any) {
        setError(err?.message ?? "Failed to record payment");
      }
    });
  };

  const handleApplyDiscount = async () => {
    if (!selectedInvoice || !selectedDiscountId) return;
    setError(null);
    setSuccessMsg(null);
    startTransition(async () => {
      try {
        await apiFetch(`/api/invoices/${selectedInvoice.id}/apply-discount`, {
          method: "POST",
          body: JSON.stringify({ discountId: selectedDiscountId }),
        });
        setSuccessMsg("Discount applied successfully!");
        const updated = await apiFetch<{ invoice: Invoice }>(`/api/invoices/${selectedInvoice.id}`);
        setSelectedInvoice(updated.invoice);
        loadAll();
      } catch (err: any) {
        setError(err?.message ?? "Failed to apply discount");
      }
    });
  };

  return (
    <main className="min-h-screen bg-background text-foreground p-6 md:p-10">
      <header className="mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Brightloop Finance & Billing</h1>
          <p className="text-muted-foreground mt-1">
            Complete Subscription, Invoice, Tax, Discount & Payment Management
          </p>
        </div>
        <Button onClick={loadAll} variant="outline" disabled={loading}>
          {loading ? "Refreshing…" : "Refresh Data"}
        </Button>
      </header>

      {error && (
        <div className="mb-6 rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive flex justify-between items-center">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="font-bold">×</button>
        </div>
      )}

      {successMsg && (
        <div className="mb-6 rounded-md border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-emerald-400 flex justify-between items-center">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="font-bold">×</button>
        </div>
      )}

      {/* Summary Metric Cards (Phase 7) */}
      <section className="grid gap-4 md:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Active Subscriptions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{dashboard?.metrics.activeSubscriptions ?? subscriptions.filter(s => s.status === "ACTIVE").length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Revenue Received</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-emerald-500">{money(dashboard?.metrics.revenueReceived)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Outstanding Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-amber-500">{money(dashboard?.metrics.outstandingAmount)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Overdue Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-destructive">{dashboard?.metrics.overdueInvoices ?? 0}</p>
          </CardContent>
        </Card>
      </section>

      {/* Generate Invoice Quick Action Card */}
      <Card className="mb-8 border-primary/20 bg-card/50">
        <CardHeader>
          <CardTitle className="text-lg">Generate Invoice from Subscription (Phase 4)</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleGenerateInvoice} className="grid gap-4 md:grid-cols-5 items-end">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Subscription ID</label>
              <Input
                placeholder="Paste active subscription ID"
                value={genSubId}
                onChange={(e) => setGenSubId(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Period Start</label>
              <Input
                type="date"
                value={genPeriodStart}
                onChange={(e) => setGenPeriodStart(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Period End</label>
              <Input
                type="date"
                value={genPeriodEnd}
                onChange={(e) => setGenPeriodEnd(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Tax Rate (%)</label>
              <Input
                type="number"
                step="0.01"
                value={genTaxRate}
                onChange={(e) => setGenTaxRate(e.target.value)}
                required
              />
            </div>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Generating…" : "Generate Invoice"}
            </Button>
          </form>
          {subscriptions.length > 0 && (
            <div className="mt-3 text-xs text-muted-foreground">
              Tip: Copy an active subscription ID from the Subscriptions tab below:{" "}
              <span className="font-mono text-foreground font-semibold">{subscriptions[0]?.id}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Tabs */}
      <Tabs defaultValue="invoices">
        <TabsList className="mb-4">
          <TabsTrigger value="invoices">Invoices ({invoices.length})</TabsTrigger>
          <TabsTrigger value="subscriptions">Subscriptions ({subscriptions.length})</TabsTrigger>
          <TabsTrigger value="products">Products ({products.length})</TabsTrigger>
          <TabsTrigger value="discounts">Discounts ({discounts.length})</TabsTrigger>
        </TabsList>

        {/* Invoices Tab */}
        <TabsContent value="invoices">
          <div className="grid gap-6 md:grid-cols-3">
            <div className="md:col-span-2">
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice #</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoices.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                            {loading ? "Loading invoices…" : "No invoices found. Generate one above!"}
                          </TableCell>
                        </TableRow>
                      )}
                      {invoices.map((inv) => (
                        <TableRow key={inv.id} className={selectedInvoice?.id === inv.id ? "bg-muted/50" : ""}>
                          <TableCell className="font-medium font-mono">{inv.number}</TableCell>
                          <TableCell>{inv.customer?.name ?? inv.customer?.email ?? "—"}</TableCell>
                          <TableCell>{money(inv.total)}</TableCell>
                          <TableCell>{inv.dueDate ? inv.dueDate.slice(0, 10) : "—"}</TableCell>
                          <TableCell>
                            <Badge variant={inv.status === "PAID" ? "default" : inv.status === "CANCELLED" ? "destructive" : "secondary"}>
                              {inv.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={async () => {
                                try {
                                  const res = await apiFetch<{ invoice: Invoice }>(`/api/invoices/${inv.id}`);
                                  setSelectedInvoice(res.invoice);
                                } catch (e: any) {
                                  setError(e?.message ?? "Failed to load invoice details");
                                }
                              }}
                            >
                              View / Pay
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>

            {/* Invoice Details & Payment Sidebar */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Invoice Details & Payments</CardTitle>
                </CardHeader>
                <CardContent>
                  {!selectedInvoice ? (
                    <p className="text-sm text-muted-foreground py-6 text-center">
                      Select an invoice from the table to view items, apply discounts, and record payments.
                    </p>
                  ) : (
                    <div className="space-y-4 text-sm">
                      <div className="flex justify-between border-b pb-2">
                        <span className="font-mono font-bold">{selectedInvoice.number}</span>
                        <Badge>{selectedInvoice.status}</Badge>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Customer</p>
                        <p className="font-medium">{selectedInvoice.customer?.name ?? selectedInvoice.customer?.email ?? "—"}</p>
                      </div>
                      <div className="grid grid-cols-3 gap-2 bg-muted/30 p-3 rounded text-xs">
                        <div>
                          <span className="text-muted-foreground block">Subtotal</span>
                          <span className="font-medium">{money(selectedInvoice.subtotal)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">Tax</span>
                          <span className="font-medium">{money(selectedInvoice.taxTotal)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">Total</span>
                          <span className="font-bold">{money(selectedInvoice.total)}</span>
                        </div>
                      </div>

                      {selectedInvoice.discountAmount && Number(selectedInvoice.discountAmount) > 0 && (
                        <div className="text-xs text-emerald-400">
                          Discount Applied: -{money(selectedInvoice.discountAmount)}
                        </div>
                      )}

                      {/* Items */}
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-1">Line Items</p>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {selectedInvoice.items?.map((item: any, idx: number) => (
                            <div key={idx} className="text-xs flex justify-between border-b pb-1">
                              <span>{item.descriptionSnapshot || "Item"} (x{item.quantity})</span>
                              <span>{money(item.lineTotal)}</span>
                            5</div>
                          ))}
                        </div>
                      </div>

                      {/* Apply Discount Section */}
                      {selectedInvoice.status !== "PAID" && discounts.length > 0 && (
                        <div className="border-t pt-3 space-y-2">
                          <p className="text-xs font-semibold">Apply Discount (Phase 5)</p>
                          <div className="flex gap-2">
                            <select
                              className="w-full text-xs bg-background border rounded px-2 py-1"
                              value={selectedDiscountId}
                              onChange={(e) => setSelectedDiscountId(e.target.value)}
                            >
                              <option value="">Select discount rule…</option>
                              {discounts.map((d) => (
                                <option key={d.id} value={d.id}>
                                  {d.name} ({d.type === "PERCENTAGE" ? `${d.value}%` : `$${d.value}`})
                                </option>
                              ))}
                            </select>
                            <Button size="sm" onClick={handleApplyDiscount} disabled={!selectedDiscountId || isPending}>
                              Apply
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Record Payment Section */}
                      {selectedInvoice.status !== "PAID" && (
                        <form onSubmit={handleRecordPayment} className="border-t pt-3 space-y-3">
                          <p className="text-xs font-semibold">Record Payment (Phase 6)</p>
                          <div>
                            <label className="text-xs text-muted-foreground block mb-1">Amount ($)</label>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              value={paymentAmount}
                              onChange={(e) => setPaymentAmount(e.target.value)}
                              required
                            />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground block mb-1">Method</label>
                            <select
                              className="w-full text-xs bg-background border rounded px-2 py-1"
                              value={paymentMethod}
                              onChange={(e) => setPaymentMethod(e.target.value)}
                            >
                              <option value="BANK_TRANSFER">Bank Transfer</option>
                              <option value="CARD">Card</option>
                              <option value="CASH">Cash</option>
                              <option value="OTHER">Other</option>
                            </select>
                          </div>
                          <Button type="submit" size="sm" className="w-full" disabled={isPending}>
                            {isPending ? "Recording…" : "Record Payment"}
                          </Button>
                        </form>
                      )}

                      {/* Payment History */}
                      {selectedInvoice.payments && selectedInvoice.payments.length > 0 && (
                        <div className="border-t pt-3 space-y-2">
                          <p className="text-xs font-semibold">Payment History</p>
                          {selectedInvoice.payments.map((p: any) => (
                            <div key={p.id} className="text-xs flex justify-between bg-muted/20 p-2 rounded">
                              <div>
                                <span className="font-semibold">{p.method}</span>
                                <span className="text-muted-foreground ml-2">{p.paidAt?.slice(0, 10)}</span>
                              </div>
                              <span className="font-bold text-emerald-500">+{money(p.amount)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Subscriptions Tab */}
        <TabsContent value="subscriptions">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subscription #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Dates</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subscriptions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        {loading ? "Loading subscriptions…" : "No subscriptions found."}
                      </TableCell>
                    </TableRow>
                  )}
                  {subscriptions.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium font-mono">{s.number}</TableCell>
                      <TableCell>{s.customer?.name ?? s.customer?.email ?? "—"}</TableCell>
                      <TableCell>{s.plan?.name ?? "—"}</TableCell>
                      <TableCell>{money(s.total)}</TableCell>
                      <TableCell>
                        <Badge variant={s.status === "ACTIVE" ? "default" : "secondary"}>
                          {s.isPaused ? "PAUSED" : s.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {s.startDate?.slice(0, 10)} → {s.expiryDate?.slice(0, 10)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Products Tab */}
        <TabsContent value="products">
          <Card>
            <CardContent className="p-6">
              {products.length === 0 ? (
                <p className="text-muted-foreground text-center py-6">{loading ? "Loading products…" : "No products found."}</p>
              ) : (
                <div className="grid gap-4 md:grid-cols-3">
                  {products.map((p) => (
                    <div key={p.id} className="border rounded-lg p-4 bg-card/50 space-y-2">
                      <div className="flex justify-between items-start">
                        <span className="font-semibold">{p.name}</span>
                        <Badge variant="outline">{p.type}</Badge>
                      </div>
                      <p className="text-lg font-bold text-primary">{money(p.salesPrice)}</p>
                      <p className="text-xs font-mono text-muted-foreground truncate">ID: {p.id}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Discounts Tab */}
        <TabsContent value="discounts">
          <Card>
            <CardContent className="p-6">
              {discounts.length === 0 ? (
                <p className="text-muted-foreground text-center py-6">{loading ? "Loading discounts…" : "No discount rules configured."}</p>
              ) : (
                <div className="grid gap-4 md:grid-cols-3">
                  {discounts.map((d) => (
                    <div key={d.id} className="border rounded-lg p-4 bg-card/50 space-y-2">
                      <div className="flex justify-between items-start">
                        <span className="font-semibold">{d.name}</span>
                        <Badge variant={d.isActive ? "default" : "secondary"}>{d.isActive ? "Active" : "Inactive"}</Badge>
                      </div>
                      <p className="text-xl font-bold text-emerald-400">
                        {d.type === "PERCENTAGE" ? `${d.value}% OFF` : `$${d.value} OFF`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Valid: {d.startsAt?.slice(0, 10)} → {d.endsAt?.slice(0, 10)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  );
}
