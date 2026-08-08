/**
 * Server compatibility entry point.
 *
 * The isomorphic core lives outside `lib/server` so client code can perform
 * the same fail-closed check before any browser network request. Route
 * Handlers continue importing this server entry point as their final defense.
 */
export * from "@/lib/ai-outbound-safety";
