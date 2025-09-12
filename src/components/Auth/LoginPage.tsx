import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { BookOpen, Users, FileText, Zap, Shield } from 'lucide-react';

const LoginPage: React.FC = () => {
  const { signInWithGoogle, loading } = useAuth();
  const [isHovering, setIsHovering] = useState(false);

  const features = [
    {
      icon: BookOpen,
      title: 'Smart Course Registration',
      description: 'Intelligent course selection with conflict detection and personalized recommendations.',
    },
    {
      icon: Users,
      title: 'Study Group Matching',
      description: 'Connect with peers taking similar courses and form effective study groups.',
    },
    
    {
      icon: FileText,
      title: 'Resource Sharing',
      description: 'Upload and share study materials, notes, and assignments with your groups.',
    },
    {
      icon: Zap,
      title: 'Real-time Collaboration',
      description: 'Chat with study groups and get instant notifications about updates.',
    },
    {
      icon: Shield,
      title: 'Secure & Reliable',
      description: 'Enterprise-grade security with Google Authentication and encrypted data.',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50 flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Side - Branding and Info */}
          <div className="text-center lg:text-left">
            <div className="flex items-center justify-center lg:justify-start space-x-3 mb-8">
              <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center float">
                <BookOpen className="w-7 h-7 text-white" />
              </div>
              <h1 className="text-4xl font-bold text-gradient">StudyNet</h1>
            </div>
            
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-6 leading-tight">
              Smart Course Registration &
              <span className="block text-gradient">Study Network</span>
            </h2>
            
            <p className="text-xl text-gray-600 mb-8 leading-relaxed">
              Connect with peers, manage your academic journey, and collaborate 
              seamlessly in the most intelligent student platform.
            </p>

            {/* Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {features.slice(0, 4).map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={index}
                    className="flex items-start space-x-3 p-4 bg-white/60 backdrop-blur-sm rounded-xl border border-white/20 hover:bg-white/80 transition-all duration-300 animate-slide-up"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className="flex-shrink-0 w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                      <Icon className="w-5 h-5 text-primary-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 text-sm">{feature.title}</h3>
                      <p className="text-xs text-gray-600 mt-1">{feature.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Side - Login Form */}
          <div className="relative">
            <div className="card p-8 max-w-md mx-auto animate-scale-in">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Welcome Back!</h3>
                <p className="text-gray-600">Sign in to access your academic dashboard</p>
              </div>

              <button
                onClick={signInWithGoogle}
                disabled={loading}
                onMouseEnter={() => setIsHovering(true)}
                onMouseLeave={() => setIsHovering(false)}
                className={`w-full flex items-center justify-center space-x-3 px-6 py-4 border-2 border-gray-300 rounded-xl text-gray-700 font-semibold transition-all duration-300 hover:border-primary-300 hover:bg-primary-50 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${
                  isHovering ? 'transform -translate-y-1' : ''
                }`}
              >
                {loading ? (
                  <div className="w-5 h-5 spinner border-t-primary-600"></div>
                ) : (
                  <>
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        className="text-blue-500"
                      />
                      <path
                        fill="currentColor"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        className="text-green-500"
                      />
                      <path
                        fill="currentColor"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        className="text-yellow-500"
                      />
                      <path
                        fill="currentColor"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        className="text-red-500"
                      />
                    </svg>
                    <span>Continue with Google</span>
                  </>
                )}
              </button>

              <div className="mt-6 text-center text-sm text-gray-500">
                <p>By continuing, you agree to our</p>
                <div className="flex items-center justify-center space-x-1 mt-1">
                  <a href="/terms" className="text-primary-600 hover:text-primary-700 underline">
                    Terms of Service
                  </a>
                  <span>&</span>
                  <a href="/privacy" className="text-primary-600 hover:text-primary-700 underline">
                    Privacy Policy
                  </a>
                </div>
              </div>
            </div>

            {/* Decorative Elements */}
            <div className="absolute -top-4 -right-4 w-24 h-24 bg-gradient-secondary rounded-full opacity-20 blur-xl animate-pulse"></div>
            <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-gradient-accent rounded-full opacity-20 blur-xl animate-pulse" style={{ animationDelay: '1s' }}></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;