"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useFarmerScopedResource } from "@/lib/api/hooks";
import { deliveriesApi } from "@/lib/api";

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function statusVariant(status: string): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "Delivered":
      return "default";
    case "InTransit":
      return "secondary";
    case "Cancelled":
      return "destructive";
    default:
      return "outline";
  }
}

/** UIRB-FE-F8. Farmer-scoping: `GET /api/deliveries?farmerId=` via `useFarmerScopedResource`. */
export default function DeliveriesListPage() {
  const deliveries = useFarmerScopedResource((farmerId, signal) => deliveriesApi.list({ farmerId }, signal));
  const rows = deliveries.data ?? [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Deliveries</CardTitle>
          <CardDescription>All deliveries connected to your crates or orders.</CardDescription>
        </div>
        <Button nativeButton={false} render={<Link href="/farmer/deliveries/new" />}>Register delivery</Button>
      </CardHeader>
      <CardContent>
        {deliveries.loading && rows.length === 0 ? (
          <div className="space-y-2 py-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : rows.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">No deliveries yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Warehouse</TableHead>
                <TableHead>Driver</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Crates</TableHead>
                <TableHead>Departure</TableHead>
                <TableHead>Arrival</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((d) => (
                <TableRow key={d.id}>
                  <TableCell>{d.warehouseName}</TableCell>
                  <TableCell>{d.driverName}</TableCell>
                  <TableCell>{d.vehiclePlateNumber}</TableCell>
                  <TableCell>{d.crateCount}</TableCell>
                  <TableCell>{formatDateTime(d.departureTime)}</TableCell>
                  <TableCell>{formatDateTime(d.arrivalTime)}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(d.status)}>{d.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
