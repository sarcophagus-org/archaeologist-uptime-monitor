import { incentivizedArchaeologists } from "../data/seeds";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  addDoc,
  getDocs,
  collection,
  query,
  where,
  orderBy,
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

export const updateIncentivizedArchaeologists = async () => {
  try {
    console.log("Updating incentivized archaeologists...", incentivizedArchaeologists.length);

    for await (const address of incentivizedArchaeologists) {
      await setDoc(doc(db, `incentivized_archaeologists/${address}`), { address });
    }

    console.log("DONE!");
  } catch (e) {
    console.error("Error adding document: ", e);
  }
};

export const saveDialResults = (attempts: DialAttempt[], timestampOfDial: number, successes: number, fails: number) => {
  try {
    attempts.map(async record => {
      const newRecord: DialAttempt & { successes?: FieldValue; failures?: FieldValue } = record;

      if (record.connectionStatus) {
        newRecord.successes = increment(1);
      } else {
        newRecord.failures = increment(1);
      }

      setDoc(doc(db, `dial_attempts/${record.address}`), newRecord, { merge: true });
    });

    setDoc(doc(db, `dial_times/${timestampOfDial}`), { time: timestampOfDial, successes, fails });
  } catch (e) {
    console.error("Error adding document: ", e);
  }
};

export const getOnlineNodes = async () => {
  try {
    const latestOnlineNodesSnapshot = await getDocs(
      query(collection(db, "dial_attempts"), where("connectionStatus", "==", true))
    );

    const onlinePeerIds: string[] = latestOnlineNodesSnapshot.docs.map(node => node.get("peerId"));
    return onlinePeerIds;
  } catch (e) {
    console.error("Error retrieving online nodes: ", e);
    throw e;
  }
};

export const getUptimeStats = async () => {
  try {
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

    return uptimeStatistics;
  } catch (e) {
    console.error("Error retrieving uptime stats: ", e);
    throw e;
  }
};
