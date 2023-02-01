import { incentivizedArchaeologists } from "../data/seeds";
import { initializeApp } from "firebase/app";
import { getFirestore, addDoc, getDocs, collection, query, where, orderBy, setDoc, doc } from "firebase/firestore";

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
    console.log("Updating incentivizes archaeologists...", incentivizedArchaeologists.length);

    for await (const address of incentivizedArchaeologists) {
      await setDoc(doc(db, `incentivized_archaeologists/${address}`), { address });
    }

    console.log("DONE!");
  } catch (e) {
    console.error("Error adding document: ", e);
  }
};

export const saveDialResults = (attempts: DialAttempt[], timestampOfDial: number) => {
  try {
    attempts.map(async record => {
      addDoc(collection(db, "dial_attempts"), record);
    });

    addDoc(collection(db, "dial_times"), { time: timestampOfDial });
  } catch (e) {
    console.error("Error adding document: ", e);
  }
};

export const getOnlineNodes = async () => {
  try {
    const dialTimes = await getDocs(query(collection(db, "dial_times"), orderBy("time", "desc")));
    const lastDialTime = dialTimes.docs[0].get("time");

    const latestOnlineNodesSnapshot = await getDocs(
      query(
        collection(db, "dial_attempts"),
        where("timestampOfDial", "==", lastDialTime),
        where("connectionStatus", "==", true)
      )
    );

    const onlinePeerIds: string[] = latestOnlineNodesSnapshot.docs.map(node => node.get("peerId"));
    return onlinePeerIds;
  } catch (e) {
    console.error("Error adding document: ", e);
    throw e;
  }
};

export const getUptimeStats = async (fromTimestamp?: number) => {
  try {
    const incentivizedArchsSnapshot = await getDocs(collection(db, "incentivized_archaeologists"));
    const incentivizedArchs: string[] = incentivizedArchsSnapshot.docs.map(doc => doc.get("address"));

    const dialTimes = await getDocs(query(collection(db, "dial_times"), orderBy("time", "desc")));
    const nDialAttempts = fromTimestamp
      ? dialTimes.docs.filter(t => fromTimestamp <= t.get("time")).length
      : dialTimes.docs.length;

    const uptimeStatistics: Record<string, UptimeStats> = {};

    const successfulDialsSnapshot = (
      await getDocs(query(collection(db, "dial_attempts"), where("connectionStatus", "==", true)))
    ).docs;

    for await (const archAddress of incentivizedArchs) {
      const successes = successfulDialsSnapshot.filter(dial => dial.get("address") === archAddress).length;

      uptimeStatistics[archAddress] = {
        dialAttempts: nDialAttempts,
        successes,
        uptimeRatio: successes / nDialAttempts,
      };
    }

    return uptimeStatistics;
  } catch (e) {
    console.error("Error adding document: ", e);
    throw e;
  }
};
