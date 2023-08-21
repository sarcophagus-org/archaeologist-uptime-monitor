import { incentivizedArchaeologists } from "../data/seeds";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  getDocs,
  collection,
  query,
  where,
  runTransaction,
  setDoc,
  doc,
  increment,
  FieldValue,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  projectId: process.env.FIREBASE_PROJECT_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

interface DialAttempt {
  address: string;
  peerId: string;
  timestampOfDial: number;
  connectionStatus: boolean;
}

interface UptimeStats {
  dialAttempts: number;
  successes: number;
  uptimeRatio: number;
}

let uptimeStatisticsCached: Record<string, UptimeStats> | undefined = undefined;
let onlinePeerIdsCached: string[] = [];
let lastUptimeRetrieval = 0;
let lastOnlinePeerIdsRetrieval = 0;

export const updateIncentivizedArchaeologists = async () => {
  try {
    console.log("Updating incentivized archaeologists...", incentivizedArchaeologists.length);

    await runTransaction(db, async transaction => {
      for await (const address of incentivizedArchaeologists) {
        transaction.set(doc(db, `incentivized_archaeologists/${address}`), { address });
      }
    });

    console.log("DONE!");
  } catch (e) {
    console.error("Error adding document: ", e);
  }
};

export const saveDialResults = async (
  attempts: DialAttempt[],
  timestampOfDial: number,
  successes: number,
  fails: number
) => {
  try {
    await runTransaction(db, async transaction => {
      attempts.forEach(async record => {
        const newRecord: DialAttempt & { successes?: FieldValue; failures?: FieldValue } = record;

        if (record.connectionStatus) {
          newRecord.successes = increment(1);
        } else {
          newRecord.failures = increment(1);
        }

        transaction.set(doc(db, `dial_attempts/${record.address}`), newRecord, { merge: true });
      });
    });

    setDoc(doc(db, `dial_times/${timestampOfDial}`), { time: timestampOfDial, successes, fails });
  } catch (e) {
    console.error("Error adding document: ", e);
  }
};

export const getOnlineNodes = async () => {
  try {
    if (lastOnlinePeerIdsRetrieval) {
      // If we last retrieved within 20 minutes
      if (lastOnlinePeerIdsRetrieval > (Date.now() - (60 * 20 * 1000))) {
        return onlinePeerIdsCached;
      }
    }

    const latestOnlineNodesSnapshot = await getDocs(
      query(collection(db, "dial_attempts"), where("connectionStatus", "==", true))
    );

    const onlinePeerIds: string[] = latestOnlineNodesSnapshot.docs.map(node => node.get("peerId"));
    onlinePeerIdsCached = onlinePeerIds;
    lastOnlinePeerIdsRetrieval = Date.now();
    return onlinePeerIds;
  } catch (e) {
    console.error("Error retrieving online nodes: ", e);
    throw e;
  }
};

export const getOfflineNodesAddresses = async () => {
  try {
    const latestOfflineNodesSnapshot = await getDocs(
      query(collection(db, "dial_attempts"), where("connectionStatus", "==", false))
    );

    const offlineAddresses: string[] = latestOfflineNodesSnapshot.docs.map(node => node.get("address"));
    return offlineAddresses;
  } catch (e) {
    console.error("Error retrieving online nodes: ", e);
    throw e;
  }
};

export const getUptimeStats = async () => {
  try {
    if (lastUptimeRetrieval) {
      // If we last retrieved within 30 minutes
      if (lastUptimeRetrieval > (Date.now() - (60 * 30 * 1000))) {
        return uptimeStatisticsCached;
      }
    }

    const incentivizedArchsSnapshot = await getDocs(collection(db, "incentivized_archaeologists"));
    const incentivizedArchs: string[] = incentivizedArchsSnapshot.docs.map(doc => doc.get("address"));

    const uptimeStatistics: Record<string, UptimeStats> = {};

    const dialAttemptsDocs = (await getDocs(query(collection(db, "dial_attempts")))).docs.map(doc => doc.data());

    for await (const archAddress of incentivizedArchs) {
      const archData = dialAttemptsDocs.find(doc => doc["address"].toLowerCase() === archAddress.toLowerCase());

      const successes = archData ? archData["successes"] ?? 0 : 0;
      const failures = archData ? archData["failures"] ?? 0 : 0;
      const dialAttempts = successes + failures;

      dialAttemptsDocs.filter(doc => doc["failures"] ?? 0);

      uptimeStatistics[archAddress] = {
        dialAttempts,
        successes,
        uptimeRatio: successes / (successes + failures),
      };
    }

    lastUptimeRetrieval = Date.now();
    uptimeStatisticsCached = uptimeStatistics;
    return uptimeStatistics;
  } catch (e) {
    console.error("Error retrieving uptime stats: ", e);
    throw e;
  }
};
