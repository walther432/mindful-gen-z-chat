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
  const { isPremium } = useAuth();
  const isMobile = useIsMobile();
  const { 
    sessions, 
    currentSession, 
    setCurrentSession, 
    createSession, 
    updateSession,
    generateSessionTitle 
  } = useTherapySessions();
  
  const [selectedMode, setSelectedMode] = useState<TherapyMode>('reflect');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [messageCount, setMessageCount] = useState(0);
  const [showReflectiveCheckIn, setShowReflectiveCheckIn] = useState(true);
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
    try {
      console.log('🔍 Loading messages for session:', sessionId);
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading messages:', error);
        return;
      }

      const formattedMessages: Message[] = (data || []).map(msg => ({
        id: msg.id,
        text: msg.content,
        isUser: msg.role === 'user',
        timestamp: new Date(msg.created_at)
      }));

      console.log('📋 Loaded', formattedMessages.length, 'messages from database');
      setMessages(formattedMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const handleSessionSelect = (session: TherapySession) => {
    setCurrentSession(session);
    setIsMobileSidebarOpen(false);
  };

  const handleModeSelect = async (mode: TherapyMode) => {
    setSelectedMode(mode);
    
    if (!currentSession) {
      const newSession = await createSession(mode.charAt(0).toUpperCase() + mode.slice(1), 'New Session');
      if (newSession) {
        setMessages([]);
      }
    } else {
      await updateSession(currentSession.id, { mode: mode.charAt(0).toUpperCase() + mode.slice(1) });
    }
  };

  const saveMessageToDatabase = async (sessionId: string, message: Message) => {
    try {
      console.log('💾 Saving message to database:', { sessionId, isUser: message.isUser, text: message.text.substring(0, 50) });
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          session_id: sessionId,
          user_id: (await supabase.auth.getUser()).data.user?.id,
          content: message.text,
          role: message.isUser ? 'user' : 'assistant',
          created_at: message.timestamp.toISOString()
        });

      if (error) {
        console.error('❌ Error saving message to database:', error);
      } else {
        console.log('✅ Message saved to database successfully');
      }
    } catch (error) {
      console.error('❌ Error saving message to database:', error);
    }
  };

  const handleSendMessage = async () => {
    console.log('🔥 handleSendMessage called with inputText:', inputText);
    
    if (!inputText.trim()) {
      console.log('❌ Empty input text, returning early');
      return;
    }
    
    const maxMessages = isPremium ? 300 : 50;
    if (messageCount >= maxMessages) {
      toast.error(`Daily limit reached! ${isPremium ? 'Premium' : 'Free'} users get ${maxMessages} messages per day.`);
      return;
    }

    const userInput = inputText.trim();
    console.log('📤 Processing user input:', userInput);

    // Create session if needed - Let backend handle this
    if (!currentSession) {
      console.log('📝 No current session - backend will create one');
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      text: userInput,
      isUser: true,
      timestamp: new Date()
    };

    console.log('➕ Adding user message to UI:', userMessage);
    setMessages(prevMessages => {
      const updated = [...prevMessages, userMessage];
      console.log('📝 Updated messages with user message:', updated.length);
      return updated;
    });
    
    setInputText('');
    setMessageCount(prev => prev + 1);
    setIsLoading(true);

    // Backend will handle message saving and session creation

    // Call backend API to get AI response
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      
      if (!token) {
        throw new Error('No authentication token available');
      }

      console.log('🚀 Making API call to /api/chat with payload:', {
        message: userInput,
        currentMode: selectedMode,
        sessionId: currentSession?.id
      });
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message: userInput,
          currentMode: selectedMode,
          sessionId: currentSession?.id
        })
      });

      console.log('📡 API Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ API Error Response:', errorData);
        throw new Error(errorData.error || `API Error: ${response.status}`);
      }

      const aiData = await response.json();
      console.log('✅ Full AI Response received:', aiData);
      
      if (!aiData.reply) {
        console.error('❌ No reply field in AI response:', aiData);
        throw new Error('Invalid AI response structure - missing reply field');
      }
      
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: aiData.reply,
        isUser: false,
        timestamp: new Date()
      };
      
      console.log('🎯 Adding AI response to messages:', aiResponse);
      console.log('🎯 GPT Reply Received:', aiData.reply);
      
      // Add AI response to the UI
      setMessages(prevMessages => {
        const updatedMessages = [...prevMessages, aiResponse];
        console.log('📝 Final messages array length:', updatedMessages.length);
        console.log('📝 Last message (should be AI):', updatedMessages[updatedMessages.length - 1]);
        return updatedMessages;
      });
      
      // Update session data if returned from backend
      if (aiData.sessionId && !currentSession) {
        console.log('🆔 Session created by backend:', aiData.sessionId);
        // Refresh sessions list to get the new session
        // The useTherapySessions hook will handle this
      }
      
      // Update remaining message count
      if (aiData.remainingMessages !== undefined) {
        console.log('📊 Remaining messages:', aiData.remainingMessages);
      }
      
      console.log('✅ AI response successfully added to UI');
      
    } catch (error) {
      console.error('❌ Error in handleSendMessage:', error);
      toast.error('Failed to get AI response: ' + error.message);
      
      // Remove the user message if AI response failed
      setMessages(prevMessages => {
        console.log('🔄 Removing last user message due to error');
        return prevMessages.slice(0, -1);
      });
      setMessageCount(prev => prev - 1);
    } finally {
      setIsLoading(false);
    }
  };

  const selectedModeData = modes.find(mode => mode.id === selectedMode);

  return (
    <div className="min-h-screen relative overflow-hidden smooth-scroll">
      {/* Background with Mode-Specific Effects */}
      <div 
        className="absolute inset-0 w-full h-full z-[-10] transition-all duration-700 ease-in-out"
        style={{
          backgroundImage: `url('${modeToBackgroundImage[selectedMode]}')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          filter: isMobile ? 'brightness(0.7) contrast(1.1)' : 'brightness(0.8)'
        }}
      />
      
      {/* Mobile Enhanced Overlay with Mode Pulse */}
      {isMobile ? (
        <>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[3px] z-[-5]" />
          <div className={`absolute inset-0 z-[-4] opacity-30 transition-all duration-1000 ${selectedModeData?.pulseColor || ''}`} />
        </>
      ) : (
        <>
          <div className="absolute inset-0 bg-black/50 z-[-5]" />
          <div className={`absolute inset-0 z-[-4] opacity-20 transition-all duration-1000 ${selectedModeData?.pulseColor || ''}`} />
        </>
      )}
      
      {/* Desktop Sidebar - Hidden on Mobile */}
      <div className="hidden lg:block">
        <TherapySidebar 
          onSessionSelect={handleSessionSelect}
          currentSessionId={currentSession?.id}
        />
      </div>

      {/* Mobile Sidebar Toggle - Floating Button */}
      {isMobile && (
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
      <div className={`${isMobile ? '' : 'lg:ml-80'} transition-all duration-300 min-h-screen flex flex-col smooth-scroll`}>
        {/* Navigation - Desktop only */}
        <div className="hidden lg:block">
          <Navigation />
        </div>
        
        {/* Mobile Top Bar */}
        {isMobile && (
          <div className="fixed top-0 left-0 right-0 z-30 glass-effect border-b border-white/10 backdrop-blur-xl bg-black/10">
            <div className="flex items-center justify-between px-6 py-4">
              <div className="w-12" />
              <h1 className="text-lg font-bold text-white truncate flex-1 text-center">
                {currentSession ? currentSession.title : 'Therapy'}
              </h1>
              <SpotifyIntegration mode={selectedMode} />
            </div>
          </div>
        )}
        
        {/* Premium Check-In - Desktop only */}
        {!isMobile && isPremium && showReflectiveCheckIn && (
          <ReflectiveCheckIn onClose={() => setShowReflectiveCheckIn(false)} />
        )}
        
        <div className={`flex-1 flex flex-col ${isMobile ? 'pt-20' : ''} relative`}>
          {/* Desktop Container with Optimized Width */}
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
                
                {/* Desktop Mode Grid - Better Spacing */}
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

                {/* Selected Mode Banner */}
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

            {/* Chat Area with Enhanced Mobile Design */}
            <div className={`${isMobile 
              ? 'rounded-none border-0 bg-black/10 backdrop-blur-md flex-1 flex flex-col pb-24' 
              : 'glass-effect rounded-xl border border-white/30 backdrop-blur-md flex-1 flex flex-col p-8 mb-8 shadow-2xl'
            }`}>
              <ChatScrollArea messages={messages} isMobile={isMobile}>
                {messages.length === 0 ? (
                  <div className="text-center text-white/70 py-16">
                    <p className={`${isMobile ? 'text-lg px-4' : 'text-xl'}`}>
                      {isMobile ? 'Start your therapy session' : 'Select a therapy mode above to begin your session'}
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
                            ? 'bg-primary/80 text-white shadow-lg border border-white/10'
                            : 'bg-white/15 text-white border border-white/20 shadow-lg'
                        }`}
                      >
                        <p className={`${isMobile ? 'text-base leading-relaxed' : 'text-base leading-relaxed'}`}>{message.text}</p>
                        {message.images && message.images.length > 0 && (
                          <div className="mt-3 space-y-2">
                            {message.images.map((img, idx) => (
                              <img key={idx} src={img} alt="Upload" className="max-w-full rounded-lg" />
                            ))}
                          </div>
                        )}
                        <p className={`text-xs mt-3 ${
                          message.isUser ? 'text-white/70' : 'text-white/60'
                        }`}>
                          {message.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))
                )}
                
                {/* Loading indicator */}
                {isLoading && (
                  <div className="flex justify-start mb-4">
                    <div className="bg-white/15 text-white border border-white/20 shadow-lg p-5 rounded-2xl">
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

              {/* Chat Input */}
              <div className={`${isMobile ? 'p-6 pt-4 border-t border-white/10 pb-8' : ''}`}>
                <ChatInput
                  inputText={inputText}
                  setInputText={setInputText}
                  onSendMessage={handleSendMessage}
                  disabled={isLoading}
                  messageCount={messageCount}
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
      
      {/* Mobile Mode Selector - Bottom Navigation */}
      <MobileModeSelector 
        selectedMode={selectedMode}
        onModeSelect={handleModeSelect}
      />
    </div>
  );
};

export default Therapy;
