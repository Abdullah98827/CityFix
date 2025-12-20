import { useRouter } from 'expo-router';
import { collection, deleteDoc, doc, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { auth, db } from '../../backend/firebase';
import ReportCard from '../../components/ReportCard';
import ReportHeader from '../../components/ReportHeader';

export default function MyReports() {
  const router = useRouter();
  const [drafts, setDrafts] = useState([]);
  const [submittedReports, setSubmittedReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('submitted');

  useEffect(() => {
    if (!auth.currentUser) {
      router.replace('/(auth)/login');
      return;
    }

    const draftsQuery = query(
      collection(db, 'reports'),
      where('userId', '==', auth.currentUser.uid),
      where('isDraft', '==', true),
      orderBy('updatedAt', 'desc')
    );

    const submittedQuery = query(
      collection(db, 'reports'),
      where('userId', '==', auth.currentUser.uid),
      where('isDraft', '==', false),
      orderBy('createdAt', 'desc')
    );

    const unsubscribeDrafts = onSnapshot(draftsQuery, (snapshot) => {
      const draftsList = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        draftsList.push({
          id: doc.id,
          ...data,
          photoUrls: data.photoUrls || data.photos || [],
          videoUrls: data.videoUrls || (data.video ? [data.video] : (data.videos || [])),
        });
      });
      setDrafts(draftsList);
    });

    const unsubscribeSubmitted = onSnapshot(submittedQuery, (snapshot) => {
      const reportsList = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        reportsList.push({
          id: doc.id,
          ...data,
          photoUrls: data.photoUrls || data.photos || [],
          videoUrls: data.videoUrls || (data.video ? [data.video] : (data.videos || [])),
        });
      });
      setSubmittedReports(reportsList);
      setLoading(false);
    });

    return () => {
      unsubscribeDrafts();
      unsubscribeSubmitted();
    };
  }, [router]);

  const handleDeleteDraft = (draftId, title) => {
    Alert.alert(
      'Delete Draft',
      `Are you sure you want to delete "${title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteDoc(doc(db, 'reports', draftId));
            Alert.alert('Success', 'Draft deleted successfully');
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <ReportHeader title="My Reports" />

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'submitted' && styles.tabActive]}
          onPress={() => setActiveTab('submitted')}
        >
          <Text style={[styles.tabText, activeTab === 'submitted' && styles.tabTextActive]}>
            Submitted ({submittedReports.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'drafts' && styles.tabActive]}
          onPress={() => setActiveTab('drafts')}
        >
          <Text style={[styles.tabText, activeTab === 'drafts' && styles.tabTextActive]}>
            Drafts ({drafts.length})
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'submitted' && (
        <>
          {submittedReports.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No submitted reports</Text>
              <Text style={styles.emptySub}>
                Your submitted reports will appear here
              </Text>
            </View>
          ) : (
            <FlatList
              data={submittedReports}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => <ReportCard report={item} />}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
            />
          )}
        </>
      )}

      {activeTab === 'drafts' && (
        <>
          {drafts.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No drafts</Text>
              <Text style={styles.emptySub}>
                Save a report as draft to edit it later
              </Text>
            </View>
          ) : (
            <FlatList
              data={drafts}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={styles.draftCard}>
                  <View style={styles.draftInfo}>
                    <Text style={styles.draftTitle}>{item.title || 'Untitled Draft'}</Text>
                    <Text style={styles.draftStatus}>Draft • Not submitted</Text>
                    {item.category && (
                      <Text style={styles.draftCategory}>{item.category}</Text>
                    )}
                  </View>
                  <View style={styles.draftActions}>
                    <TouchableOpacity
                      style={styles.editBtn}
                      onPress={() => router.push(`/(citizen)/report?draftId=${item.id}`)}
                    >
                      <Text style={styles.editBtnText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.deleteBtn}
                      onPress={() => handleDeleteDraft(item.id, item.title)}
                    >
                      <Text style={styles.deleteBtnText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
            />
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: '#f8f9fa' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  tabActive: {
    backgroundColor: '#4F46E5',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748b',
  },
  tabTextActive: {
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
  draftCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#fbbf24',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  draftInfo: {
    marginBottom: 16,
  },
  draftTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 6,
  },
  draftStatus: {
    fontSize: 14,
    color: '#f59e0b',
    fontWeight: '600',
    marginBottom: 4,
  },
  draftCategory: {
    fontSize: 13,
    color: '#64748b',
    textTransform: 'capitalize',
  },
  draftActions: {
    flexDirection: 'row',
    gap: 12,
  },
  editBtn: {
    flex: 1,
    backgroundColor: '#4F46E5',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  editBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  deleteBtn: {
    flex: 1,
    backgroundColor: '#fee2e2',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  deleteBtnText: {
    color: '#dc2626',
    fontWeight: '600',
    fontSize: 15,
  },
});