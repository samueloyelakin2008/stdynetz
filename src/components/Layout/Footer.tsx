import React from 'react';
import { MapPin, } from 'lucide-react';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">         

         
        </div>

        {/* Bottom Section */}
        <div className="border-t border-gray-800 mt-8 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-1 text-gray-400 text-sm mb-4 md:mb-0">
              <span>© {currentYear} StudyNet. Made by <b>Nodeminds</b></span>
            </div>
            <div className="flex items-center space-x-2 text-gray-400">
              <MapPin className="w-4 h-4" />
              <span className="text-sm">Designed For University Smart Education</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
