"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cropsApi } from "@/lib/api";
import type { Crop } from "@/lib/api";

/**
 * UIRB-FE-A3. Read-only crop catalog — `GET /api/crops` has no write
 * counterpart exposed anywhere in the API, so no create/edit UI is built
 * here (per the requirements doc: "no CRUD unless requested later").
 */
export default function AdminCropsPage() {
  const [crops, setCrops] = useState<Crop[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    cropsApi
      .list(undefined, controller.signal)
      .then(setCrops)
      .catch(() => {})
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Crops</CardTitle>
        <CardDescription>Crop catalog (read-only).</CardDescription>
      </CardHeader>
      <CardContent>
        {loading && crops.length === 0 ? (
          <div className="space-y-2 py-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : crops.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">No crops in the catalog.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Typical shelf life</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {crops.map((crop) => (
                <TableRow key={crop.id}>
                  <TableCell className="font-medium">{crop.name}</TableCell>
                  <TableCell>{crop.category ?? "—"}</TableCell>
                  <TableCell>
                    {crop.typicalShelfLifeDays !== null ? `${crop.typicalShelfLifeDays} days` : "—"}
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
