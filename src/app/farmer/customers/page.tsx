"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ErrorState } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useFarmerScopedResource } from "@/lib/api/hooks";
import { addressesApi, buyersApi, warehousesApi } from "@/lib/api";
import { useActingIdentity } from "@/lib/identity/acting-identity-context";

/**
 * UIRB-FE-F4. Farmer-scoping: `GET /api/buyers?farmerId=` is a required
 * query param server-side (400 without it) — `useFarmerScopedResource`
 * never calls the fetcher without a resolved acting farmer id, so this list
 * can never render another farmer's buyers. Create also always sends the
 * acting farmer's id.
 */
export default function CustomersPage() {
  const { farmerId } = useActingIdentity();
  const buyers = useFarmerScopedResource((fid, signal) => buyersApi.list({ farmerId: fid }, signal));

  const [open, setOpen] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [parish, setParish] = useState("");
  const [community, setCommunity] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [parishes, setParishes] = useState<string[]>([]);
  const [generatingAddress, setGeneratingAddress] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    warehousesApi
      .list({ status: "Active" }, controller.signal)
      .then((data) => setParishes(Array.from(new Set(data.map((w) => w.parish))).sort()))
      .catch(() => {});
    return () => controller.abort();
  }, []);

  async function handleGenerateAddress() {
    if (!parish) return;
    setGeneratingAddress(true);
    try {
      const results = await addressesApi.random(parish, 1);
      if (results.length > 0) {
        setAddress(results[0].address);
      } else {
        toast.error("Couldn't generate an address — try again.");
      }
    } catch {
      // Error toast already surfaced by the API client (e.g. Mapbox not configured).
    } finally {
      setGeneratingAddress(false);
    }
  }

  function resetForm() {
    setBusinessName("");
    setContactName("");
    setEmail("");
    setPhone("");
    setAddress("");
    setParish("");
    setCommunity("");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!farmerId) return;
    setSubmitting(true);
    try {
      await buyersApi.create({
        farmerId,
        businessName: businessName.trim(),
        contactName: contactName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        address: address.trim(),
        parish: parish.trim(),
        community: community.trim() || null,
      });
      toast.success("Customer added.");
      resetForm();
      setOpen(false);
      buyers.refetch();
    } catch {
      // Error toast already surfaced by the API client.
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit =
    businessName.trim() !== "" && contactName.trim() !== "" && email.trim() !== "" && parish.trim() !== "";
  const customers = buyers.data ?? [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Customers</CardTitle>
            <CardDescription>Buyers you sell produce to.</CardDescription>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={<Button>Add customer</Button>} />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add customer</DialogTitle>
                <DialogDescription>Registers a new buyer scoped to your farm.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="cust-business">Business name</Label>
                  <Input id="cust-business" value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cust-contact">Contact name</Label>
                  <Input id="cust-contact" value={contactName} onChange={(e) => setContactName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cust-email">Email</Label>
                  <Input id="cust-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cust-phone">Phone</Label>
                  <Input id="cust-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cust-parish">Parish</Label>
                  <Select value={parish} onValueChange={(v) => setParish(v ?? "")}>
                    <SelectTrigger id="cust-parish" className="w-full">
                      <SelectValue placeholder="Choose a parish" />
                    </SelectTrigger>
                    <SelectContent>
                      {parishes.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="cust-address">Address</Label>
                    <button
                      type="button"
                      className="text-xs text-primary underline-offset-4 hover:underline disabled:pointer-events-none disabled:opacity-50"
                      disabled={!parish || generatingAddress}
                      onClick={handleGenerateAddress}
                    >
                      {generatingAddress ? "Generating…" : "Generate random address"}
                    </button>
                  </div>
                  <Input id="cust-address" value={address} onChange={(e) => setAddress(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cust-community">Community (optional)</Label>
                  <Input id="cust-community" value={community} onChange={(e) => setCommunity(e.target.value)} />
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={!canSubmit || submitting}>
                    {submitting ? "Adding…" : "Add customer"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {buyers.loading && customers.length === 0 ? (
            <div className="space-y-2 py-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : buyers.error && customers.length === 0 ? (
            <ErrorState onRetry={buyers.refetch} />
          ) : customers.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">No customers yet — add your first one above.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Business</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Parish</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((buyer) => (
                  <TableRow key={buyer.id}>
                    <TableCell className="font-medium">{buyer.businessName}</TableCell>
                    <TableCell>{buyer.contactName}</TableCell>
                    <TableCell>{buyer.email}</TableCell>
                    <TableCell>{buyer.phone}</TableCell>
                    <TableCell>{buyer.parish || "—"}</TableCell>
                    <TableCell>
                      <Link href={`/farmer/customers/${buyer.id}`} className="text-primary underline-offset-4 hover:underline">
                        View →
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
