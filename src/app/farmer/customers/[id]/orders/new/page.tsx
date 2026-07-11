"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { PlusIcon, TrashIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { buyersApi, cropsApi, ordersApi } from "@/lib/api";
import type { Buyer, Crop, OrderItemRequest } from "@/lib/api";
import { useActingIdentity } from "@/lib/identity/acting-identity-context";

interface DraftLine extends OrderItemRequest {
  key: string;
}

function newLine(): DraftLine {
  return { key: crypto.randomUUID(), cropId: "", quantity: 0, grade: "" };
}

/**
 * UIRB-FE-F6. Farmer-scoping: same buyer-ownership guard as the customer
 * detail page — the buyer is fetched and checked against the acting
 * farmer's id before the order form is shown, since `POST /api/orders`
 * itself only takes `buyerId` (no `farmerId`) and would otherwise let this
 * screen silently create an order for another farmer's customer.
 */
export default function CreateOrderPage() {
  const params = useParams<{ id: string }>();
  const buyerId = params.id;
  const router = useRouter();
  const { farmerId } = useActingIdentity();

  const [buyer, setBuyer] = useState<Buyer | null>(null);
  const [buyerLoading, setBuyerLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [crops, setCrops] = useState<Crop[]>([]);
  const [lines, setLines] = useState<DraftLine[]>([newLine()]);
  const [deliveryDate, setDeliveryDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!farmerId) return;
    const controller = new AbortController();
    setBuyerLoading(true);
    buyersApi
      .getById(buyerId, controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return;
        if (data.farmerId !== farmerId) {
          setNotFound(true);
        } else {
          setBuyer(data);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setNotFound(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setBuyerLoading(false);
      });
    return () => controller.abort();
  }, [buyerId, farmerId]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    const controller = new AbortController();
    cropsApi
      .list(undefined, controller.signal)
      .then(setCrops)
      .catch(() => {});
    return () => controller.abort();
  }, []);

  function updateLine(key: string, patch: Partial<DraftLine>) {
    setLines((prev) => prev.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  }

  function addLine() {
    setLines((prev) => [...prev, newLine()]);
  }

  function removeLine(key: string) {
    setLines((prev) => (prev.length > 1 ? prev.filter((line) => line.key !== key) : prev));
  }

  const canSubmit =
    lines.length > 0 && lines.every((line) => line.cropId !== "" && line.quantity > 0 && line.grade.trim() !== "");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit || !buyer) return;
    setSubmitting(true);
    try {
      await ordersApi.create({
        buyerId: buyer.id,
        deliveryDate: deliveryDate ? new Date(deliveryDate).toISOString() : null,
        items: lines.map(({ cropId, quantity, grade }) => ({ cropId, quantity, grade: grade.trim() })),
      });
      toast.success("Order created.");
      router.push(`/farmer/customers/${buyer.id}`);
    } catch {
      // Error toast already surfaced by the API client.
    } finally {
      setSubmitting(false);
    }
  }

  if (buyerLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (notFound || !buyer) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Customer not found</CardTitle>
          <CardDescription>
            This customer doesn&apos;t exist, or doesn&apos;t belong to the currently acting farmer.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/farmer/customers" className="text-sm text-primary underline-offset-4 hover:underline">
            ← Back to customers
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>New order for {buyer.businessName}</CardTitle>
        <CardDescription>Add one or more line items, then submit.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            {lines.map((line, index) => (
              <div key={line.key} className="grid grid-cols-1 gap-2 sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-end">
                <div className="space-y-2">
                  <Label htmlFor={`order-crop-${line.key}`}>{index === 0 ? "Crop" : undefined}</Label>
                  <Select value={line.cropId} onValueChange={(v) => updateLine(line.key, { cropId: v ?? "" })}>
                    <SelectTrigger id={`order-crop-${line.key}`} className="w-full">
                      <SelectValue placeholder="Choose a crop" />
                    </SelectTrigger>
                    <SelectContent>
                      {crops.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`order-qty-${line.key}`}>{index === 0 ? "Quantity (kg)" : undefined}</Label>
                  <Input
                    id={`order-qty-${line.key}`}
                    type="number"
                    min="0"
                    step="0.01"
                    value={line.quantity || ""}
                    onChange={(e) => updateLine(line.key, { quantity: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`order-grade-${line.key}`}>{index === 0 ? "Grade" : undefined}</Label>
                  <Input
                    id={`order-grade-${line.key}`}
                    value={line.grade}
                    onChange={(e) => updateLine(line.key, { grade: e.target.value })}
                    placeholder="e.g. A"
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeLine(line.key)}
                  disabled={lines.length === 1}
                  aria-label="Remove line item"
                >
                  <TrashIcon className="size-4" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addLine}>
              <PlusIcon className="size-4" /> Add line item
            </Button>
          </div>

          <div className="max-w-xs space-y-2">
            <Label htmlFor="order-delivery-date">Requested delivery date (optional)</Label>
            <Input
              id="order-delivery-date"
              type="date"
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
            />
          </div>

          <Button type="submit" disabled={!canSubmit || submitting}>
            {submitting ? "Creating…" : "Create order"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
