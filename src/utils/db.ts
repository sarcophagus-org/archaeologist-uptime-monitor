import { initializeApp } from "firebase/app";
import { getFirestore, addDoc, getDocs, collection, query, where, orderBy } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  appId: process.env.FIREBASE_APP_ID,
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
  }
};
