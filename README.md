# StudyNet - Smart Course Registration & Study Network

A comprehensive web application that allows students to register for courses, generate personalized timetables, find study groups, and collaborate with peers through file sharing and chat functionality.
## 👥 Team Members

- [@samueloyelakin2008](https://github.com/samueloyelakin2008)  
- [@opeyemi867](https://github.com/opeyemi867)
-  [@Testip01](https://github.com/Testip01)  

---

## 🚀 Features

### Core Functionality
- **Firebase Authentication**: Secure Google Sign-in integration
- **Course Registration**: Dynamic course selection with conflict detection
- **Smart Timetabling**: Auto-generated personalized timetables
- **Study Group Matching**: Connect with peers taking similar courses
- **Real-time Chat**: Firebase-powered group communication
- **File Sharing**: Cloudinary integration for resource management
- **Google Calendar Sync**: Export timetables and sync with Google Calendar
- **PDF Export**: Download timetables as PDF documents

### Technical Features
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Real-time Updates**: Firebase Realtime Database integration
- **Progressive Web App**: Optimized for all devices
- **Advanced Animations**: Smooth transitions and micro-interactions
- **Type Safety**: Full TypeScript implementation

## 🛠 Tech Stack

### Frontend
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **Framer Motion** for animations
- **React Router** for navigation
- **React Hot Toast** for notifications

### Backend & Services
- **Firebase Authentication** (Google Sign-in only)
- **Firebase Realtime Database** for chat
- **Firebase Storage** as backup file storage
- **Cloudinary** for primary file storage
- **Google Apps Script** for email notifications
- **Google Calendar API** for timetable sync

### Development Tools
- **Vite** for build tooling
- **ESLint** for code quality
- **TypeScript** for type safety
- **PostCSS** with Autoprefixer



## 📱 Key Components

### Authentication
- **Google Sign-in Only**: Streamlined authentication flow
- **User Profile Management**: Automatic profile creation and management
- **Session Persistence**: Secure session handling with Firebase

### Course Management
- **Dynamic Course Catalog**: Real-time course availability
- **Intelligent Registration**: Conflict detection and prerequisites checking
- **Enrollment Tracking**: Real-time capacity monitoring

### Timetable System
- **Auto-generation**: Smart timetable creation from registered courses
- **Conflict Resolution**: Visual conflict indicators and resolution suggestions
- **Multiple Views**: Grid and list view options
- **Export Options**: PDF download and Google Calendar sync

### Study Groups
- **Smart Matching**: Algorithm-based peer matching by courses
- **Group Management**: Create, join, and manage study groups
- **Real-time Chat**: Firebase-powered group communication
- **Resource Sharing**: File upload and sharing capabilities


## 🔒 Security Features

- **Firebase Security Rules**: Database access control
- **Authentication Required**: All routes protected
- **Input Validation**: Client and server-side validation
- **CORS Configuration**: Proper cross-origin setup
- **Environment Variables**: Secure credential management
