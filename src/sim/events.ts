export type SimEvent =
  | { type: "flight_spawned"; flightId: string }
  | { type: "flight_on_blocks"; flightId: string }
  | { type: "flight_ready"; flightId: string }
  | { type: "flight_pushing"; flightId: string }
  | { type: "flight_departed"; flightId: string }
  | { type: "task_available"; flightId: string; serviceId: string }
  | { type: "task_started"; flightId: string; serviceId: string }
  | { type: "task_completed"; flightId: string; serviceId: string }
  | { type: "vehicle_dispatched"; vehicleId: string; flightId: string }
  | { type: "vehicle_arrived"; vehicleId: string; flightId: string }
  | { type: "score"; flightId: string; label: string; amount: number; kind: "bonus" | "base" | "streak" | "late" }
  | { type: "radio"; message: string }
  | { type: "warning"; message: string }
  | { type: "shift_ended" };

export type SimListener = (event: SimEvent) => void;

export class EventBus {
  private listeners = new Set<SimListener>();

  on(listener: SimListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit(event: SimEvent): void {
    for (const listener of this.listeners) listener(event);
  }
}
