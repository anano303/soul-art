/**
 * Background Sync Utility for PWA
 *
 * This module handles storing and synchronizing data when the app is offline
 * and submitting it when connectivity is restored.
 */

// IndexedDB database name and version
const DB_NAME = "soulart-offline-db";
const DB_VERSION = 1;
const STORE_NAME = "offlineRequests";

/**
 * Open the IndexedDB database
 */
async function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(new Error("IndexedDB not supported"));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      reject(new Error("Error opening IndexedDB"));
    };

    request.onsuccess = (event) => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, {
          keyPath: "id",
          autoIncrement: true,
        });
      }
    };
  });
}

/**
 * Save a request to IndexedDB for later synchronization
 * @param url The URL to request
 * @param method The HTTP method
 * @param headers The request headers
 * @param body The request body
 * @param timestamp When the request was made
 */
export async function saveOfflineRequest(
  url: string,
  method = "POST",
  headers = {},
  body?: any,
  timestamp = Date.now()
) {
  try {
    const db = await openDatabase();
    return new Promise<number>((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);

      // Store the request for later
      const request = store.add({
        url,
        method,
        headers,
        body,
        timestamp,
      });

      request.onsuccess = () => {
        // Register a sync with the service worker if available
        if ("serviceWorker" in navigator && "SyncManager" in window) {
          navigator.serviceWorker.ready
            .then((registration) => {
              // TypeScript doesn't know about sync API so we need to cast
              return (registration as any).sync.register("background-sync");
            })
            .catch((err) =>
              console.error("Background sync registration failed:", err)
            );
        }
        resolve(request.result as number);
      };

      request.onerror = () => {
        reject(new Error("Failed to save offline request"));
      };
    });
  } catch (error) {
    console.error("Error saving offline request:", error);
    throw error;
  }
}

/**
 * Get all pending offline requests
 */
export async function getPendingOfflineRequests() {
  try {
    const db = await openDatabase();
    return new Promise<any[]>((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(new Error("Failed to get offline requests"));
      };
    });
  } catch (error) {
    console.error("Error retrieving offline requests:", error);
    return [];
  }
}

/**
 * Delete a processed offline request
 * @param id The request ID to delete
 */
export async function deleteOfflineRequest(id: number) {
  try {
    const db = await openDatabase();
    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(new Error(`Failed to delete offline request ${id}`));
      };
    });
  } catch (error) {
    console.error(`Error deleting offline request ${id}:`, error);
    throw error;
  }
}

/**
 * Process all pending offline requests
 * This function is called by the service worker during background sync
 */
export async function processPendingOfflineRequests() {
  try {
    const requests = await getPendingOfflineRequests();

    console.log(`Processing ${requests.length} offline requests...`);

    // Process each request
    const results = await Promise.allSettled(
      requests.map(async (req) => {
        try {
          // Try to send the request
          const response = await fetch(req.url, {
            method: req.method,
            headers: req.headers,
            body: req.body ? JSON.stringify(req.body) : undefined,
            credentials: "same-origin",
          });

          // If successful, delete from IndexedDB
          if (response.ok) {
            await deleteOfflineRequest(req.id);
            return {
              success: true,
              id: req.id,
              status: response.status,
            };
          }

          return {
            success: false,
            id: req.id,
            error: `Server returned ${response.status} ${response.statusText}`,
          };
        } catch (error) {
          return {
            success: false,
            id: req.id,
            error: error instanceof Error ? error.message : "Unknown error",
          };
        }
      })
    );

    // Return summary
    return {
      total: requests.length,
      succeeded: results.filter(
        (r) => r.status === "fulfilled" && (r.value as any).success
      ).length,
      failed: results.filter(
        (r) => r.status === "rejected" || !(r.value as any).success
      ).length,
      results,
    };
  } catch (error) {
    console.error("Error processing offline requests:", error);
    return {
      total: 0,
      succeeded: 0,
      failed: 0,
      results: [],
    };
  }
}

/**
 * Helper function to handle fetch API errors and save for offline sync if needed
 * @param url The URL to fetch
 * @param options The fetch options
 * @param bypassOffline Whether to bypass offline handling
 */
export async function offlineSafeFetch(
  url: string,
  options: RequestInit = {},
  bypassOffline = false
) {
  // Set default method
  const method = options.method || "GET";

  // Don't use offline caching for GET requests or when bypass is true
  if (method === "GET" || bypassOffline) {
    return fetch(url, options);
  }

  try {
    // Try the fetch normally
    const response = await fetch(url, options);
    return response;
  } catch (error) {
    // If we're offline, save the request for later sync
    if (!navigator.onLine) {
      await saveOfflineRequest(
        url,
        method,
        options.headers,
        options.body,
        Date.now()
      );

      // Return a fake success response
      return new Response(
        JSON.stringify({
          success: true,
          offline: true,
          message: "Request saved for offline sync",
        }),
        {
          status: 202,
          headers: {
            "Content-Type": "application/json",
            "X-Offline-Sync": "pending",
          },
        }
      );
    }

    // If we're online but fetch failed for other reasons, rethrow
    throw error;
  }
}
