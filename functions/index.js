const { onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { setGlobalOptions } = require("firebase-functions/v2");
const admin = require("firebase-admin");
const { Expo } = require("expo-server-sdk");

admin.initializeApp();
const expo = new Expo();

// Optional: set region if you want (closer to users)
setGlobalOptions({ region: "europe-west1" });

exports.onReportUpdate = onDocumentUpdated("reports/{reportId}", async (event) => {
  const before = event.data.before.data();
  const after = event.data.after.data();
  const reportId = event.params.reportId;

  // Only trigger if status changed
  if (before.status === after.status) return null;

  const newStatus = after.status;
  const messages = [];

  // Helper to send notification and push for a user
  const sendNotification = async (userId, message) => {
    if (!userId) return;

    const userSnap = await admin.firestore().doc(`UserMD/${userId}`).get();
    if (!userSnap.exists) return;

    const userData = userSnap.data();
    const token = userData.expoPushToken;

    // Save to user's notifications subcollection
    await admin.firestore()
      .collection(`UserMD/${userId}/notifications`)
      .add({
        message,
        reportId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        read: false,
      });

    // Send push notification
    if (token && Expo.isExpoPushToken(token)) {
      messages.push({
        to: token,
        sound: 'default',
        title: 'CityFix',
        body: message,
        data: { reportId },
      });
    }
  };

  // Helper to get all users by role (for group notifications)
  const getUsersByRole = async (role) => {
    const usersSnap = await admin.firestore()
      .collection('UserMD')
      .where('role', '==', role)
      .get();
    const users = [];
    usersSnap.forEach((doc) => users.push(doc.id));
    return users;
  };

  // Citizen notifications
  if (after.userId) {
    let citizenMessage = '';
    if (newStatus === 'submitted') citizenMessage = 'Your report has been submitted';
    if (newStatus === 'assigned') citizenMessage = 'Your report has been assigned to an engineer';
    if (newStatus === 'in progress') citizenMessage = 'An engineer has started working on your report';
    if (newStatus === 'resolved') citizenMessage = 'Your report has been marked as resolved';
    if (newStatus === 'verified') citizenMessage = 'Your report has been verified – issue fixed';
    if (newStatus === 'reopened') citizenMessage = 'Your report has been reopened for further work';
    if (newStatus === 'merged') citizenMessage = 'Your report has been merged with similar reports';

    if (citizenMessage) {
      await sendNotification(after.userId, citizenMessage);
    }
  }

  // Engineer notifications
  if (after.assignedTo) {
    let engineerMessage = '';
    if (newStatus === 'assigned') engineerMessage = 'You have been assigned a new report';
    if (newStatus === 'reopened') engineerMessage = 'A report you worked on has been reopened by QA – Needs more work!';
    if (newStatus === 'merged') engineerMessage = 'A report you are assigned to has been merged with similar reports';
    if (newStatus === 'verified') engineerMessage = 'A report you fixed has been verified by QA – Well Done!';

    if (engineerMessage) {
      await sendNotification(after.assignedTo, engineerMessage);
    }
  }

  // Dispatcher notifications
  const dispatchers = await getUsersByRole('dispatcher');
  for (const dispatcherId of dispatchers) {
    let dispatcherMessage = '';
    if (newStatus === 'submitted') dispatcherMessage = 'New report submitted for triage';
    if (newStatus === 'in progress') dispatcherMessage = 'A report has started work';
    if (newStatus === 'resolved') dispatcherMessage = 'A report has been marked as resolved';
    if (newStatus === 'verified') dispatcherMessage = 'A report has been verified';
    if (newStatus === 'merged') dispatcherMessage = 'A report has been merged';

    if (dispatcherMessage) {
      await sendNotification(dispatcherId, dispatcherMessage);
    }
  }

  // QA notifications
  const qas = await getUsersByRole('qa');
  for (const qaId of qas) {
    let qaMessage = '';
    if (newStatus === 'resolved') qaMessage = 'New report awaiting quality verification';
    if (newStatus === 'merged') qaMessage = 'A merged report needs review';

    if (qaMessage) {
      await sendNotification(qaId, qaMessage);
    }
  }

  // Admin notifications (optional but added for oversight)
  const admins = await getUsersByRole('admin');
  for (const adminId of admins) {
    let adminMessage = '';
    if (newStatus === 'submitted') adminMessage = 'New report submitted';
    if (newStatus === 'verified') adminMessage = 'A report has been verified';
    if (newStatus === 'merged') adminMessage = 'A report has been merged';

    if (adminMessage) {
      await sendNotification(adminId, adminMessage);
    }
  }

  // Send all push notifications in batches
  if (messages.length > 0) {
    const chunks = expo.chunkPushNotifications(messages);
    for (const chunk of chunks) {
      await expo.sendPushNotificationsAsync(chunk);
    }
  }

  return null;
});