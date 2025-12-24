// utils/statusSyncHelper.js
// Helper function to sync status updates from master report to all merged duplicates
// This ensures all citizens get notified when their merged report is updated

import { collection, doc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { db } from '../backend/firebase';

/**
 * Syncs status and related fields from master report to all merged duplicates
 * @param {string} masterReportId - The ID of the master report
 * @param {object} updateData - The data to sync (status, afterPhotos, etc.)
 * @returns {Promise<number>} - Number of reports updated
 */
export const syncStatusToMergedReports = async (masterReportId, updateData) => {
  try {
    console.log('🔄 Syncing status to merged reports for master:', masterReportId);
    
    // Find all reports that were merged into this master report
    const q = query(
      collection(db, 'reports'),
      where('isDuplicateOf', '==', masterReportId)
    );
    
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      console.log('📭 No merged reports found');
      return 0;
    }

    console.log(`📦 Found ${snapshot.size} merged report(s) to update`);

    // Update each merged report
    let updatedCount = 0;
    const updatePromises = [];

    snapshot.forEach((docSnapshot) => {
      const reportRef = doc(db, 'reports', docSnapshot.id);
      
      // Prepare update data - sync relevant fields
      const syncData = {
        status: updateData.status, // Always sync status
      };

      // Sync additional fields based on status
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

      // Add to batch update
      updatePromises.push(updateDoc(reportRef, syncData));
      updatedCount++;
    });

    // Execute all updates
    await Promise.all(updatePromises);

    console.log(`✅ Successfully synced status to ${updatedCount} merged report(s)`);
    return updatedCount;

  } catch (error) {
    console.error('❌ Error syncing status to merged reports:', error);
    throw error;
  }
};

/**
 * Gets count of merged reports for a master report
 * @param {string} masterReportId - The ID of the master report
 * @returns {Promise<number>} - Number of merged reports
 */
export const getMergedReportsCount = async (masterReportId) => {
  try {
    const q = query(
      collection(db, 'reports'),
      where('isDuplicateOf', '==', masterReportId)
    );
    
    const snapshot = await getDocs(q);
    return snapshot.size;
  } catch (error) {
    console.error('Error getting merged reports count:', error);
    return 0;
  }
};

/**
 * Gets all merged reports for a master report
 * @param {string} masterReportId - The ID of the master report
 * @returns {Promise<Array>} - Array of merged reports
 */
export const getMergedReports = async (masterReportId) => {
  try {
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
  } catch (error) {
    console.error('Error getting merged reports:', error);
    return [];
  }
};