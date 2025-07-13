
import { useState, useEffect } from 'react';
import Navigation from '@/components/ui/navigation';
import ChatInput from '@/components/therapy/ChatInput';
import ReflectiveCheckIn from '@/components/therapy/ReflectiveCheckIn';
import SpotifyIntegration from '@/components/therapy/SpotifyIntegration';
import TherapySidebar from '@/components/therapy/TherapySidebar';
import ChatScrollArea from '@/components/therapy/ChatScrollArea';
import MobileModeSelector from '@/components/therapy/MobileModeSelector';
import { useAuth } from '@/contexts/AuthContext';
import { useTherapySessions, TherapySession } from '@/hooks/useTherapySessions';
import { useUserStats } from '@/hooks/useUserStats';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

type TherapyMode = 'reflect' | 'recover' | 'rebuild' | 'evolve';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  images?: string[];
  mode?: string;
  isTransition?: boolean;
}

const Therapy = () => {
  const { user, isPremium } = useAuth();
  const isMobile = useIsMobile();
  
  // Disabled Supabase hooks - keep for UI compatibility
  const stats = { messagesUsedToday: 0, remainingMessages: 50, totalSessions: 0, isPremium: false };
  const sessions = [];
  const currentSession = null;
  
  const [selectedMode, setSelectedMode] = useState<TherapyMode>('evolve');
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentDetectedMode, setCurrentDetectedMode] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [showReflectiveCheckIn, setShowReflectiveCheckIn] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const modes = [
    {
      id: 'reflect' as TherapyMode,
      name: 'Reflect',
      icon: '🟣',
      color: 'from-purple-500 to-purple-600',
      borderColor: 'border-purple-500',
      bgColor: 'bg-purple-500/10',
      glowColor: 'shadow-purple-500/30',
      pulseColor: 'bg-purple-400/10',
      description: 'Process your thoughts and emotions with gentle guidance'
    },
    {
      id: 'recover' as TherapyMode,
      name: 'Recover',
      icon: '🔵',
      color: 'from-blue-500 to-blue-600',
      borderColor: 'border-blue-500',
      bgColor: 'bg-blue-500/10',
      glowColor: 'shadow-blue-500/30',
      pulseColor: 'bg-blue-400/10',
      description: 'Heal from trauma and difficult experiences'
    },
    {
      id: 'rebuild' as TherapyMode,
      name: 'Rebuild',
      icon: '🟢',
      color: 'from-green-500 to-green-600',
      borderColor: 'border-green-500',
      bgColor: 'bg-green-500/10',
      glowColor: 'shadow-green-500/30',
      pulseColor: 'bg-green-400/10',
      description: 'Reconstruct your sense of self and relationships'
    },
    {
      id: 'evolve' as TherapyMode,
      name: 'Evolve',
      icon: '🟡',
      color: 'from-yellow-500 to-orange-500',
      borderColor: 'border-yellow-500',
      bgColor: 'bg-yellow-500/10',
      glowColor: 'shadow-yellow-500/30',
      pulseColor: 'bg-gradient-to-r from-yellow-400/10 to-orange-400/10',
      description: 'Grow beyond your current limitations'
    }
  ];

  const modeToBackgroundImage = {
    reflect: '/lovable-uploads/a3872cd3-caf3-42ac-99bb-15e21499e310.png',
    recover: '/lovable-uploads/4e0d3477-805c-4e57-b52c-82fe4a8d1c4f.png',
    rebuild: '/lovable-uploads/07533b71-b782-4088-844e-83d3b08837e7.png',
    evolve: '/lovable-uploads/63bfd61c-32c7-4ddb-aa9a-6c5a6d885cc6.png'
  };

  // Disabled session loading - keep for UI compatibility
  useEffect(() => {
    // Keep messages empty for fresh start
    setMessages([]);
  }, []);

  const handleSessionSelect = (session: any) => {
    // Disabled - keep for UI compatibility
    console.log('🎯 Session selection disabled');
    setIsMobileSidebarOpen(false);
  };

  const handleModeSelect = async (mode: TherapyMode) => {
    console.log('🎛️ Mode selected:', mode);
    setSelectedMode(mode);
    // Clear messages for fresh start with new mode
    setMessages([]);
  };

  const handleSendMessage = async () => {
    console.log('🚀 handleSendMessage called');
    
    if (!inputText?.trim()) {
      console.log('❌ Empty input text, returning early');
      return;
    }

    const userInput = inputText.trim();
    console.log('📤 Processing user input:', userInput.substring(0, 50) + '...');

    // Clear input and set loading state
    setInputText('');
    setIsLoading(true);

    // Add user message to UI immediately
    const userMessage: Message = {
      id: Date.now().toString(),
      text: userInput,
      isUser: true,
      timestamp: new Date()
    };
    
    setMessages(prevMessages => [...prevMessages, userMessage]);

    try {
      // Prepare conversation history for mode detection
      const conversationHistory = messages.map(msg => ({
        role: msg.isUser ? 'user' : 'assistant',
        content: msg.text
      }));

      console.log('🚀 Sending message to /api/chat with mode detection');
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userInput,
          conversationHistory,
          previousMode: currentDetectedMode
        })
      });

      console.log('📡 Chat API response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ AI response received:', { 
        mode: data.mode, 
        modeChanged: data.modeChanged,
        hasTransition: !!data.transitionMessage 
      });
      
      if (!data.reply) {
        throw new Error('Invalid AI response - missing reply field');
      }

      // Update current detected mode
      if (data.mode) {
        setCurrentDetectedMode(data.mode);
      }

      // Add transition message if mode changed
      if (data.modeChanged && data.transitionMessage) {
        const transitionMessage: Message = {
          id: `transition-${Date.now()}`,
          text: data.transitionMessage,
          isUser: false,
          timestamp: new Date(),
          isTransition: true,
          mode: data.mode
        };
        
        setMessages(prevMessages => [...prevMessages, transitionMessage]);
        
        // Small delay before showing AI response for better UX
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: data.reply,
        isUser: false,
        timestamp: new Date(),
        mode: data.mode
      };
      
      setMessages(prevMessages => [...prevMessages, aiResponse]);
      console.log('✅ Message exchange completed successfully');
      
    } catch (error) {
      console.error('❌ Error in handleSendMessage:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error('Failed to get AI response: ' + errorMessage);
      
      // Remove user message from UI on error
      setMessages(prevMessages => prevMessages.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  const selectedModeData = modes.find(mode => mode.id === selectedMode);

  // Disable auth requirement - allow anonymous usage for now

  return (
    <div className="min-h-screen relative overflow-hidden smooth-scroll">
      {/* Background with Evolve Mode Effects for Mobile */}
      <div 
        className="absolute inset-0 w-full h-full z-[-10] transition-all duration-700 ease-in-out"
        style={{
          backgroundImage: `url('${modeToBackgroundImage[isMobile ? 'evolve' : selectedMode]}')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          filter: isMobile ? 'brightness(0.4) contrast(1.2)' : 'brightness(0.8)'
        }}
      />
      
      {/* Enhanced Mobile Overlay with Stable Glassmorphism */}
      {isMobile ? (
        <>
          <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-purple-900/30 to-blue-900/50 backdrop-blur-[2px] z-[-5]" />
          <div className="absolute inset-0 z-[-4] opacity-10 bg-gradient-to-r from-yellow-400/10 via-purple-400/10 to-blue-400/10" />
        </>
      ) : (
        <>
          <div className="absolute inset-0 bg-black/50 z-[-5]" />
          <div className={`absolute inset-0 z-[-4] opacity-20 transition-all duration-1000 ${selectedModeData?.pulseColor || ''}`} />
        </>
      )}
      
      {/* Desktop Sidebar - Hidden on Mobile */}
      {!isMobile && (
        <div className="hidden lg:block">
          <TherapySidebar 
            onSessionSelect={handleSessionSelect}
            currentSessionId={currentSession?.id}
          />
        </div>
      )}

      {/* Mobile Sidebar Toggle - Only show if not in full-screen chat mode */}
      {isMobile && messages.length === 0 && (
        <Button
          onClick={() => setIsMobileSidebarOpen(true)}
          className="fixed top-6 left-4 z-40 w-12 h-12 rounded-full glass-effect border border-white/20 backdrop-blur-xl bg-black/20 text-white hover:bg-black/30 transition-all duration-200 shadow-lg"
        >
          <Menu size={20} />
        </Button>
      )}

      {/* Mobile Sidebar Overlay */}
      {isMobile && isMobileSidebarOpen && (
        <>
          <div 
            className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
          <div className="fixed left-0 top-0 h-full w-80 z-50 glass-effect border-r border-white/20 backdrop-blur-xl bg-black/30 animate-slide-in-right">
            <div className="p-4 border-b border-white/20 flex items-center justify-between min-h-[64px]">
              <h2 className="text-white font-semibold text-lg">Sessions</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMobileSidebarOpen(false)}
                className="text-white/80 hover:text-white hover:bg-white/10 w-9 h-9 rounded-full transition-all duration-200 hover:scale-110"
              >
                <X size={18} />
              </Button>
            </div>
            <div className="h-[calc(100%-64px)] overflow-hidden">
              <TherapySidebar 
                onSessionSelect={handleSessionSelect}
                currentSessionId={currentSession?.id}
              />
            </div>
          </div>
        </>
      )}
      
      {/* Main Content */}
      <div className={`${!isMobile ? 'lg:ml-80' : ''} transition-all duration-300 min-h-screen flex flex-col smooth-scroll`}>
        {/* Navigation - Desktop only */}
        {!isMobile && (
          <div className="hidden lg:block">
            <Navigation />
          </div>
        )}
        
        {/* Mobile Top Bar - Simplified */}
        {isMobile && (
          <div className="fixed top-0 left-0 right-0 z-30 glass-effect border-b border-white/10 backdrop-blur-xl bg-black/20">
            <div className="flex items-center justify-between px-6 py-4">
              <div className="w-8" />
              <h1 className="text-lg font-bold text-white truncate flex-1 text-center">
                Evolve Mode
              </h1>
              <SpotifyIntegration mode="evolve" />
            </div>
          </div>
        )}
        
        {/* Premium Check-In - Desktop only */}
        {!isMobile && isPremium && showReflectiveCheckIn && (
          <ReflectiveCheckIn onClose={() => setShowReflectiveCheckIn(false)} />
        )}
        
        <div className={`flex-1 flex flex-col ${isMobile ? 'pt-20' : ''} relative`}>
          {/* Desktop Container */}
          <div className={`${isMobile ? 'px-0' : 'max-w-7xl mx-auto w-full px-8 py-8 2xl:max-w-[1400px]'} flex-1 flex flex-col`}>
            {/* Premium Status Banner - Desktop only */}
            {!isMobile && isPremium && (
              <div className="mb-8 glass-effect border border-yellow-500/30 rounded-xl p-6">
                <div className="flex items-center space-x-3">
                  <span className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black text-sm px-4 py-2 rounded-full font-semibold">
                    PRO
                  </span>
                  <span className="text-white font-medium text-lg">Premium Active</span>
                  <span className="text-white/80">- 300 messages & 25 uploads per day</span>
                </div>
              </div>
            )}

            {/* Mode Selector - Desktop Only */}
            {!isMobile && (
              <div className="mb-10">
                <div className="flex items-center justify-between mb-8">
                  <h1 className="text-3xl font-bold text-white">
                    {currentSession ? `Therapy Session: ${currentSession.title}` : 'Choose your therapy mode'}
                  </h1>
                  <SpotifyIntegration mode={selectedMode} />
                </div>
                
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  {modes.map((mode) => (
                    <button
                      key={mode.id}
                      onClick={() => handleModeSelect(mode.id)}
                      className={`p-6 rounded-xl border transition-all duration-300 backdrop-blur-sm hover:scale-105 ${
                        selectedMode === mode.id
                          ? `${mode.borderColor} ${mode.bgColor} shadow-xl border-opacity-90`
                          : 'border-white/30 hover:border-white/50 glass-effect'
                      }`}
                    >
                      <div className="text-3xl mb-3">{mode.icon}</div>
                      <div className="font-semibold text-white text-lg">{mode.name}</div>
                      <div className="text-sm text-white/80 mt-2">{mode.description}</div>
                    </button>
                  ))}
                </div>

                {selectedModeData && (
                  <div className={`p-6 rounded-xl border backdrop-blur-sm ${selectedModeData.borderColor} ${selectedModeData.bgColor} mb-8 border-opacity-70 shadow-lg`}>
                    <div className="flex items-center space-x-4">
                      <span className="text-3xl">{selectedModeData.icon}</span>
                      <div>
                        <h3 className="font-semibold text-white text-xl">{selectedModeData.name} Mode</h3>
                        <p className="text-white/80 mt-1">{selectedModeData.description}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}


            {/* Chat Area */}
            <div className={`${isMobile 
              ? 'rounded-none border-0 bg-black/5 backdrop-blur-md flex-1 flex flex-col pb-24' 
              : 'glass-effect rounded-xl border border-white/30 backdrop-blur-md flex-1 flex flex-col p-8 mb-8 shadow-2xl'
            }`}>
              <ChatScrollArea messages={messages} isMobile={isMobile}>
                {messages.length === 0 ? (
                  <div className="text-center text-white/90 py-16">
                    <p className={`${isMobile ? 'text-lg px-4' : 'text-xl'} text-white/80`}>
                      {isMobile ? 'Start your evolution journey' : 'Begin your transformation and growth'}
                    </p>
                  </div>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${
                        message.isTransition 
                          ? 'justify-center' 
                          : message.isUser 
                            ? 'justify-end' 
                            : 'justify-start'
                      } mb-4`}
                    >
                      <div
                        className={`${
                          message.isTransition
                            ? 'px-4 py-2 bg-gradient-to-r from-purple-500/40 to-blue-500/40 border border-purple-400/50 text-purple-100 text-sm rounded-full'
                            : `${isMobile ? 'max-w-[85%]' : 'max-w-2xl'} p-5 rounded-2xl backdrop-blur-sm ${
                                message.isUser
                                  ? 'bg-gradient-to-r from-yellow-500/80 to-orange-500/80 text-white shadow-lg border border-white/10'
                                  : 'bg-white/20 text-white border border-white/30 shadow-lg'
                              }`
                        }`}
                      >
                        <p className={`${
                          message.isTransition 
                            ? 'text-center font-medium' 
                            : `${isMobile ? 'text-base leading-relaxed' : 'text-base leading-relaxed'}`
                        }`}>
                          {message.text}
                        </p>
                        {!message.isTransition && (
                          <p className={`text-xs mt-3 ${
                            message.isUser ? 'text-white/70' : 'text-white/60'
                          }`}>
                            {message.timestamp.toLocaleTimeString()}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                )}
                
                {isLoading && (
                  <div className="flex justify-start mb-4">
                    <div className="bg-white/20 text-white border border-white/30 shadow-lg p-5 rounded-2xl">
                      <div className="flex items-center space-x-2">
                        <div className="animate-pulse">Thinking...</div>
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                          <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </ChatScrollArea>

              <div className={`${isMobile ? 'p-6 pt-4 border-t border-white/10 pb-8' : ''}`}>
                <ChatInput
                  inputText={inputText}
                  setInputText={setInputText}
                  onSendMessage={handleSendMessage}
                  disabled={isLoading}
                  messageCount={stats.messagesUsedToday}
                />
              </div>
            </div>

            {/* Tips Section - Desktop only */}
            {!isMobile && (
              <div className="glass-effect rounded-xl border border-white/30 p-8 backdrop-blur-md shadow-xl">
                <h3 className="font-semibold text-white mb-6 text-xl">Tips for your session</h3>
                <div className="space-y-3 text-green-300 text-base">
                  <p>• Be honest about your feelings – there's no judgment here.</p>
                  <p>• Take your time to reflect before responding.</p>
                  <p>• Switch modes based on what you need most right now.</p>
                  <p>• Upload images to share visual context with your AI therapist.</p>
                  <p>• Remember: This is a safe space for your thoughts.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Mobile Mode Selector - Only show when no active conversation */}
      {isMobile && messages.length === 0 && (
        <MobileModeSelector 
          selectedMode={selectedMode}
          onModeSelect={handleModeSelect}
        />
      )}
    </div>
  );
};

export default Therapy;
