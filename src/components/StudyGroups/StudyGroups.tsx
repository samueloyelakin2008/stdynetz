import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Search, Plus, Star, Lock, Globe, Crown, Trash2, X } from 'lucide-react';
import { StudyGroup } from '../../types';
import { toast } from 'react-hot-toast';
import { db } from '../../config/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';

const StudyGroups: React.FC = () => {
  const { currentUser } = useAuth();
  const [groups, setGroups] = useState<StudyGroup[]>([]);
  const [filteredGroups, setFilteredGroups] = useState<StudyGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'joined' | 'available'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form states for creating group
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [maxMembers, setMaxMembers] = useState(10);
  const [tags, setTags] = useState('');
  const [sessionLink, setSessionLink] = useState('');

  // Fetch groups
  const fetchGroups = async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, 'studyGroups'));
      const data: StudyGroup[] = snapshot.docs.map(doc => ({ _id: doc.id, ...doc.data() } as StudyGroup));
      setGroups(data);
      setFilteredGroups(data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load groups');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchGroups(); }, []);

  // Filter groups
  useEffect(() => {
    const filtered = groups.filter(group => {
      const matchesSearch =
        group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        group.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        group.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));

      const isMember = group.members.some(m => m.userId === currentUser?.uid);
      if (selectedFilter === 'joined') return matchesSearch && isMember;
      if (selectedFilter === 'available') return matchesSearch && !isMember && group.members.length < group.maxMembers;
      return matchesSearch;
    });
    setFilteredGroups(filtered);
  }, [searchTerm, selectedFilter, groups, currentUser]);

  // Join group
  const handleJoinGroup = async (group: StudyGroup) => {
    if (!currentUser) return toast.error('Sign in to join groups');
    const newMember = {
      userId: currentUser.uid,
      name: currentUser.displayName || 'Anonymous',
      role: 'member',
      joinedAt: new Date(),
      status: 'active',
    };
    try {
      const groupRef = doc(db, 'studyGroups', group._id);
      await updateDoc(groupRef, { members: [...group.members, newMember] });
      setGroups(prev => prev.map(g => g._id === group._id ? { ...g, members: [...g.members, newMember] } : g));
      toast.success(`Joined ${group.name}! 🎉`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to join group');
    }
  };

  // Remove group
  const handleRemoveGroup = async (group: StudyGroup) => {
    if (!currentUser) return;
    const isAdmin = group.members.some(m => m.userId === currentUser.uid && m.role === 'admin');
    if (!isAdmin) return toast.error('Only admins can delete the group');

    try {
      await deleteDoc(doc(db, 'studyGroups', group._id));
      setGroups(prev => prev.filter(g => g._id !== group._id));
      toast.success('Group removed');
    } catch (err) {
      console.error(err);
      toast.error('Failed to remove group');
    }
  };

  // Create new group
  const handleCreateGroup = async () => {
    if (!currentUser) return toast.error('Sign in to create a group');
    if (!groupName) return toast.error('Group name is required');

    const newGroup: StudyGroup = {
      name: groupName,
      description: groupDescription,
      isPrivate,
      maxMembers,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      members: [{
        userId: currentUser.uid,
        name: currentUser.displayName || 'Anonymous',
        role: 'admin',
        joinedAt: new Date(),
        status: 'active',
      }],
      meetingInfo: sessionLink ? { link: sessionLink } : undefined,
    };

    try {
      await addDoc(collection(db, 'studyGroups'), newGroup);
      toast.success('Group created!');
      setShowCreateModal(false);
      setGroupName('');
      setGroupDescription('');
      setIsPrivate(false);
      setMaxMembers(10);
      setTags('');
      setSessionLink('');
      fetchGroups();
    } catch (err) {
      console.error(err);
      toast.error('Failed to create group');
    }
  };

  const StudyGroupCard: React.FC<{ group: StudyGroup }> = ({ group }) => {
    const isMember = group.members.some(m => m.userId === currentUser?.uid);
    const isAdmin = group.members.some(m => m.userId === currentUser?.uid && m.role === 'admin');
    const isFull = group.members.length >= group.maxMembers;
    const membershipPercentage = (group.members.length / group.maxMembers) * 100;

    return (
      <div className="card p-6 hover:shadow-md transition-all duration-300 relative">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              {group.isPrivate ? <Lock className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
              {isAdmin && <Crown className="w-3 h-3" />}
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">{group.name}</h3>
            <p className="text-gray-600 text-sm mb-3 line-clamp-2">{group.description}</p>
          </div>

          {!isMember && (
            <button onClick={() => handleJoinGroup(group)} disabled={isFull} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${isFull ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'btn-primary hover:shadow-md'}`}>
              <Plus className="w-4 h-4" /> <span>{isFull ? 'Full' : 'Join'}</span>
            </button>
          )}
          {isAdmin && (
            <button onClick={() => handleRemoveGroup(group)} className="absolute top-2 right-2 p-1 rounded bg-red-100 hover:bg-red-200">
              <Trash2 className="w-4 h-4 text-red-600" />
            </button>
          )}
        </div>

        {/* Members with online/offline */}
        <div className="mb-2">
          {group.members.map(member => (
            <span key={member.userId} className={`text-xs ${member.status === 'active' ? 'text-green-600' : 'text-gray-500'}`}>
              {member.name} • {member.status === 'active' ? 'Online' : 'Offline'}
            </span>
          ))}
        </div>

        {/* Meeting link */}
        {group.meetingInfo?.link && (
          <a href={group.meetingInfo.link} target="_blank" rel="noreferrer" className="text-blue-600 underline text-xs">
            Join Session
          </a>
        )}

        {/* Progress bar */}
        <div className="mb-3 w-full bg-gray-200 rounded-full h-2">
          <div className={`h-2 rounded-full transition-all duration-300 ${membershipPercentage >= 90 ? 'bg-warning-500' : membershipPercentage >= 70 ? 'bg-primary-500' : 'bg-secondary-500'}`} style={{ width: `${membershipPercentage}%` }}></div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1">
          {group.tags.map(tag => <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">#{tag}</span>)}
        </div>
      </div>
    );
  };

  if (loading) return <p className="text-center py-12">Loading study groups...</p>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Study Groups</h1>
          <p className="text-gray-600">Connect with peers, see who is online, and join sessions.</p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> <span>Create Group</span>
        </button>
      </div>

      {/* Search & filter */}
      <div className="card p-6 mb-8 flex flex-col lg:flex-row lg:items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input type="text" placeholder="Search study groups..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"/>
        </div>
        <div className="flex items-center gap-2">
          {['all','joined','available'].map(key => (
            <button key={key} onClick={() => setSelectedFilter(key as any)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${selectedFilter === key ? 'bg-primary-100 text-primary-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`}>
              {key === 'joined' ? <Star className="w-4 h-4"/> : <Plus className="w-4 h-4"/>}
              <span>{key==='all'?'All Groups': key==='joined'?'My Groups':'Available'}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Groups Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredGroups.map(group => <StudyGroupCard key={group._id} group={group} />)}
      </div>

      {/* Create Group Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-md p-6 relative">
            <button onClick={() => setShowCreateModal(false)} className="absolute top-3 right-3 p-1 rounded hover:bg-gray-200"><X className="w-4 h-4" /></button>
            <h2 className="text-xl font-bold mb-4">Create New Group</h2>
            <input type="text" placeholder="Group Name" value={groupName} onChange={e => setGroupName(e.target.value)} className="w-full mb-2 px-3 py-2 border rounded"/>
            <textarea placeholder="Description" value={groupDescription} onChange={e => setGroupDescription(e.target.value)} className="w-full mb-2 px-3 py-2 border rounded"/>
            <div className="flex items-center mb-2">
              <label className="mr-2 text-sm">Private:</label>
              <input type="checkbox" checked={isPrivate} onChange={e => setIsPrivate(e.target.checked)} />
            </div>
            <div className="mb-2">
              <label className="mr-2 text-sm">Max Members:</label>
              <input type="number" value={maxMembers} min={1} onChange={e => setMaxMembers(Number(e.target.value))} className="w-16 border px-2 py-1 rounded"/>
            </div>
            <input type="text" placeholder="Tags (comma separated)" value={tags} onChange={e => setTags(e.target.value)} className="w-full mb-2 px-3 py-2 border rounded"/>
            <input type="text" placeholder="Session Link (optional)" value={sessionLink} onChange={e => setSessionLink(e.target.value)} className="w-full mb-4 px-3 py-2 border rounded"/>
            <button onClick={handleCreateGroup} className="w-full bg-primary-600 text-white py-2 rounded hover:bg-primary-700">Create Group</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudyGroups;
