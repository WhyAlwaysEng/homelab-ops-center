/**
 * Firebase Configuration for Homelab & Network Ops Center
 * Handles Realtime Database and Authentication
 */

import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase, ref, onValue, off } from 'firebase/database';

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase with error handling for placeholder values
let app: any = null;
let auth: any = null;
let database: any = null;


try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  auth = getAuth(app);
  database = getDatabase(app);

} catch (error) {
  console.warn('Firebase initialization failed (using placeholder config?):', (error as Error).message);
}

export { auth, database };

/**
 * Subscribe to real-time metrics updates from Firebase
 */
export function subscribeToMetrics(
  callback: (data: any) => void
): () => void {
  const metricsRef = ref(database, 'live_metrics');
  
  const unsubscribe = onValue(metricsRef, (snapshot) => {
    const data = snapshot.val();
    callback(data);
  });

  // Return unsubscribe function
  return () => off(metricsRef, 'value', unsubscribe);
}

/**
 * Subscribe to real-time container status updates
 */
export function subscribeToContainers(
  callback: (data: any) => void
): () => void {
  const containersRef = ref(database, 'containers');
  
  const unsubscribe = onValue(containersRef, (snapshot) => {
    const data = snapshot.val();
    callback(data);
  });

  return () => off(containersRef, 'value', unsubscribe);
}

/**
 * Subscribe to real-time network node status updates
 */
export function subscribeToNetworkNodes(
  callback: (data: any) => void
): () => void {
  const nodesRef = ref(database, 'network_nodes');
  
  const unsubscribe = onValue(nodesRef, (snapshot) => {
    const data = snapshot.val();
    callback(data);
  });

  return () => off(nodesRef, 'value', unsubscribe);
}

/**
 * Subscribe to real-time alerts
 */
export function subscribeToAlerts(
  callback: (data: any) => void
): () => void {
  const alertsRef = ref(database, 'alerts');
  
  const unsubscribe = onValue(alertsRef, (snapshot) => {
    const data = snapshot.val();
    callback(data);
  });

  return () => off(alertsRef, 'value', unsubscribe);
}
