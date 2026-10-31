import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const invoices = [
  { id: "INV-1042", customer: "Acme Corp", amount: "$1,240.00", status: "Paid", due: "2026-10-15" },
  { id: "INV-1043", customer: "Globex", amount: "$890.00", status: "Overdue", due: "2026-10-20" },
  { id: "INV-1044", customer: "Initech", amount: "$2,100.00", status: "Pending", due: "2026-11-02" },
  { id: "INV-1045", customer: "Umbrella", amount: "$450.00", status: "Paid", due: "2026-10-28" },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground p-6 md:p-10">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Finance Dashboard</h1>
          <p className="text-muted-foreground mt-1">Brightloop billing overview (demo data)</p>
        </div>
        <Button>Generate Invoice</Button>
      </header>

      <section className="grid gap-4 md:grid-cols-4 mb-8">
        {[
          { label: "Active Subscriptions", value: "128" },
          { label: "Revenue Received", value: "$48,200" },
          { label: "Outstanding", value: "$9,430" },
          { label: "Overdue Invoices", value: "7" },
        ].map((m) => (
          <Card key={m.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">{m.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{m.value}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <Tabs defaultValue="invoices">
        <TabsList>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
        </TabsList>
        <TabsContent value="invoices" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-medium">{inv.id}</TableCell>
                      <TableCell>{inv.customer}</TableCell>
                      <TableCell>{inv.amount}</TableCell>
                      <TableCell>{inv.due}</TableCell>
                      <TableCell>
                        <Badge variant={inv.status === "Overdue" ? "destructive" : inv.status === "Paid" ? "default" : "secondary"}>
                          {inv.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="subscriptions" className="mt-4">
          <Card>
            <CardContent className="p-6 text-muted-foreground">
              Subscription list (demo) — endpoints not ready.
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  );
}