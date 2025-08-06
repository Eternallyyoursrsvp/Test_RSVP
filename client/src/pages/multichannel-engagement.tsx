import React from 'react';

interface MultiChannelSectionProps {
  id: string;
  innerRef: React.RefObject<HTMLElement>;
}

export default function MultiChannelSection({ id, innerRef }: MultiChannelSectionProps) {
  return (
    <section 
      id={id} 
      ref={innerRef as React.RefObject<HTMLDivElement>}
      className="relative py-24 bg-[#C5A6ED]"
    >
      <div className="container mx-auto px-6">
        <h2 className="text-center mb-10">
          <span className="text-[#5E239D] font-serif text-3xl md:text-4xl font-bold">Multichannel Guest Engagement</span>
        </h2>
        
        <p className="text-[#5E239D] text-center max-w-2xl mx-auto mb-12">
          Keep your guests informed and engaged through personalized WhatsApp messages
          and email communications.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
          {/* WhatsApp Integration Card */}
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h4 className="font-medium text-[#5E239D]">WhatsApp Integration</h4>
            </div>
            <p className="text-sm text-[#5E239D]/70 pl-12">Send updates, collect RSVPs, and answer questions through WhatsApp</p>
          </div>
          
          {/* Beautiful Email Templates Card */}
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h4 className="font-medium text-[#5E239D]">Beautiful Email Templates</h4>
            </div>
            <p className="text-sm text-[#5E239D]/70 pl-12">Send elegant, branded emails for invitations and updates</p>
          </div>
          
          {/* Automated Reminders Card */}
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center text-white">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h4 className="font-medium text-[#5E239D]">Automated Reminders</h4>
            </div>
            <p className="text-sm text-[#5E239D]/70 pl-12">Schedule timely reminders for transportation and events</p>
          </div>
          
          {/* Dynamic Follow-Ups Card */}
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-cyan-500 flex items-center justify-center text-white">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                </svg>
              </div>
              <h4 className="font-medium text-[#5E239D]">Dynamic Follow-Ups</h4>
            </div>
            <p className="text-sm text-[#5E239D]/70 pl-12">Personalized follow-up based on guest responses</p>
          </div>
        </div>
        
        {/* Message Input Demo */}
        <div className="max-w-md mx-auto mt-16 bg-white rounded-lg overflow-hidden shadow-md">
          <div className="p-4 flex items-center gap-2">
            <input 
              type="text" 
              placeholder="Type a message..." 
              className="flex-grow bg-gray-100 rounded-full py-2 px-4 focus:outline-none text-sm"
            />
            <button className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
