// utils/statusSyncHelper.js
// Helper functions to sync status updates from a master report to all merged duplicates
// This keeps all citizens informed when their merged report changes

import { collection, doc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { db } from '../backend/firebase';

/**
 * Syncs status and relevant fields from master report to all merged duplicates
 * @param {string} masterReportId - ID of the master report
 * @param {object} updateData - Data to sync (status, assignment, media, notes, etc.)
 * @returns {Promise<number>} - Number of reports successfully updated
 */
export const syncStatusToMergedReports = async (masterReportId, updateData) => {
  let updatedCount = 0;

  // Find all reports merged into this master
  const q = query(
    collection(db, 'reports'),
    where('isDuplicateOf', '==', masterReportId)
  );

  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    return 0; // No merged reports to update
  }

  const updatePromises = [];

  snapshot.forEach((docSnapshot) => {
    const reportRef = doc(db, 'reports', docSnapshot.id);

    // Base data – always sync status
    const syncData = {
      status: updateData.status,
    };

    // Sync extra fields based on new status
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

    // Queue the update
    updatePromises.push(updateDoc(reportRef, syncData));
    updatedCount++;
  });

  // Execute all updates at once
  await Promise.all(updatePromises);

  return updatedCount;
};

/**
 * Gets the number of merged reports for a master report
 * @param {string} masterReportId - ID of the master report
 * @returns {Promise<number>} - Count of merged duplicates
 */
export const getMergedReportsCount = async (masterReportId) => {
  const q = query(
    collection(db, 'reports'),
    where('isDuplicateOf', '==', masterReportId)
  );

  const snapshot = await getDocs(q);
  return snapshot.size;
};

/**
 * Gets full data of all merged reports for a master report
 * @param {string} masterReportId - ID of the master report
 * @returns {Promise<Array>} - Array of merged report objects
 */
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