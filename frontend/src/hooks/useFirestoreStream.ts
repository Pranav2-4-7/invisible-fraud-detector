"use client";

/**
 * Custom hook for real-time Firestore collection streaming.
 * Subscribes to Firestore onSnapshot and auto-cleans up on unmount.
 */

import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  limit,
  QuerySnapshot,
  DocumentData,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

interface UseFirestoreStreamOptions {
  collectionName: string;
  orderByField?: string;
  orderDirection?: "asc" | "desc";
  limitCount?: number;
  enabled?: boolean;
}

export function useFirestoreStream<T = DocumentData>({
  collectionName,
  orderByField = "created_at",
  orderDirection = "desc",
  limitCount = 50,
  enabled = true,
}: UseFirestoreStreamOptions) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const q = query(
        collection(db, collectionName),
        orderBy(orderByField, orderDirection),
        limit(limitCount)
      );

      const unsubscribe = onSnapshot(
        q,
        (snapshot: QuerySnapshot) => {
          const docs = snapshot.docs.map((doc: any) => ({
            ...doc.data(),
            _id: doc.id,
          })) as T[];
          setData(docs);
          setLoading(false);
        },
        (err: any) => {
          console.error(`Firestore stream error [${collectionName}]:`, err);
          setError(err.message);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error(`Firestore setup error [${collectionName}]:`, message);
      setError(message);
      setLoading(false);
    }
  }, [collectionName, orderByField, orderDirection, limitCount, enabled]);

  return { data, loading, error };
}
