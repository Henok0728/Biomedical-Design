import {
  createContext,
  useContext,
  useMemo,
  useSyncExternalStore,
} from "react";
import { simulator, type SimulatorSnapshot } from "./PphSimulator";

const SimulatorContext = createContext(simulator);

export function useSimulator() {
  return useContext(SimulatorContext);
}

export function useSimulatorSnapshot(): SimulatorSnapshot {
  const sim = useSimulator();
  const subscribe = useMemo(
    () => (onStoreChange: () => void) => sim.subscribe(() => onStoreChange()),
    [sim],
  );
  return useSyncExternalStore(
    subscribe,
    () => sim.snapshot(),
    () => sim.snapshot(),
  );
}

export { SimulatorContext };
