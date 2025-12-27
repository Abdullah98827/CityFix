// utils/logger.js
import { getAuth } from 'firebase/auth';
import { addDoc, collection, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../backend/firebase';

const auth = getAuth();

export const logAction = async (action, reportId = null, details = '') => {
  const currentUser = auth.currentUser;

  if (!currentUser) {
    // No user – skip silently
    return;
  }

  // Default role
  let userRole = 'citizen';

  // Optional: try to fetch role (safe)
  try {
    const userDocSnap = await getDoc(doc(db, 'UserMD', currentUser.uid));
    if (userDocSnap.exists()) {
      userRole = userDocSnap.data().role || 'citizen';
    }
  } catch (e) {
    // Ignore – use default
  }

  const logData = {
    timestamp: serverTimestamp(),
    userId: currentUser.uid,
    userEmail: currentUser.email || 'unknown',
    userRole,
    action,
    reportId,
    details,
  };

  // Fire and forget
  addDoc(collection(db, 'logs'), logData).catch(() => {
    // Ignore any write errors
  });
};