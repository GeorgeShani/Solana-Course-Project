import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { ApiRequestError } from "./api";
import { API_URL } from "./config";
import {
  DiscoveryNotFoundError,
  fetchChanges,
  fetchIdea,
  fetchIdeas,
  fetchMyRequests,
  fetchTrader,
  fetchTraders,
  type WatchTarget,
} from "./discovery";

/** The first page has no cursor. */
const FIRST_PAGE: string | null = null;

/** Don't retry what retrying cannot fix: a missing record, or a request the server refused. */
function retryOnce(count: number, error: Error): boolean {
  if (
    error instanceof DiscoveryNotFoundError ||
    error instanceof ApiRequestError
  )
    return false;
  return count < 1;
}

export function useSourcedTraders() {
  return useInfiniteQuery({
    queryKey: ["discovery", "traders"],
    queryFn: ({ pageParam }) => fetchTraders(API_URL, pageParam),
    initialPageParam: FIRST_PAGE,
    getNextPageParam: (last) => last.nextCursor,
    staleTime: 30_000,
    retry: retryOnce,
  });
}

export function useSourcedTrader(id: string) {
  return useQuery({
    queryKey: ["discovery", "trader", id],
    queryFn: () => fetchTrader(API_URL, id),
    staleTime: 30_000,
    retry: retryOnce,
  });
}

export function useIdeaFeed() {
  return useInfiniteQuery({
    queryKey: ["discovery", "ideas"],
    queryFn: ({ pageParam }) => fetchIdeas(API_URL, { cursor: pageParam }),
    initialPageParam: FIRST_PAGE,
    getNextPageParam: (last) => last.nextCursor,
    staleTime: 30_000,
    retry: retryOnce,
  });
}

export function useIdea(id: string) {
  return useQuery({
    queryKey: ["discovery", "idea", id],
    queryFn: () => fetchIdea(API_URL, id),
    staleTime: 15_000,
    retry: retryOnce,
  });
}

/**
 * What changed in the things the reader watches. The cursors are part of the key, so marking
 * something read asks the server again from the new position rather than hiding results locally.
 */
export function useChanges(targets: readonly WatchTarget[]) {
  return useQuery({
    queryKey: [
      "discovery",
      "changes",
      targets.map((t) => `${t.type}:${t.id}:${t.after}`),
    ],
    queryFn: () => fetchChanges(API_URL, targets),
    enabled: targets.length > 0,
    staleTime: 30_000,
    retry: retryOnce,
  });
}

/** This browser's own requests, including the ones still waiting for a reviewer. */
export function useMyRequests() {
  return useQuery({
    queryKey: ["discovery", "me", "requests"],
    queryFn: () => fetchMyRequests(API_URL),
    staleTime: 10_000,
    retry: retryOnce,
  });
}
