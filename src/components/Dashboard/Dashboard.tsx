import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { BookOpen, Users, Clock, Bell, Plus, Award, MessageCircle, X } from 'lucide-react';
import { db } from '../../config/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, getDoc } from 'firebase/firestore';
import { toast } from 'react-hot-toast';

interface Stats {
  enrolledCourses: number;
  studyGroups: number;
  upcomingClasses: number;
  totalCredits: number;
}

interface StudyGroup {
  id: string;
  name: string;
  description: string;
  members: any[];
  maxMembers: number;
  isPrivate?: boolean;
  meetingInfo?: { link: string };
  tags?: string[];
}

interface TimetableEntry {
  id: string;
  course: string;
  day: string;
  startTime: string;
  endTime: string;
  location?: string;
  instructor?: string;
}

const Dashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const [stats, setStats] = useState<Stats>({
    enrolledCourses: 0,
    studyGroups: 0,
    upcomingClasses: 0,
    totalCredits: 0
  });
  const [todayClasses, setTodayClasses] = useState<TimetableEntry[]>([]);
  const [studyGroups, setStudyGroups] = useState<StudyGroup[]>([]);

  // --- Chatbot State ---
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<{ sender: string; text: string }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  // --- Helper for online status ---
  const isOnline = (lastSeen: any) => {
    if (!lastSeen) return false;
    const diff = Date.now() - lastSeen.toMillis();
    return diff < 2 * 60 * 1000;
  };

  useEffect(() => {
    if (!currentUser) return;

    // Enrollments
    const enrollQ = query(collection(db, 'enrollments'), where('uid', '==', currentUser.uid));
    const unsubscribeEnroll = onSnapshot(enrollQ, async snapshot => {
      const enrollments = snapshot.docs.map(doc => doc.data());
      let totalCredits = 0;
      for (const e of enrollments) {
        try {
          const courseSnap = await getDoc(doc(db, 'courses', e.courseId));
          totalCredits += courseSnap.exists() ? courseSnap.data().credits || 3 : 3;
        } catch {
          totalCredits += 3;
        }
      }
      setStats(prev => ({ ...prev, enrolledCourses: enrollments.length, totalCredits }));
    });

    // Study Groups
    const groupsQ = collection(db, 'studyGroups');
    const unsubscribeGroups = onSnapshot(groupsQ, snapshot => {
      const groupsData: StudyGroup[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StudyGroup));
      setStudyGroups(groupsData);
      setStats(prev => ({
        ...prev,
        studyGroups: groupsData.filter(g => g.members.some(m => m.userId === currentUser.uid)).length
      }));
    });

    // Today’s Classes
    const timetableQ = query(collection(db, 'timetables'), where('uid', '==', currentUser.uid));
    const unsubscribeTimetable = onSnapshot(timetableQ, snapshot => {
      const allClasses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
      const filtered = allClasses.filter(c => c.day === today)
        .sort((a, b) => a.startTime.localeCompare(b.startTime));
      setTodayClasses(filtered);
      setStats(prev => ({ ...prev, upcomingClasses: filtered.length }));
    });

    return () => {
      unsubscribeEnroll();
      unsubscribeGroups();
      unsubscribeTimetable();
    };
  }, [currentUser]);

  // --- Join / Leave Group ---
  const handleJoinLeaveGroup = async (group: StudyGroup) => {
    if (!currentUser) return toast.error('Sign in to continue');
    const groupRef = doc(db, 'studyGroups', group.id);
    const isMember = group.members.some(m => m.userId === currentUser.uid);
    try {
      if (isMember) {
        await updateDoc(groupRef, { members: group.members.filter(m => m.userId !== currentUser.uid) });
        toast.success(`Left ${group.name}`);
      } else {
        if (group.members.length >= group.maxMembers) return toast.error('Group is full');
        const newMember = {
          userId: currentUser.uid,
          name: currentUser.displayName || 'Anonymous',
          role: 'member',
          joinedAt: new Date(),
          status: 'active',
          lastSeen: new Date()
        };
        await updateDoc(groupRef, { members: [...group.members, newMember] });
        toast.success(`Joined ${group.name}`);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to update group');
    }
  };

  // --- Chatbot Logic with academic context ---
  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMsg = { sender: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      // Build context
      const contextPrompt = `
You are StudyNet AI Assistant.
User: ${currentUser?.displayName || "Student"}.
Enrolled Courses: ${stats.enrolledCourses}.
Study Groups: ${stats.studyGroups}.
Upcoming Classes Today: ${todayClasses.map(c => `${c.course} at ${c.startTime}`).join(", ") || "None"}.
Total Credits: ${stats.totalCredits}.

If the question is academic, answer using this context. 
If not, answer as a general helpful assistant.

Question: ${input}
      `;

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${import.meta.env.VITE_GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: contextPrompt }] }]
          })
        }
      );

      const data = await res.json();
      const botText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I couldn’t process that.";
      setMessages(prev => [...prev, { sender: 'bot', text: botText }]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { sender: 'bot', text: "Error: Unable to reach Gemini AI." }]);
    }

    setLoading(false);
  };

  const StatCard: React.FC<{ title: string; value: number | string; icon: any; color: string }> = ({ title, value, icon: Icon, color }) => (
    <div className="p-6 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 bg-white border border-gray-100">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Welcome */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Welcome back, {currentUser?.displayName?.split(' ')[0]}! 👋</h1>
            <p className="text-gray-500 mt-1">Here’s what’s happening with your academic journey today.</p>
          </div>
          <div className="flex items-center space-x-3">
            <button className="flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded hover:bg-gray-200 transition">
              <Bell className="w-4 h-4"/> Notifications
            </button>
            <Link to="/courses" className="flex items-center gap-2 bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 transition">
              <Plus className="w-4 h-4"/> Register Course
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <StatCard title="Enrolled Courses" value={stats.enrolledCourses} icon={BookOpen} color="bg-blue-500"/>
          <StatCard title="Study Groups" value={stats.studyGroups} icon={Users} color="bg-purple-500"/>
          <StatCard title="Upcoming Classes" value={stats.upcomingClasses} icon={Clock} color="bg-green-500"/>
          <StatCard title="Total Credits" value={stats.totalCredits} icon={Award} color="bg-yellow-500"/>
        </div>
      </div>

      {/* Today's Classes */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Today's Classes</h2>
        {todayClasses.length === 0 ? <p className="text-gray-500">No classes today.</p> :
          todayClasses.map(cls => (
            <div key={cls.id} className="p-4 mb-2 rounded-md shadow-sm bg-white border-l-4 border-gray-300">
              <p className="font-semibold text-gray-900">{cls.course}</p>
              <p className="text-sm text-gray-600">{cls.startTime} - {cls.endTime} • {cls.location} • {cls.instructor}</p>
            </div>
          ))
        }
      </div>

      {/* Study Groups */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Study Groups</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {studyGroups.map(group => {
            const isMember = group.members.some(m => m.userId === currentUser?.uid);
            const membershipPercentage = (group.members.length / group.maxMembers) * 100;
            return (
              <div key={group.id} className="p-4 rounded-xl shadow-md hover:shadow-lg bg-white relative">
                <div className="flex justify-between mb-2">
                  <div>
                    <h3 className="font-semibold text-gray-900">{group.name}</h3>
                    <p className="text-xs text-gray-500">{group.description}</p>
                  </div>
                  <button
                    onClick={() => handleJoinLeaveGroup(group)}
                    className={`px-3 py-1.5 rounded text-sm font-medium ${isMember ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                  >
                    {isMember ? 'Leave' : 'Join'}
                  </button>
                </div>
                <div className="mb-2 w-full bg-gray-200 rounded-full h-2">
                  <div className={`h-2 rounded-full transition-all duration-300 ${membershipPercentage >= 90 ? 'bg-yellow-500' : membershipPercentage >= 70 ? 'bg-blue-500' : 'bg-purple-500'}`} style={{ width: `${membershipPercentage}%` }}></div>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  {group.members.map(m => (
                    <span key={m.userId} className="flex items-center gap-1">
                      <span className={`w-2 h-2 rounded-full ${isOnline(m.lastSeen) ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                      {m.name}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Floating Chatbot Button */}
      <button
        onClick={() => setChatOpen(!chatOpen)}
        className="fixed bottom-6 right-6 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition"
      >
        {chatOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </button>

      {/* Chat Window */}
      {chatOpen && (
        <div className="fixed bottom-20 right-6 w-80 bg-white shadow-xl rounded-xl border border-gray-200 flex flex-col">
          <div className="p-3 border-b font-semibold text-gray-800">AI Assistant 🤖</div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2 max-h-96">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`p-2 rounded-lg text-sm max-w-[80%] ${
                  msg.sender === 'user'
                    ? 'ml-auto bg-blue-600 text-white'
                    : 'mr-auto bg-gray-200 text-gray-800'
                }`}
              >
                {msg.text}
              </div>
            ))}
            {loading && <p className="text-xs text-gray-500">Thinking...</p>}
          </div>
          <div className="p-2 border-t flex items-center gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              placeholder="Ask me anything..."
              className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none"
            />
            <button
              onClick={sendMessage}
              disabled={loading}
              className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
