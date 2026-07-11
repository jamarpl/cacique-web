"use client";

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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { farmersApi } from "@/lib/api";
import type { Farmer } from "@/lib/api";

const EMPTY_FORM = { name: "", phone: "", email: "", parish: "", community: "", farmName: "" };

/**
 * UIRB-FE-A4. Cross-farmer list/registration — the one place farmer data is
 * legitimately shown across all farmers, since this IS the admin
 * farmer-management screen. `GET/POST /api/farmers` are both unscoped
 * (no farmerId query param exists or would make sense here).
 */
export default function AdminFarmersPage() {
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  function load() {
    setLoading(true);
    farmersApi
      .list()
      .then(setFarmers)
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    load();
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await farmersApi.create({
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        parish: form.parish.trim(),
        community: form.community.trim(),
        farmName: form.farmName.trim(),
      });
      toast.success("Farmer registered.");
      setForm(EMPTY_FORM);
      setOpen(false);
      load();
    } catch {
      // Error toast already surfaced by the API client.
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit =
    form.name.trim() !== "" &&
    form.phone.trim() !== "" &&
    form.email.trim() !== "" &&
    form.parish.trim() !== "" &&
    form.community.trim() !== "" &&
    form.farmName.trim() !== "";

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Farmers</CardTitle>
          <CardDescription>Every registered farmer, across every parish.</CardDescription>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button>Register farmer</Button>} />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Register farmer</DialogTitle>
              <DialogDescription>Adds a new farmer to the system.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="farmer-name">Name</Label>
                <Input id="farmer-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="farmer-phone">Phone</Label>
                <Input id="farmer-phone" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="farmer-email">Email</Label>
                <Input
                  id="farmer-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="farmer-parish">Parish</Label>
                <Input id="farmer-parish" value={form.parish} onChange={(e) => setForm((f) => ({ ...f, parish: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="farmer-community">Community</Label>
                <Input
                  id="farmer-community"
                  value={form.community}
                  onChange={(e) => setForm((f) => ({ ...f, community: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="farmer-farmname">Farm name</Label>
                <Input
                  id="farmer-farmname"
                  value={form.farmName}
                  onChange={(e) => setForm((f) => ({ ...f, farmName: e.target.value }))}
                />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={!canSubmit || submitting}>
                  {submitting ? "Registering…" : "Register farmer"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {loading && farmers.length === 0 ? (
          <div className="space-y-2 py-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : farmers.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">No farmers registered yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Farm</TableHead>
                <TableHead>Parish</TableHead>
                <TableHead>Community</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Registered</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {farmers.map((f) => (
                <TableRow key={f.id}>
                  <TableCell className="font-medium">{f.name}</TableCell>
                  <TableCell>{f.farmName}</TableCell>
                  <TableCell>{f.parish}</TableCell>
                  <TableCell>{f.community}</TableCell>
                  <TableCell>{f.phone}</TableCell>
                  <TableCell>{f.email}</TableCell>
                  <TableCell>{new Date(f.registrationDate).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
