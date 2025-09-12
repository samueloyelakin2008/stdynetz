import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db, auth } from '../../config/firebase';
import { doc, deleteDoc, collection, getDocs, query, where, updateDoc } from 'firebase/firestore';
import { deleteUser } from 'firebase/auth';
import { toast } from 'react-hot-toast';

const Settings: React.FC = () => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);

  if (!currentUser) return <p>Please log in to access settings.</p>;

  // --- Clear all user data (but keep account) ---
  const handleClearData = async () => {
    const confirm = window.confirm(
      'Are you sure you want to clear your account data? This will remove your enrollments, timetable, and recent activity.'
    );
    if (!confirm) return;

    setLoading(true);
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      // Clear user-specific collections
      await updateDoc(userRef, {
        timetable: [],
        recentActivity: [],
      });

      // Delete enrollments
      const enrollQ = query(collection(db, 'enrollments'), where('uid', '==', currentUser.uid));
      const enrollSnapshot = await getDocs(enrollQ);
      for (const docSnap of enrollSnapshot.docs) {
        await deleteDoc(doc(db, 'enrollments', docSnap.id));
      }

      toast.success('Account data cleared successfully.');
    } catch (err) {
      console.error(err);
      toast.error('Failed to clear data.');
    } finally {
      setLoading(false);
    }
  };

  // --- Delete user completely ---
  const handleDeleteAccount = async () => {
    const confirm = window.confirm(
      'Are you sure you want to permanently delete your account? This action cannot be undone!'
    );
    if (!confirm) return;

    setLoading(true);
    try {
      // Delete Firestore user doc
      await deleteDoc(doc(db, 'users', currentUser.uid));

      // Delete enrollments
      const enrollQ = query(collection(db, 'enrollments'), where('uid', '==', currentUser.uid));
      const enrollSnapshot = await getDocs(enrollQ);
      for (const docSnap of enrollSnapshot.docs) {
        await deleteDoc(doc(db, 'enrollments', docSnap.id));
      }

      // Optionally: remove user from study groups
      const groupsSnapshot = await getDocs(collection(db, 'studyGroups'));
      for (const groupDoc of groupsSnapshot.docs) {
        const group = groupDoc.data();
        if (group.members?.some((m: any) => m.userId === currentUser.uid)) {
          await updateDoc(doc(db, 'studyGroups', groupDoc.id), {
            members: group.members.filter((m: any) => m.userId !== currentUser.uid),
          });
        }
      }

      // Delete Auth user
      await deleteUser(currentUser);

      toast.success('Account deleted successfully.');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to delete account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Settings</h1>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Account Management</h2>
        <p className="text-gray-600 mb-4">
          Clear all your personal data or permanently delete your account.
        </p>
        <div className="flex gap-4">
          <button
            onClick={handleClearData}
            disabled={loading}
            className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition"
          >
            Clear Account Data
          </button>
          <button
            onClick={handleDeleteAccount}
            disabled={loading}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition"
          >
            Delete Account
          </button>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-2">Profile Info</h2>
        <p className="text-gray-600 mb-4">Update your display name or email in your profile page.</p>
      </section>
    </div>
  );
};

export default Settings;
