// app/(dispatcher)/home.js
// FINAL CLEAN VERSION with DEBUG LOGGING for auto-merge

import { useRouter } from 'expo-router';
import { collection, doc, onSnapshot, orderBy, query, updateDoc } from 'firebase/firestore';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { db } from '../../backend/firebase';
import AppHeader from '../../components/AppHeader';
import CustomButton from '../../components/CustomButton';
import ReportCard from '../../components/ReportCard';

// ============================================
// CONFIGURABLE SETTINGS
// ============================================
// For AUTO-MERGE (must be very confident)
const AUTO_MERGE_RADIUS_KM = 0.03; // 30 meters - very close
const AUTO_MERGE_TIME_HOURS = 12; // 12 hours - recent

// For MANUAL REVIEW (less certain, needs dispatcher approval)
const MANUAL_REVIEW_RADIUS_KM = 0.05; // 50 meters - somewhat close
const MANUAL_REVIEW_TIME_HOURS = 24; // 24 hours - same day

export default function DispatcherHome() {
  const router = useRouter();
  
  // STATE VARIABLES
  const [allReports, setAllReports] = useState([]);
  const [displayItems, setDisplayItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('new');
  const unsubscribeRef = useRef(null);

  // ============================================
  // FETCH REPORTS FROM DATABASE
  // ============================================
  useEffect(() => {
    console.log('🔄 [DISPATCHER] Starting to fetch reports...');
    
    const q = query(collection(db, 'reports'), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      console.log('📦 [DISPATCHER] Snapshot received, total docs:', snapshot.size);
      
      const reportsList = [];
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        
        // Only exclude merged duplicates (they're not real reports anymore)
        // Include all other statuses: submitted, assigned, in progress, resolved, verified, reopened
        if (data.status !== 'merged') {
          reportsList.push({ id: doc.id, ...data });
        }
      });

      console.log('✅ [DISPATCHER] Active reports loaded:', reportsList.length);
      setAllReports(reportsList);

      // ============================================
      // STEP 1: AUTO-MERGE OBVIOUS DUPLICATES
      // (BASIC FEATURE - runs automatically on every update)
      // ============================================
      const submittedReports = reportsList.filter(r => r.status === 'submitted');
      console.log('🔍 [AUTO-MERGE] Found', submittedReports.length, 'submitted reports to check');
      
      if (submittedReports.length > 0) {
        await autoMergeDuplicates(submittedReports);
      } else {
        console.log('⏭️ [AUTO-MERGE] Skipping - no submitted reports');
      }

      // ============================================
      // STEP 2: GROUP UNCERTAIN DUPLICATES FOR REVIEW
      // (EXTRA FEATURE - shows to dispatcher)
      // ============================================
      let items = reportsList;
      
      if (filter === 'new') {
        const submittedOnly = reportsList.filter(r => r.status === 'submitted');
        items = groupUncertainDuplicates(submittedOnly);
      } else if (filter === 'assigned') {
        // Wrap reports in the expected format
        items = reportsList
          .filter(r => r.status === 'assigned' || r.status === 'in progress')
          .map(r => ({ type: 'single', report: r }));
      } else {
        // ALL: Wrap reports in the expected format
        items = reportsList.map(r => ({ type: 'single', report: r }));
      }

      setDisplayItems(items);
      setLoading(false);
    });

    unsubscribeRef.current = unsubscribe;
    return () => unsubscribe();
  }, [filter]);

  // ============================================
  // BASIC FEATURE: AUTO-MERGE OBVIOUS DUPLICATES
  // This runs silently in the background with DEBUG LOGGING
  // ============================================
  const autoMergeDuplicates = async (reports) => {
    console.log('');
    console.log('🤖 ========================================');
    console.log('🤖 AUTO-MERGE: Starting analysis');
    console.log('🤖 ========================================');
    console.log('📊 Reports to check:', reports.length);
    console.log('📏 Distance limit:', AUTO_MERGE_RADIUS_KM * 1000, 'meters');
    console.log('⏰ Time limit:', AUTO_MERGE_TIME_HOURS, 'hours');
    console.log('');
    
    const processed = new Set();
    let totalMerged = 0;

    for (let i = 0; i < reports.length; i++) {
      const report = reports[i];
      
      if (processed.has(report.id)) {
        console.log(`[${i + 1}/${reports.length}] ⏭️ Skipping ${report.id} - already processed`);
        continue;
      }
      
      if (report.duplicateCount > 0) {
        console.log(`[${i + 1}/${reports.length}] ⏭️ Skipping ${report.id} - already a master report`);
        continue;
      }

      console.log('');
      console.log(`[${i + 1}/${reports.length}] 🔍 Analyzing Report: ${report.id}`);
      console.log(`  📝 Title: ${report.title}`);
      console.log(`  📁 Category: ${report.category}`);
      console.log(`  📍 Location: ${report.location.latitude.toFixed(6)}, ${report.location.longitude.toFixed(6)}`);

      const duplicates = [];

      // Find VERY CLOSE duplicates (high confidence)
      for (let j = 0; j < reports.length; j++) {
        const other = reports[j];
        
        if (processed.has(other.id)) continue;
        if (other.id === report.id) continue;
        
        console.log(`  🔄 Comparing with ${other.id}...`);
        
        // CHECK 1: Same category
        if (other.category !== report.category) {
          console.log(`    ❌ Different categories: "${report.category}" vs "${other.category}"`);
          continue;
        }
        console.log(`    ✅ Same category: "${report.category}"`);

        // CHECK 2: Very close distance (30m - stricter than manual review)
        const distance = calculateDistance(
          report.location.latitude,
          report.location.longitude,
          other.location.latitude,
          other.location.longitude
        );
        const distanceMeters = (distance * 1000).toFixed(1);
        console.log(`    📏 Distance: ${distanceMeters}m (limit: ${AUTO_MERGE_RADIUS_KM * 1000}m)`);
        
        if (distance > AUTO_MERGE_RADIUS_KM) {
          console.log(`    ❌ Too far apart`);
          continue;
        }
        console.log(`    ✅ Within distance limit`);

        // CHECK 3: Very close in time (12h - stricter than manual review)
        const timeDiff = Math.abs(
          (report.createdAt?.toDate() || new Date()) - 
          (other.createdAt?.toDate() || new Date())
        );
        const hoursDiff = (timeDiff / (1000 * 60 * 60)).toFixed(1);
        console.log(`    ⏰ Time difference: ${hoursDiff}h (limit: ${AUTO_MERGE_TIME_HOURS}h)`);
        
        if (hoursDiff > AUTO_MERGE_TIME_HOURS) {
          console.log(`    ❌ Too far apart in time`);
          continue;
        }
        console.log(`    ✅ Within time limit`);

        // High confidence duplicate - add it
        console.log(`    🎯 MATCH! This is a duplicate!`);
        duplicates.push(other);
        processed.add(other.id);
      }

      // If we found obvious duplicates, merge them automatically
      if (duplicates.length > 0) {
        console.log('');
        console.log(`  🔗 MERGING: Found ${duplicates.length} duplicate(s) to merge into master ${report.id}`);
        try {
          // Mark duplicates as merged
          for (const dup of duplicates) {
            console.log(`    📌 Marking ${dup.id} as merged`);
            await updateDoc(doc(db, 'reports', dup.id), {
              status: 'merged',
              isDuplicateOf: report.id,
              mergedAt: new Date(),
              autoMerged: true,
            });
          }

          // Update master report
          console.log(`    📌 Updating master ${report.id} with duplicateCount: ${duplicates.length}`);
          await updateDoc(doc(db, 'reports', report.id), {
            duplicateCount: duplicates.length,
            mergedReportIds: duplicates.map(d => d.id),
            autoMerged: true,
          });
          
          totalMerged += duplicates.length;
          console.log(`  ✅ Successfully auto-merged ${duplicates.length} report(s)`);
        } catch (error) {
          console.error('  ❌ Auto-merge error:', error);
        }
      } else {
        console.log(`  ℹ️ No duplicates found for this report`);
      }

      processed.add(report.id);
    }
    
    console.log('');
    console.log('🤖 ========================================');
    console.log(`🤖 AUTO-MERGE: Complete! Merged ${totalMerged} total reports`);
    console.log('🤖 ========================================');
    console.log('');
  };

  // ============================================
  // EXTRA FEATURE: GROUP UNCERTAIN DUPLICATES
  // These need manual review by the dispatcher
  // ============================================
  const groupUncertainDuplicates = (reports) => {
    const grouped = [];
    const processed = new Set();

    for (const report of reports) {
      if (processed.has(report.id)) continue;

      const group = [report];
      processed.add(report.id);

      // Find POSSIBLE duplicates (less strict - needs human verification)
      for (const other of reports) {
        if (processed.has(other.id)) continue;
        if (other.id === report.id) continue;
        if (other.category !== report.category) continue;

        // CHECK 1: Within 50 meters (less strict)
        const distance = calculateDistance(
          report.location.latitude,
          report.location.longitude,
          other.location.latitude,
          other.location.longitude
        );
        if (distance > MANUAL_REVIEW_RADIUS_KM) continue;

        // CHECK 2: Within 24 hours (less strict)
        const timeDiff = Math.abs(
          (report.createdAt?.toDate() || new Date()) - 
          (other.createdAt?.toDate() || new Date())
        );
        const hoursDiff = timeDiff / (1000 * 60 * 60);
        if (hoursDiff > MANUAL_REVIEW_TIME_HOURS) continue;

        // Possible duplicate - add to group for review
        group.push(other);
        processed.add(other.id);
      }

      // If we found possible duplicates, show them for manual review
      if (group.length > 1) {
        grouped.push({ 
          type: 'group', 
          reports: group, 
          master: group[0] 
        });
      } else {
        // Single report - not a duplicate
        grouped.push({ type: 'single', report: group[0] });
      }
    }

    return grouped;
  };

  // ============================================
  // CALCULATE DISTANCE (Haversine Formula)
  // Reference: https://www.movable-type.co.uk/scripts/latlong.html
  // ============================================
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // ============================================
  // HANDLE REPORT PRESS
  // ============================================
  const handleReportPress = (reportId) => {
    router.push(`/(dispatcher)/report-detail/${reportId}`);
  };

  // ============================================
  // MANUAL MERGE (for uncertain duplicates)
  // ============================================
  const handleManualMerge = async (group) => {
    try {
      const master = group.master;
      const duplicates = group.reports.slice(1);

      // Mark duplicates as merged
      for (const dup of duplicates) {
        await updateDoc(doc(db, 'reports', dup.id), {
          status: 'merged',
          isDuplicateOf: master.id,
          mergedAt: new Date(),
          autoMerged: false,
        });
      }

      // Update master report
      const currentDuplicateCount = master.duplicateCount || 0;
      await updateDoc(doc(db, 'reports', master.id), {
        duplicateCount: currentDuplicateCount + duplicates.length,
        mergedReportIds: [
          ...(master.mergedReportIds || []),
          ...duplicates.map(d => d.id)
        ],
      });

      Alert.alert(
        'Success', 
        `${duplicates.length} duplicate(s) merged successfully!`
      );
    } catch (error) {
      console.error('Manual merge error:', error);
      Alert.alert('Error', 'Failed to merge duplicates. Please try again.');
    }
  };

  // ============================================
  // CALCULATE TAB COUNTS
  // ============================================
  const newCount = allReports.filter(r => r.status === 'submitted').length;
  const assignedCount = allReports.filter(r => 
    r.status === 'assigned' || r.status === 'in progress'
  ).length;
  const allCount = allReports.length;

  // ============================================
  // LOADING STATE
  // ============================================
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  // ============================================
  // MAIN UI
  // ============================================
  return (
    <View style={styles.container}>
      <AppHeader title="Dispatcher Console" showBack={false} showSignOut={true} />

      {/* Tab Buttons */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={[styles.filterTab, filter === 'new' && styles.filterTabActive]}
            onPress={() => setFilter('new')}
          >
            <Text style={[styles.filterText, filter === 'new' && styles.filterTextActive]}>
              New ({newCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterTab, filter === 'assigned' && styles.filterTabActive]}
            onPress={() => setFilter('assigned')}
          >
            <Text style={[styles.filterText, filter === 'assigned' && styles.filterTextActive]}>
              Assigned ({assignedCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
            onPress={() => setFilter('all')}
          >
            <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
              All ({allCount})
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Reports List */}
      {displayItems.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No reports found</Text>
          <Text style={styles.emptySub}>
            {filter === 'new' ? 'New reports will appear here' : 'No reports match this filter'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={displayItems}
          keyExtractor={(item, index) => {
            if (item.type === 'group') {
              return `group-${item.master.id}`;
            }
            return item.report?.id || `item-${index}`;
          }}
          renderItem={({ item }) => {
            // CASE 1: Group of uncertain duplicates (needs manual review)
            if (item.type === 'group') {
              return (
                <View style={styles.duplicateGroup}>
                  <Text style={styles.groupTitle}>
                    ⚠️ Possible Duplicates ({item.reports.length})
                  </Text>
                  <Text style={styles.groupSubtitle}>
                    These reports are within {MANUAL_REVIEW_RADIUS_KM * 1000}m and {MANUAL_REVIEW_TIME_HOURS}h of each other.
                    Review them and merge if they`re the same issue.
                  </Text>
                  
                  {/* Show each report in the group */}
                  {item.reports.map((r) => (
                    <ReportCard
                      key={r.id}
                      report={r}
                      onPress={() => handleReportPress(r.id)}
                    />
                  ))}
                  
                  {/* Button to manually merge */}
                  <CustomButton
                    title="Merge These Duplicates"
                    onPress={() => handleManualMerge(item)}
                    variant="secondary"
                  />
                </View>
              );
            }

            // CASE 2: Single report (not a duplicate)
            if (!item.report) {
              return null;
            }

            return (
              <ReportCard
                report={item.report}
                onPress={() => handleReportPress(item.report.id)}
              />
            );
          }}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

// ============================================
// STYLES
// ============================================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  filterContainer: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
  },
  filterTab: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 30,
    backgroundColor: '#f1f5f9',
    marginRight: 12,
  },
  filterTabActive: {
    backgroundColor: '#4F46E5',
  },
  filterText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748b',
  },
  filterTextActive: {
    color: '#fff',
  },
  list: { padding: 16 },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 20,
    color: '#64748b',
    marginBottom: 8,
    fontWeight: '600',
  },
  emptySub: {
    fontSize: 15,
    color: '#94a3b8',
    textAlign: 'center',
  },
  duplicateGroup: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#fbbf24',
  },
  groupTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#92400e',
    marginBottom: 6,
  },
  groupSubtitle: {
    fontSize: 13,
    color: '#78716c',
    marginBottom: 12,
    fontStyle: 'italic',
  },
});