
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
}

const Therapy = () => {
  const { user, isPremium } = useAuth();
  const isMobile = useIsMobile();
  const { stats, refetch: refetchStats } = useUserStats();
  const { 
    sessions, 
    currentSession, 
    setCurrentSession, 
    createSession, 
    updateSession,
    generateSessionTitle 
  } = useTherapySessions();
  
  const [selectedMode, setSelectedMode] = useState<TherapyMode>('evolve');
  const [messages, setMessages] = useState<Message[]>([]);
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
      pulseColor: 'animate-pulse bg-purple-400/20',
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
      pulseColor: 'animate-pulse bg-amber-400/20',
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
      pulseColor: 'animate-pulse bg-green-400/20',
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
      pulseColor: 'animate-pulse bg-gradient-to-r from-blue-400/20 to-violet-400/20',
      description: 'Grow beyond your current limitations'
    }
  ];

  const modeToBackgroundImage = {
    reflect: '/lovable-uploads/a3872cd3-caf3-42ac-99bb-15e21499e310.png',
    recover: '/lovable-uploads/4e0d3477-805c-4e57-b52c-82fe4a8d1c4f.png',
    rebuild: '/lovable-uploads/07533b71-b782-4088-844e-83d3b08837e7.png',
    evolve: '/lovable-uploads/63bfd61c-32c7-4ddb-aa9a-6c5a6d885cc6.png'
  };

  // Load messages from current session
  useEffect(() => {
    if (currentSession) {
      loadMessagesForSession(currentSession.id);
      setSelectedMode(currentSession.mode.toLowerCase() as TherapyMode);
    } else {
      setMessages([]);
    }
  }, [currentSession]);

  const loadMessagesForSession = async (sessionId: string) => {
    if (!user) {
      console.error('❌ No user available for loading messages');
      return;
    }

    try {
      console.log('🔍 Loading messages for session:', sessionId);
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      
      if (!token) {
        console.error('❌ No auth token available');
        toast.error('Authentication required');
        return;
      }

      const response = await fetch(`https://tvjqpmxugitehucwhdbk.supabase.co/functions/v1/therapy-api?action=getMessages&sessionId=${sessionId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('📡 getMessages response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ getMessages error response:', errorText);
        toast.error('Failed to load message history');
        return;
      }

      const data = await response.json();
      console.log('📋 getMessages response data:', data);
      
      const formattedMessages: Message[] = (data.messages || []).map(msg => ({
        id: msg.id,
        text: msg.content,
        isUser: msg.role === 'user',
        timestamp: new Date(msg.created_at)
      }));

      console.log('✅ Loaded', formattedMessages.length, 'messages from database');
      setMessages(formattedMessages);
    } catch (error) {
      console.error('❌ Error loading messages:', error);
      toast.error('Failed to load messages: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handleSessionSelect = (session: TherapySession) => {
    console.log('🎯 Selecting session:', session.id);
    setCurrentSession(session);
    setIsMobileSidebarOpen(false);
  };

  const handleModeSelect = async (mode: TherapyMode) => {
    console.log('🎛️ Mode selected:', mode);
    setSelectedMode(mode);
    
    if (!currentSession) {
      console.log('📝 Creating new session for mode:', mode);
      const newSession = await createSession(mode.charAt(0).toUpperCase() + mode.slice(1), 'New Session');
      if (newSession) {
        setMessages([]);
        console.log('✅ New session created and messages cleared');
      }
    } else {
      console.log('📝 Updating existing session mode');
      await updateSession(currentSession.id, { mode: mode.charAt(0).toUpperCase() + mode.slice(1) });
    }
  };

  const handleSendMessage = async () => {
    console.log('🚀 handleSendMessage called');
    console.log('📝 Input text:', inputText?.substring(0, 50) + '...');
    console.log('👤 User:', user?.id);
    console.log('📊 Stats:', stats);
    
    if (!user) {
      console.error('❌ No user authenticated');
      toast.error('Please log in to send messages');
      return;
    }

    if (!inputText?.trim()) {
      console.log('❌ Empty input text, returning early');
      return;
    }
    
    const maxMessages = isPremium ? 300 : 50;
    if (stats.messagesUsedToday >= maxMessages) {
      toast.error(`Daily limit reached! ${isPremium ? 'Premium' : 'Free'} users get ${maxMessages} messages per day.`);
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
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      
      if (!token) {
        throw new Error('No authentication token available');
      }

      // Create session if this is the first message
      let sessionToUse = currentSession;
      if (!sessionToUse) {
        console.log('📝 Creating new session for first message...');
        sessionToUse = await createSession(selectedMode, generateSessionTitle(userInput));
        if (!sessionToUse) {
          throw new Error('Failed to create session');
        }
      }

      console.log('🚀 Making API call to send message');
      console.log('📋 Request payload:', {
        message: userInput.substring(0, 50) + '...',
        sessionId: sessionToUse.id,
        mode: selectedMode
      });
      
      const response = await fetch('https://tvjqpmxugitehucwhdbk.supabase.co/functions/v1/therapy-api?action=sendMessage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message: userInput,
          sessionId: sessionToUse.id,
          mode: selectedMode
        })
      });

      console.log('📡 SendMessage response status:', response.status);
      console.log('📡 SendMessage response headers:', [...response.headers.entries()]);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ SendMessage error response:', errorText);
        
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText };
        }
        
        throw new Error(errorData.error || `HTTP ${response.status}: ${errorText}`);
      }

      const aiData = await response.json();
      console.log('✅ AI response received:', {
        hasReply: !!aiData.reply,
        replyLength: aiData.reply?.length,
        remainingMessages: aiData.remainingMessages,
        mode: aiData.mode,
        sessionId: aiData.sessionId
      });
      
      if (!aiData.reply) {
        throw new Error('Invalid AI response - missing reply field');
      }
      
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: aiData.reply,
        isUser: false,
        timestamp: new Date()
      };
      
      setMessages(prevMessages => [...prevMessages, aiResponse]);
      
      // Refresh user stats
      await refetchStats();
      
      console.log('✅ Message exchange completed successfully');
      
    } catch (error) {
      console.error('❌ Error in handleSendMessage:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      // Show specific error messages
      if (errorMessage.includes('Daily limit')) {
        toast.error('Daily message limit reached. Please upgrade to premium for more messages.');
      } else if (errorMessage.includes('Invalid authentication')) {
        toast.error('Authentication failed. Please log in again.');
      } else if (errorMessage.includes('Failed to create session')) {
        toast.error('Unable to create chat session. Please try again.');
      } else {
        toast.error('Failed to get AI response: ' + errorMessage);
      }
      
      // Remove user message from UI on error
      setMessages(prevMessages => prevMessages.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  const selectedModeData = modes.find(mode => mode.id === selectedMode);

  // Show loading or auth required states
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
        <div className="text-center text-white">
          <h2 className="text-2xl font-bold mb-4">Authentication Required</h2>
          <p>Please log in to access the therapy chat.</p>
        </div>
      </div>
    );
  }

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
      
      {/* Enhanced Mobile Overlay with Glassmorphism */}
      {isMobile ? (
        <>
          <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-purple-900/30 to-blue-900/50 backdrop-blur-[2px] z-[-5]" />
          <div className="absolute inset-0 z-[-4] opacity-20 bg-gradient-to-r from-yellow-400/30 via-purple-400/20 to-blue-400/30 animate-pulse" />
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
                    <div className="mb-6">
                      <div className="text-6xl mb-4">🟡</div>
                      <h2 className="text-2xl font-bold mb-2">Evolve Mode</h2>
                      <p className="text-lg text-white/70">Grow beyond your current limitations</p>
                    </div>
                    <p className={`${isMobile ? 'text-lg px-4' : 'text-xl'} text-white/80`}>
                      {isMobile ? 'Start your evolution journey' : 'Begin your transformation and growth'}
                    </p>
                  </div>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.isUser ? 'justify-end' : 'justify-start'} mb-4`}
                    >
                      <div
                        className={`${isMobile ? 'max-w-[85%]' : 'max-w-2xl'} p-5 rounded-2xl backdrop-blur-sm ${
                          message.isUser
                            ? 'bg-gradient-to-r from-yellow-500/80 to-orange-500/80 text-white shadow-lg border border-white/10'
                            : 'bg-white/20 text-white border border-white/30 shadow-lg'
                        }`}
                      >
                        <p className={`${isMobile ? 'text-base leading-relaxed' : 'text-base leading-relaxed'}`}>{message.text}</p>
                        <p className={`text-xs mt-3 ${
                          message.isUser ? 'text-white/70' : 'text-white/60'
                        }`}>
                          {message.timestamp.toLocaleTimeString()}
                        </p>
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
