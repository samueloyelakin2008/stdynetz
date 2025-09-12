import React, { useState, useEffect } from "react";
import { Calendar, Clock, Plus, Trash2 } from "lucide-react";
import { toast } from "react-hot-toast";
import { collection, getDocs, addDoc, query, where, doc, deleteDoc, onSnapshot } from "firebase/firestore";
import { db } from "../../config/firebase";
import { useAuth } from "../../contexts/AuthContext";

const Timetable = () => {
  const { currentUser } = useAuth();
  const [timetable, setTimetable] = useState<any[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEntry, setNewEntry] = useState({ course: "", time: "", location: "", instructor: "" });

  // Real-time listener for timetable
  useEffect(() => {
    if (!currentUser) return;
    const q = query(collection(db, "timetables"), where("uid", "==", currentUser.uid));
    const unsubscribe = onSnapshot(q, snapshot => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTimetable(data);
    });
    return unsubscribe;
  }, [currentUser]);

  // Add custom timetable entry
  const handleAddEntry = async () => {
    if (!currentUser) return toast.error("Sign in to add classes");
    const { course, time } = newEntry;
    if (!course || !time) return toast.error("Course name and time are required");

    try {
      const docRef = await addDoc(collection(db, "timetables"), {
        uid: currentUser.uid,
        ...newEntry,
        createdAt: new Date(),
      });
      setNewEntry({ course: "", time: "", location: "", instructor: "" });
      setShowAddForm(false);
      toast.success("Class added!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to add class");
    }
  };

  // Remove timetable entry
  const handleRemove = async (id: string) => {
    if (!currentUser) return;
    try {
      await deleteDoc(doc(db, "timetables", id));
      toast.success("Class removed");
    } catch (err) {
      console.error(err);
      toast.error("Failed to remove class");
    }
  };

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Calendar className="w-5 h-5" /> Timetable
        </h2>
        <button
          onClick={() => setShowAddForm(true)}
          className="px-3 py-1.5 bg-blue-600 text-white rounded flex items-center gap-1"
        >
          <Plus className="w-4 h-4" /> Add Class
        </button>
      </div>

      {/* Add Class Form */}
      {showAddForm && (
        <div className="card p-4 mb-4 border rounded-lg space-y-3">
          <input
            type="text"
            placeholder="Course Name"
            value={newEntry.course}
            onChange={e => setNewEntry({ ...newEntry, course: e.target.value })}
            className="w-full border px-3 py-2 rounded"
          />
          <input
            type="text"
            placeholder="Time (e.g., 10:00 - 11:00)"
            value={newEntry.time}
            onChange={e => setNewEntry({ ...newEntry, time: e.target.value })}
            className="w-full border px-3 py-2 rounded"
          />
          <input
            type="text"
            placeholder="Location"
            value={newEntry.location}
            onChange={e => setNewEntry({ ...newEntry, location: e.target.value })}
            className="w-full border px-3 py-2 rounded"
          />
          <input
            type="text"
            placeholder="Instructor"
            value={newEntry.instructor}
            onChange={e => setNewEntry({ ...newEntry, instructor: e.target.value })}
            className="w-full border px-3 py-2 rounded"
          />
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowAddForm(false)} className="px-3 py-1.5 bg-gray-200 rounded">Cancel</button>
            <button onClick={handleAddEntry} className="px-3 py-1.5 bg-blue-600 text-white rounded">Add</button>
          </div>
        </div>
      )}

      {/* Timetable Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {timetable.length === 0 && <p className="text-gray-500 col-span-full">No classes yet. Add a class to get started.</p>}
        {timetable.map(item => (
          <div key={item.id} className="p-4 border rounded-lg flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-blue-600" />
              <div>
                <p className="font-medium">{item.time}</p>
                <p className="text-sm text-gray-600">{item.course}</p>
                <p className="text-xs text-gray-500">{item.location} • {item.instructor}</p>
              </div>
            </div>
            <button onClick={() => handleRemove(item.id)} className="p-1 rounded bg-red-100 hover:bg-red-200">
              <Trash2 className="w-4 h-4 text-red-600" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Timetable;
