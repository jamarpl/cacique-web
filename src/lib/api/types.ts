/**
 * TypeScript mirrors of Cacique.Api's DTOs (Cacique/Cacique.Api/Dtos/**),
 * confirmed against the live controller/DTO source (not guessed) as of the
 * UIRB-FE-2 pass. All JSON field names are camelCase — ASP.NET Core's
 * default MVC JsonSerializerOptions (no PropertyNamingPolicy override in
 * Program.cs) applies the standard camelCase policy to every controller
 * response.
 *
 * A few backend-side naming quirks are preserved here deliberately (flagged
 * inline) rather than "fixed" on the frontend, since fixing them would mean
 * silently diverging from the actual wire contract.
 */

// ---------------------------------------------------------------------------
// Enums (string values on the wire — Cacique.Domain.Enums.*)
// ---------------------------------------------------------------------------

export type CrateStatus =
  | "Received"
  | "Stored"
  | "Reserved"
  | "Packed"
  | "InTransit"
  | "Delivered"
  | "Rejected"
  | "Disposed";

export type DeliveryStatus = "Scheduled" | "InTransit" | "Delivered" | "Cancelled";

export type OrderStatus = "Pending" | "Confirmed" | "Fulfilled" | "Cancelled";

export type WarehouseStatus = "Active" | "Inactive";

export type TrackingEventType =
  | "Intake"
  | "QRScan"
  | "WarehouseTransfer"
  | "Shipment"
  | "Delivery"
  | "Inspection"
  | "Allocation"
  | "Transfer";

// ---------------------------------------------------------------------------
// Farmers
// ---------------------------------------------------------------------------

export interface Farmer {
  id: string;
  name: string;
  phone: string;
  email: string;
  parish: string;
  community: string;
  farmName: string;
  registrationDate: string; // ISO datetime
}

export interface CreateFarmerRequest {
  name: string;
  phone: string;
  email: string;
  parish: string;
  community: string;
  farmName: string;
}

// ---------------------------------------------------------------------------
// Warehouses
// ---------------------------------------------------------------------------

export interface Warehouse {
  id: string;
  name: string;
  parish: string;
  address: string;
  capacity: number;
  status: WarehouseStatus;
  latitude: number | null;
  longitude: number | null;
}

export interface CreateWarehouseRequest {
  name: string;
  parish: string;
  address: string;
  capacity: number;
}

export type UpdateWarehouseRequest = CreateWarehouseRequest;

export interface UpdateWarehouseStatusRequest {
  status: WarehouseStatus;
}

export interface WarehouseCrop {
  id: string;
  name: string;
  category: string | null;
  typicalShelfLifeDays: number | null;
}

export interface UpdateWarehouseCropsRequest {
  cropIds: string[];
}

export interface ListWarehousesParams {
  status?: WarehouseStatus;
}

// ---------------------------------------------------------------------------
// Crops
// ---------------------------------------------------------------------------

export interface Crop {
  id: string;
  name: string;
  category: string | null;
  typicalShelfLifeDays: number | null;
}

export interface ListCropsParams {
  warehouseId?: string;
}

// ---------------------------------------------------------------------------
// Intake
// ---------------------------------------------------------------------------

export interface CreateIntakeRequest {
  farmerId: string;
  warehouseId: string;
  cropId: string;
  grade: string;
  totalWeight: number;
  harvestDate: string; // ISO datetime
  crateCount: number;
}

/**
 * NOTE (backend naming quirk, confirmed against IntakeDtos.cs): unlike
 * InventoryCrate.currentWarehouse (a warehouse *name* string, see below),
 * IntakeCrateResponse.CurrentWarehouse is actually the warehouse *id* (a
 * Guid). Both serialize to a JSON field literally named "currentWarehouse".
 * Flagged rather than silently normalized, since it's a real backend
 * inconsistency across two DTOs, not a frontend bug.
 */
export interface IntakeCrate {
  id: string;
  qrCode: string;
  qrImageBase64: string;
  cropId: string;
  cropName: string;
  weight: number;
  grade: string;
  currentWarehouse: string; // warehouse ID here, not a name — see note above
  currentStatus: CrateStatus;
  harvestDate: string;
  intakeDate: string;
  expirationDate: string | null;
}

export interface IntakeResponse {
  batchId: string;
  farmerId: string;
  warehouseId: string;
  cropId: string;
  cropName: string;
  grade: string;
  totalWeight: number;
  harvestDate: string;
  intakeDate: string;
  crates: IntakeCrate[];
}

// ---------------------------------------------------------------------------
// Inventory
// ---------------------------------------------------------------------------

export interface InventoryCrate {
  id: string;
  qrCode: string;
  cropId: string;
  cropName: string;
  grade: string;
  weight: number;
  currentStatus: CrateStatus;
  currentWarehouse: string; // warehouse NAME here — see IntakeCrate note above
  farmerId: string;
  farmerName: string;
  batchId: string;
  harvestDate: string;
  intakeDate: string;
  expirationDate: string | null;
}

export interface TrackingEvent {
  eventType: TrackingEventType;
  timestamp: string;
  location: string;
  performedBy: string;
  notes: string | null;
}

export interface InventoryCrateDetail extends InventoryCrate {
  trackingEvents: TrackingEvent[];
}

export interface ListInventoryParams {
  warehouseId?: string;
  status?: CrateStatus;
  cropId?: string;
  farmerId?: string;
}

export interface ListAllocatableInventoryParams {
  cropId?: string;
  grade?: string;
  warehouseId?: string;
  farmerId?: string;
}

// ---------------------------------------------------------------------------
// Buyers (farmer-local — farmerId is required on both create and list)
// ---------------------------------------------------------------------------

/** "I've Got This" (automode.md) blackout window. Null start/end means the whole day is blacked out. */
export interface BlackoutWindow {
  dayOfWeek: string;
  startTime: string | null;
  endTime: string | null;
}

export interface Buyer {
  id: string;
  farmerId: string;
  businessName: string;
  contactName: string;
  email: string;
  phone: string;
  address: string;
  parish: string;
  community: string;
  latitude: number | null;
  longitude: number | null;
  /** "I've Got This" opt-in (automode.md) — see UpdateBuyerPreferencesRequest to change these. */
  autoModeEnabled: boolean;
  deliveryFlexibilityDays: number;
  maxDeliveriesPerWeek: number | null;
  blackoutWindows: BlackoutWindow[];
}

export interface CreateBuyerRequest {
  farmerId: string;
  businessName: string;
  contactName: string;
  email: string;
  phone: string;
  address: string;
  parish: string;
  community?: string | null;
}

/** Request body for PUT /api/buyers/{id}/preferences. Full-replace semantics for blackoutWindows. */
export interface UpdateBuyerPreferencesRequest {
  autoModeEnabled: boolean;
  deliveryFlexibilityDays: number;
  maxDeliveriesPerWeek: number | null;
  blackoutWindows: BlackoutWindow[];
}

export interface ListBuyersParams {
  farmerId: string;
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

export interface OrderItemRequest {
  cropId: string;
  quantity: number;
  grade: string;
}

export interface CreateOrderRequest {
  buyerId: string;
  deliveryDate?: string | null;
  items: OrderItemRequest[];
}

export interface UpdateOrderRequest {
  status: OrderStatus;
  deliveryDate?: string | null;
}

export interface OrderItem {
  id: string;
  cropId: string;
  cropName: string;
  quantity: number;
  grade: string;
}

export interface Order {
  id: string;
  buyerId: string;
  orderDate: string;
  status: OrderStatus;
  totalWeight: number;
  deliveryDate: string | null;
  items: OrderItem[];
}

export interface OrderSummary {
  id: string;
  buyerId: string;
  buyerName: string;
  farmerId: string;
  orderDate: string;
  status: OrderStatus;
  totalWeight: number;
  deliveryDate: string | null;
  itemCount: number;
}

export interface OrderItemDetail {
  id: string;
  cropId: string;
  cropName: string;
  quantity: number;
  grade: string;
  allocatedQuantity: number;
  isFullyAllocated: boolean;
}

export interface OrderDetail {
  id: string;
  buyerId: string;
  orderDate: string;
  status: OrderStatus;
  totalWeight: number;
  deliveryDate: string | null;
  items: OrderItemDetail[];
  deliveryId: string | null;
  deliveryStatus: string | null;
}

export interface ListOrdersParams {
  buyerId?: string;
  farmerId?: string;
}

// ---------------------------------------------------------------------------
// Deliveries
// ---------------------------------------------------------------------------

export interface CreateDeliveryRequest {
  driverId: string;
  vehicleId: string;
  departureTime?: string | null;
  crateIds: string[];
  orderId?: string | null;
}

export interface UpdateDeliveryRequest {
  status: DeliveryStatus;
  arrivalTime?: string | null;
}

export interface Delivery {
  id: string;
  warehouseId: string;
  warehouseName: string;
  driverId: string;
  driverName: string;
  vehicleId: string;
  vehiclePlateNumber: string;
  departureTime: string | null;
  arrivalTime: string | null;
  status: DeliveryStatus;
  crateIds: string[];
  orderId: string | null;
}

export interface DeliveryFarmerSummary {
  farmerId: string;
  farmerName: string;
}

export interface DeliverySummary {
  id: string;
  warehouseId: string;
  warehouseName: string;
  driverId: string;
  driverName: string;
  vehicleId: string;
  vehiclePlateNumber: string;
  departureTime: string | null;
  arrivalTime: string | null;
  status: DeliveryStatus;
  crateCount: number;
  farmers: DeliveryFarmerSummary[];
}

/**
 * `thisWeek` is mutually exclusive with `fromDate`/`toDate` (backend
 * returns 400 if both are supplied) — see DeliveriesController.List remarks.
 * `fromDate`/`toDate` are DateOnly values on the wire (yyyy-MM-dd).
 */
export interface ListDeliveriesParams {
  farmerId?: string;
  fromDate?: string;
  toDate?: string;
  thisWeek?: boolean;
}

// ---------------------------------------------------------------------------
// Drivers / Vehicles
// ---------------------------------------------------------------------------

export interface Driver {
  id: string;
  name: string;
  phoneNumber: string;
  licenseNumber: string;
  homeWarehouseId: string | null;
  homeWarehouseName: string | null;
  /**
   * Null for a real driver. When set, this driver was spawned by a
   * simulation run — the driver page uses this to decide whether to fetch
   * the live plan (GET /api/distribution/plan) or this run's plan
   * (POST /api/simulation/runs/{id}/plan).
   */
  simulationRunId: string | null;
}

export interface CreateDriverRequest {
  name: string;
  phoneNumber: string;
  licenseNumber: string;
  homeWarehouseId?: string | null;
}

export interface Vehicle {
  id: string;
  plateNumber: string;
  type: string;
  capacityKg: number | null;
  homeWarehouseId: string | null;
  homeWarehouseName: string | null;
}

export interface CreateVehicleRequest {
  plateNumber: string;
  type: string;
  capacityKg?: number | null;
  homeWarehouseId?: string | null;
}

// ---------------------------------------------------------------------------
// Warehouse transfers
// ---------------------------------------------------------------------------

export interface CreateWarehouseTransferRequest {
  crateId: string;
  toWarehouseId: string;
  driverId: string;
  vehicleId: string;
  notes?: string | null;
}

export interface WarehouseTransfer {
  id: string;
  crateId: string;
  qrCode: string;
  fromWarehouseId: string;
  fromWarehouseName: string;
  toWarehouseId: string;
  toWarehouseName: string;
  driverId: string;
  driverName: string;
  vehicleId: string;
  vehiclePlateNumber: string;
  timestamp: string;
  notes: string | null;
}

/** At least one of crateId/warehouseId is required (backend returns 400 otherwise). */
export interface ListWarehouseTransfersParams {
  crateId?: string;
  warehouseId?: string;
}

// ---------------------------------------------------------------------------
// Analytics (read-only)
// ---------------------------------------------------------------------------

export interface InventoryByStatusEntry {
  status: CrateStatus;
  crateCount: number;
  totalWeight: number;
}

export interface InventoryByCropEntry {
  cropId: string;
  cropName: string;
  crateCount: number;
  totalWeight: number;
}

export interface InventoryByWarehouseEntry {
  warehouseId: string;
  warehouseName: string;
  crateCount: number;
  totalWeight: number;
}

export interface InventorySummary {
  byStatus: InventoryByStatusEntry[];
  byCrop: InventoryByCropEntry[];
  byWarehouse: InventoryByWarehouseEntry[];
}

export interface RegionalProductionEntry {
  parish: string;
  crateCount: number;
  totalWeight: number;
}

export interface WarehouseUtilizationEntry {
  warehouseId: string;
  warehouseName: string;
  capacity: number;
  currentCrateCount: number;
  currentWeight: number;
  utilizationPercent: number;
}

export interface DeliveryStatusCountEntry {
  status: DeliveryStatus;
  count: number;
}

export interface DeliveryByWarehouseEntry {
  warehouseId: string;
  warehouseName: string;
  deliveryCount: number;
}

export interface DeliveryPerformance {
  byStatus: DeliveryStatusCountEntry[];
  averageDeliveryDurationHours: number | null;
  byWarehouse: DeliveryByWarehouseEntry[];
}

export interface SpoilageResponse {
  rejectedCount: number;
  rejectedWeight: number;
  disposedCount: number;
  disposedWeight: number;
}

/** weekStart is a DateOnly on the wire (yyyy-MM-dd). */
export interface IntakeTrendEntry {
  weekStart: string;
  crateCount: number;
  totalWeight: number;
}

// ---------------------------------------------------------------------------
// Simulation / Distribution Engine (enginePlan.md)
// ---------------------------------------------------------------------------

export interface CreateSimulationRunRequest {
  parish: string;
  driverCount: number;
  vehicleCount: number;
  customerCount: number;
  orderCount: number;
  vehicleCapacityKg?: number | null;
  averageOrderWeightKg?: number | null;
  /** automode.md "I've Got This" test: dumps ~half the week's orders onto one random day, far past fleet capacity, rest spread across the other 6. */
  generateCapacitySpikeTest?: boolean;
}

export interface SimulationRun {
  id: string;
  parish: string;
  warehouseId: string;
  warehouseName: string;
  driverCount: number;
  vehicleCount: number;
  customerCount: number;
  orderCount: number;
  createdAtUtc: string;
}

/** One stop on a trip. Coordinates are null if the buyer was never geocoded (no Mapbox token / simulation warehouse ungeocoded). */
export interface TripStop {
  orderId: string;
  buyerId: string;
  buyerName: string;
  buyerParish: string;
  orderWeight: number;
  legDistanceKm: number;
  legDurationMinutes: number | null;
  latitude: number | null;
  longitude: number | null;
  /** "HH:mm:ss" time-of-day, not a full date. */
  estimatedArrival: string | null;
}

/** One out-and-back trip a vehicle makes from its warehouse. A vehicle can run several of these in a working day. */
export interface VehicleTrip {
  tripNumber: number;
  /** "HH:mm:ss" time-of-day. */
  departureTime: string;
  /** "HH:mm:ss" time-of-day. */
  returnTime: string;
  distanceKm: number;
  durationMinutes: number;
  loadedWeightKg: number;
  stops: TripStop[];
  /**
   * The actual road-following path (warehouse -> stops in order ->
   * warehouse), fetched once per finalized trip. Null when unavailable (no
   * Mapbox token, a stop never resolved coordinates, or the request
   * failed) — fall back to drawing a straight line through `stops` in that
   * case.
   */
  routeGeometry: { latitude: number; longitude: number }[] | null;
}

export interface VehicleRoute {
  vehicleId: string;
  vehiclePlateNumber: string;
  driverId: string;
  driverName: string;
  warehouseId: string;
  warehouseName: string;
  warehouseLatitude: number | null;
  warehouseLongitude: number | null;
  capacityKg: number;
  trips: VehicleTrip[];
  tripCount: number;
  deliveryCount: number;
  totalDistanceKm: number;
  totalMinutesUsed: number;
  capacityUtilizationPercent: number;
}

export interface UnfulfilledOrder {
  orderId: string;
  buyerId: string;
  buyerName: string;
  buyerParish: string;
  orderWeight: number;
  reason: string;
  latitude: number | null;
  longitude: number | null;
}

export interface DispatchPlan {
  simulationRunId: string | null;
  generatedAtUtc: string;
  totalOrders: number;
  deliveredOrders: number;
  unfulfilledOrdersCount: number;
  totalDistanceKm: number;
  deliveriesPerKm: number;
  averageVehicleUtilizationPercent: number;
  routes: VehicleRoute[];
  unfulfilledOrders: UnfulfilledOrder[];
}

// ---------------------------------------------------------------------------
// Weekly planning / "I've Got This" (automode.md)
// ---------------------------------------------------------------------------

export type WeeklySchedulingMode = "RespectBuyerPreference" | "ForceBasic" | "ForceAutoMode";

/** One day of a weekly plan — the full daily dispatch plan plus which calendar day it is. */
export interface DailyPlanSummary {
  date: string;
  dayOfWeek: string;
  totalOrders: number;
  deliveredOrders: number;
  unfulfilledOrdersCount: number;
  totalDistanceKm: number;
  averageVehicleUtilizationPercent: number;
  plan: DispatchPlan;
}

export interface WeeklyDispatchPlan {
  simulationRunId: string | null;
  weekStart: string;
  weekEnd: string;
  mode: WeeklySchedulingMode;
  days: DailyPlanSummary[];
  /** Orders that couldn't be placed on any day this week at all (flexibility/blackout/cap conflict), not a fleet-capacity failure. */
  unschedulableOrders: UnfulfilledOrder[];
  totalOrders: number;
  deliveredOrders: number;
  unfulfilledOrdersCount: number;
  totalDistanceKm: number;
  deliveriesPerKm: number;
  distinctDeliveryDaysUsed: number;
}

/** The automode.md "test" comparison: same order set, same week, basic vs smart scheduling. */
export interface AutoModeComparison {
  basicMode: WeeklyDispatchPlan;
  smartMode: WeeklyDispatchPlan;
}

// ---------------------------------------------------------------------------
// Addresses
// ---------------------------------------------------------------------------

/** A genuinely real address (reverse-geocoded from a random jittered point), not fabricated text. */
export interface RandomAddress {
  address: string;
  parish: string;
  latitude: number;
  longitude: number;
}
