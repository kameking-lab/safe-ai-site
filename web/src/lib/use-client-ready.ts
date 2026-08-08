"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

/** True only after React has attached client handlers to this island. */
export function useClientReady(): boolean {
  return useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
}
