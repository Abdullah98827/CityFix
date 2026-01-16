// Quick helpers to keep merged duplicate reports in sync with the master
// So when the main report gets updated, all the linked ones get the same changes

import { collection, doc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { db } from '../backend/firebase';

// Syncs status and any important fields from the master to all duplicates
// Returns how many reports actually got updated
export const syncStatusToMergedReports = async (masterReportId, updateData) => {
  let updatedCount = 0;

  // Find every report that points to this one as its master
  const q = query(
    collection(db, 'reports'),
    where('isDuplicateOf', '==', masterReportId)
  );

  const snapshot = await getDocs(q);

  // Nothing to do
  if (snapshot.empty) {
    return 0;
  }

  const updatePromises = [];

  snapshot.forEach((docSnapshot) => {
    const reportRef = doc(db, 'reports', docSnapshot.id);

    // Always copy the status
    const syncData = {
      status: updateData.status,
    };

    // Copy extra stuff depending on the new status
    if (updateData.status === 'assigned') {
      syncData.assignedTo = updateData.assignedTo;
      syncData.assignedToName = updateData.assignedToName;
      syncData.priority = updateData.priority;
      syncData.deadline = updateData.deadline;
      syncData.dispatcherNotes = updateData.dispatcherNotes;
      syncData.assignedAt = updateData.assignedAt;
    }

    if (updateData.status === 'in progress') {
      syncData.startedAt = updateData.startedAt;
    }

    if (updateData.status === 'resolved') {
      syncData.afterPhotos = updateData.afterPhotos;
      syncData.afterVideos = updateData.afterVideos;
      syncData.resolutionNotes = updateData.resolutionNotes;
      syncData.resolvedAt = updateData.resolvedAt;
    }

    if (updateData.status === 'verified') {
      syncData.qaFeedback = updateData.qaFeedback;
      syncData.verifiedAt = updateData.verifiedAt;
    }

    if (updateData.status === 'reopened') {
      syncData.reopenReason = updateData.reopenReason;
      syncData.qaFeedback = updateData.qaFeedback;
      syncData.reopenedAt = updateData.reopenedAt;
    }

    // Queue the update,  we'll run them all together at the end
    updatePromises.push(updateDoc(reportRef, syncData));
    updatedCount++;
  });

  // Run everything at once
  await Promise.all(updatePromises);

  return updatedCount;
};

// Just counts how many duplicates a master report has
export const getMergedReportsCount = async (masterReportId) => {
  const q = query(
    collection(db, 'reports'),
    where('isDuplicateOf', '==', masterReportId)
  );

  const snapshot = await getDocs(q);
  return snapshot.size;
};

// Gets the full data of every merged duplicate
export const getMergedReports = async (masterReportId) => {
  const q = query(
    collection(db, 'reports'),
    where('isDuplicateOf', '==', masterReportId)
  );

  const snapshot = await getDocs(q);
  const reports = [];

  snapshot.forEach((doc) => {
    reports.push({ id: doc.id, ...doc.data() });
  });

  return reports;
};