import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "react-hot-toast";
import { db } from "../../config/firebase";
import {
  collection,
  query,
  where,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  arrayUnion,
  arrayRemove,
  getDocs,
} from "firebase/firestore";
import { Course } from "../../types";

// --- Cloudinary upload function with 5MB limit ---
const uploadToCloudinary = async (file: File): Promise<string> => {
  if (file.size > 5 * 1024 * 1024) throw new Error("File size must be under 5MB");

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/upload`,
    { method: "POST", body: formData }
  );

  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || "Upload failed");
  return data.secure_url;
};

const CourseCatalog: React.FC = () => {
  const { currentUser } = useAuth();

  const [courses, setCourses] = useState<Course[]>([]);
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [enrolledCourses, setEnrolledCourses] = useState<Set<string>>(new Set());
  const [enrollingCourses, setEnrollingCourses] = useState<Set<string>>(new Set());

  const [showCreateCourseModal, setShowCreateCourseModal] = useState(false);
  const [newCourse, setNewCourse] = useState({
    name: "",
    instructor: "",
    schedule: [{ day: "Monday", startTime: "", endTime: "" }],
    location: "",
    capacity: 30,
    tags: [] as string[],
    endDate: "",
    imageUrl: "",
    fileUrl: "",
  });
  const [uploading, setUploading] = useState(false);

  // --- Fetch courses in real-time ---
  useEffect(() => {
    const coursesRef = collection(db, "courses");
    const unsubscribe = onSnapshot(coursesRef, (snapshot) => {
      const now = new Date();
      const data: Course[] = snapshot.docs.map(
        (doc) => ({ _id: doc.id, ...doc.data() } as Course)
      );
      const validCourses = data.filter(
        (course) => !course.endDate || new Date(course.endDate) >= now
      );
      setCourses(validCourses);
      setFilteredCourses(validCourses);
    });
    return () => unsubscribe();
  }, []);

  // --- Real-time listener for user's enrollments ---
  useEffect(() => {
    if (!currentUser) return;
    const q = query(collection(db, "enrollments"), where("uid", "==", currentUser.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ids = snapshot.docs.map((doc) => doc.data().courseId);
      setEnrolledCourses(new Set(ids));
    });
    return unsubscribe;
  }, [currentUser]);

  // --- Filter courses ---
  useEffect(() => {
    setFilteredCourses(
      courses.filter(
        (course) =>
          course.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          course.instructor.toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [searchTerm, courses]);

  // --- Enroll / Unenroll ---
  const toggleEnrollment = async (course: Course) => {
    if (!currentUser) return toast.error("Sign in to enroll");
    const isEnrolled = enrolledCourses.has(course._id);
    setEnrollingCourses((prev) => new Set(prev.add(course._id)));

    try {
      const courseRef = doc(db, "courses", course._id);
      const userRef = doc(db, "users", currentUser.uid);

      if (isEnrolled) {
        const enrollQuery = query(
          collection(db, "enrollments"),
          where("uid", "==", currentUser.uid),
          where("courseId", "==", course._id)
        );
        const snapshot = await getDocs(enrollQuery);
        for (const docSnap of snapshot.docs) {
          await deleteDoc(doc(db, "enrollments", docSnap.id));
        }

        await updateDoc(courseRef, { enrolled: Math.max((course.enrolled || 1) - 1, 0) });
        await updateDoc(userRef, {
          timetable: arrayRemove({
            courseId: course._id,
            courseName: course.name,
            day: course.schedule[0]?.day || "TBD",
            startTime: course.schedule[0]?.startTime || "TBD",
            endTime: course.schedule[0]?.endTime || "TBD",
            type: "lecture",
          }),
        });
        toast.success(`Unenrolled from ${course.name}`);
      } else {
        await addDoc(collection(db, "enrollments"), {
          uid: currentUser.uid,
          courseId: course._id,
          createdAt: new Date(),
        });
        await updateDoc(courseRef, { enrolled: (course.enrolled || 0) + 1 });
        await updateDoc(userRef, {
          timetable: arrayUnion({
            courseId: course._id,
            courseName: course.name,
            day: course.schedule[0]?.day || "TBD",
            startTime: course.schedule[0]?.startTime || "TBD",
            endTime: course.schedule[0]?.endTime || "TBD",
            type: "lecture",
          }),
        });
        toast.success(`Enrolled in ${course.name}!`);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to update enrollment");
    } finally {
      setEnrollingCourses((prev) => {
        const newSet = new Set(prev);
        newSet.delete(course._id);
        return newSet;
      });
    }
  };

  // --- Delete course ---
  const handleDeleteCourse = async (course: Course) => {
    if (!currentUser || currentUser.uid !== course.createdBy)
      return toast.error("Only the creator can delete this course");
    try {
      await deleteDoc(doc(db, "courses", course._id));
      toast.success(`${course.name} course deleted!`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete course");
    }
  };

  // --- Create course ---
  const handleCreateCourse = async () => {
    if (!currentUser) return toast.error("Sign in to create course");
    try {
      await addDoc(collection(db, "courses"), {
        ...newCourse,
        instructor: newCourse.instructor || currentUser.displayName,
        enrolled: 0,
        createdBy: currentUser.uid,
        createdAt: new Date(),
      });
      toast.success(`${newCourse.name} created!`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to create course");
    }
  };

  // --- Upload Image ---
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    try {
      setUploading(true);
      const url = await uploadToCloudinary(file);
      setNewCourse((prev) => ({ ...prev, imageUrl: url }));
      toast.success("Image uploaded!");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Image upload failed");
    } finally {
      setUploading(false);
    }
  };

  // --- Course Card ---
  const CourseCard: React.FC<{ course: Course }> = ({ course }) => {
    const isEnrolled = enrolledCourses.has(course._id);
    const isEnrolling = enrollingCourses.has(course._id);
    const isFull = course.enrolled >= course.capacity;
    const isCreator = currentUser?.uid === course.createdBy;

    return (
      <div className="card p-6 hover:shadow-md transition-all duration-300 relative">
        {/* Image visible to all users and clickable */}
        {course.imageUrl && (
          <a href={course.imageUrl} target="_blank" rel="noopener noreferrer">
            <img
              src={course.imageUrl}
              alt={course.name}
              className="w-full h-40 object-cover rounded mb-4"
            />
          </a>
        )}

        {course.fileUrl && (
          <a
            href={course.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline text-sm block mb-2"
          >
            {course.fileUrl.split("/").pop()}
          </a>
        )}

        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold">{course.name}</h3>
            <p className="text-sm text-gray-600">{course.instructor}</p>
          </div>
          <div className="flex gap-2">
            {isCreator && (
              <button
                onClick={() => handleDeleteCourse(course)}
                className="px-2 py-1 rounded bg-red-100 text-red-700"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => toggleEnrollment(course)}
              disabled={isEnrolling || isFull}
              className={`px-3 py-1 rounded ${
                isEnrolled
                  ? "bg-red-100 text-red-700"
                  : isFull
                  ? "bg-gray-200 text-gray-500"
                  : "bg-blue-600 text-white"
              }`}
            >
              {isEnrolling
                ? "Processing..."
                : isEnrolled
                ? "Unenroll"
                : isFull
                ? "Full"
                : "Enroll"}
            </button>
          </div>
        </div>

        <div className="mb-2">
          {course.schedule.map((s, idx) => (
            <div key={idx} className="text-sm text-gray-600">
              {s.day} {s.startTime}-{s.endTime} | {course.location}
            </div>
          ))}
        </div>
        {course.endDate && (
          <div className="mb-2 text-xs text-gray-400">
            Ends on: {new Date(course.endDate).toLocaleDateString()}
          </div>
        )}
        <div className="mb-2 text-sm text-gray-500">
          Enrolled: {course.enrolled}/{course.capacity}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Course Catalog</h1>
        <button
          className="btn-primary flex items-center space-x-2"
          onClick={() => setShowCreateCourseModal(true)}
        >
          <Plus className="w-4 h-4" />
          <span>Create Course</span>
        </button>
      </div>

      <input
        type="text"
        placeholder="Search courses..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full mb-6 p-2 border rounded"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredCourses.map((course) => (
          <CourseCard key={course._id} course={course} />
        ))}
      </div>

      {/* Create Course Modal */}
      {showCreateCourseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4">Create New Course</h2>

            {/* Course fields */}
            <input
              type="text"
              placeholder="Course Name"
              value={newCourse.name}
              onChange={(e) => setNewCourse({ ...newCourse, name: e.target.value })}
              className="w-full mb-2 p-2 border rounded"
            />
            <input
              type="text"
              placeholder="Instructor"
              value={newCourse.instructor}
              onChange={(e) => setNewCourse({ ...newCourse, instructor: e.target.value })}
              className="w-full mb-2 p-2 border rounded"
            />
            <input
              type="text"
              placeholder="Location"
              value={newCourse.location}
              onChange={(e) => setNewCourse({ ...newCourse, location: e.target.value })}
              className="w-full mb-2 p-2 border rounded"
            />
            <input
              type="number"
              placeholder="Capacity"
              value={newCourse.capacity}
              onChange={(e) => setNewCourse({ ...newCourse, capacity: Number(e.target.value) })}
              className="w-full mb-2 p-2 border rounded"
            />
            <input
              type="date"
              placeholder="End Date"
              value={newCourse.endDate}
              onChange={(e) => setNewCourse({ ...newCourse, endDate: e.target.value })}
              className="w-full mb-2 p-2 border rounded"
            />

            {/* Image Upload */}
            <div className="mb-2">
              <label className="block text-sm mb-1">Course Image</label>
              <input type="file" accept="image/*" onChange={handleImageUpload} className="w-full" />
              {uploading && <p className="text-sm text-gray-500 mt-1">Uploading...</p>}
              {newCourse.imageUrl && (
                <img src={newCourse.imageUrl} alt="preview" className="mt-2 w-full h-32 object-cover rounded" />
              )}
            </div>

            {/* File Link */}
            <div className="mb-2">
              <label className="block text-sm mb-1">Course File Link</label>
              <input
                type="url"
                placeholder="Paste a file link (e.g., Google Drive)"
                value={newCourse.fileUrl}
                onChange={(e) => setNewCourse({ ...newCourse, fileUrl: e.target.value })}
                className="w-full p-2 border rounded"
              />
              {newCourse.fileUrl && (
                <a
                  href={newCourse.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline text-sm block mt-2"
                >
                  {newCourse.fileUrl.split("/").pop()}
                </a>
              )}
            </div>

            {/* Schedule Section */}
            <div className="mb-2">
              <label className="block text-sm mb-1 font-semibold">Schedule</label>
              {newCourse.schedule.map((s, idx) => (
                <div key={idx} className="flex gap-2 mb-2">
                  <select
                    value={s.day}
                    onChange={(e) => {
                      const newSched = [...newCourse.schedule];
                      newSched[idx].day = e.target.value;
                      setNewCourse({ ...newCourse, schedule: newSched });
                    }}
                    className="border px-2 py-1 rounded flex-1"
                  >
                    {["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"].map(day => (
                      <option key={day} value={day}>{day}</option>
                    ))}
                  </select>
                  <input
                    type="time"
                    value={s.startTime}
                    onChange={(e) => {
                      const newSched = [...newCourse.schedule];
                      newSched[idx].startTime = e.target.value;
                      setNewCourse({ ...newCourse, schedule: newSched });
                    }}
                    className="border px-2 py-1 rounded flex-1"
                  />
                  <input
                    type="time"
                    value={s.endTime}
                    onChange={(e) => {
                      const newSched = [...newCourse.schedule];
                      newSched[idx].endTime = e.target.value;
                      setNewCourse({ ...newCourse, schedule: newSched });
                    }}
                    className="border px-2 py-1 rounded flex-1"
                  />
                  {newCourse.schedule.length > 1 && (
                    <button
                      type="button"
                      className="px-2 py-1 text-sm bg-red-200 rounded"
                      onClick={() => {
                        const newSched = [...newCourse.schedule];
                        newSched.splice(idx, 1);
                        setNewCourse({ ...newCourse, schedule: newSched });
                      }}
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                className="px-2 py-1 text-sm bg-gray-200 rounded"
                onClick={() =>
                  setNewCourse({
                    ...newCourse,
                    schedule: [...newCourse.schedule, { day: "Monday", startTime: "", endTime: "" }],
                  })
                }
              >
                + Add Schedule
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-2 mt-4">
              <button onClick={() => setShowCreateCourseModal(false)} className="px-4 py-2 bg-gray-200 rounded">
                Cancel
              </button>
              <button
                onClick={async () => {
                  await handleCreateCourse();
                  // Reset form but keep modal open for multiple courses
                  setNewCourse({
                    name: "",
                    instructor: "",
                    schedule: [{ day: "Monday", startTime: "", endTime: "" }],
                    location: "",
                    capacity: 30,
                    tags: [],
                    endDate: "",
                    imageUrl: "",
                    fileUrl: "",
                  });
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded"
              >
                Create & Add Another
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseCatalog;
