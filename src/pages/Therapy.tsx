import { useState, useEffect } from 'react';
import Navigation from '@/components/ui/navigation';
import ChatInput from '@/components/therapy/ChatInput';
import ReflectiveCheckIn from '@/components/therapy/ReflectiveCheckIn';
import SpotifyIntegration from '@/components/therapy/SpotifyIntegration';
import TherapySidebar from '@/components/therapy/TherapySidebar';
import { useAuth } from '@/contexts/AuthContext';
import { useTherapySessions, TherapySession } from '@/hooks/useTherapySessions';
import { useEmotionClassifier } from '@/hooks/useEmotionClassifier';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
  const { classifyEmotion } = useEmotionClassifier();
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
  const [isClassifying, setIsClassifying] = useState(false);

  const modes = [
    {
      id: 'reflect' as TherapyMode,
      name: 'Reflect',
      icon: '🟣',
      color: 'from-purple-500 to-purple-600',
      borderColor: 'border-purple-500',
      bgColor: 'bg-purple-500/10',
      description: 'Process your thoughts and emotions with gentle guidance'
    },
    {
      id: 'recover' as TherapyMode,
      name: 'Recover',
      icon: '🔵',
      color: 'from-blue-500 to-blue-600',
      borderColor: 'border-blue-500',
      bgColor: 'bg-blue-500/10',
      description: 'Heal from trauma and difficult experiences'
    },
    {
      id: 'rebuild' as TherapyMode,
      name: 'Rebuild',
      icon: '🟢',
      color: 'from-green-500 to-green-600',
      borderColor: 'border-green-500',
      bgColor: 'bg-green-500/10',
      description: 'Reconstruct your sense of self and relationships'
    },
    {
      id: 'evolve' as TherapyMode,
      name: 'Evolve',
      icon: '🟡',
      color: 'from-yellow-500 to-orange-500',
      borderColor: 'border-yellow-500',
      bgColor: 'bg-yellow-500/10',
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
      const { data, error } = await supabase
        .from('therapy_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('timestamp', { ascending: true });

      if (error) {
        console.error('Error loading messages:', error);
        return;
      }

      const formattedMessages: Message[] = (data || []).map(msg => ({
        id: msg.id,
        text: msg.content,
        isUser: msg.sender === 'user',
        timestamp: new Date(msg.timestamp)
      }));

      setMessages(formattedMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const getModePrompts = (mode: TherapyMode): string => {
    const prompts = {
      reflect: "I'm here to help you reflect on your thoughts and feelings. What's been on your mind lately?",
      recover: "Let's work together on your healing journey. What would you like to process today?",
      rebuild: "I'm here to support you as you rebuild and rediscover yourself. Where shall we start?",
      evolve: "Ready to grow and evolve? Let's explore what's possible for you. What area of your life are you looking to transform?"
    };
    return prompts[mode];
  };

  const handleSessionSelect = (session: TherapySession) => {
    setCurrentSession(session);
  };

  const handleModeSelect = async (mode: TherapyMode) => {
    setSelectedMode(mode);
    
    if (!currentSession) {
      // Create new session if none exists
      const newSession = await createSession(mode.charAt(0).toUpperCase() + mode.slice(1), 'New Session');
      if (newSession) {
        const welcomeMessage: Message = {
          id: Date.now().toString(),
          text: getModePrompts(mode),
          isUser: false,
          timestamp: new Date()
        };
        setMessages([welcomeMessage]);
        await saveMessageToDatabase(newSession.id, welcomeMessage);
      }
    } else {
      // Update existing session mode
      await updateSession(currentSession.id, { mode: mode.charAt(0).toUpperCase() + mode.slice(1) });
      
      const welcomeMessage: Message = {
        id: Date.now().toString(),
        text: getModePrompts(mode),
        isUser: false,
        timestamp: new Date()
      };
      setMessages([welcomeMessage]);
      await saveMessageToDatabase(currentSession.id, welcomeMessage);
    }
  };

  const saveMessageToDatabase = async (sessionId: string, message: Message) => {
    try {
      const { error } = await supabase
        .from('therapy_messages')
        .insert({
          session_id: sessionId,
          user_id: (await supabase.auth.getUser()).data.user?.id,
          content: message.text,
          sender: message.isUser ? 'user' : 'ai',
          timestamp: message.timestamp.toISOString()
        });

      if (error) {
        console.error('Error saving message:', error);
      }
    } catch (error) {
      console.error('Error saving message:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;
    
    const maxMessages = isPremium ? 300 : 50;
    if (messageCount >= maxMessages) return;

    const userInput = inputText.trim();

    // Create session if none exists
    if (!currentSession) {
      const newSession = await createSession('Reflect', 'New Session');
      if (!newSession) return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      text: userInput,
      isUser: true,
      timestamp: new Date()
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputText('');
    setMessageCount(prev => prev + 1);

    // Save message to database
    if (currentSession) {
      await saveMessageToDatabase(currentSession.id, userMessage);
      
      // Auto-generate title if this is the first user message
      if (messages.length <= 1) {
        const newTitle = generateSessionTitle(userInput);
        await updateSession(currentSession.id, { title: newTitle });
      }
    }

    // Classify emotion and update mode
    setIsClassifying(true);
    try {
      const detectedMode = await classifyEmotion(userInput);
      const newMode = detectedMode.toLowerCase() as TherapyMode;
      
      if (newMode !== selectedMode) {
        setSelectedMode(newMode);
        if (currentSession) {
          await updateSession(currentSession.id, { mode: detectedMode });
        }
        toast.success(`Switched to ${detectedMode} mode based on your message`);
      }
    } catch (error) {
      console.error('Error classifying emotion:', error);
    } finally {
      setIsClassifying(false);
    }

    // Simulate AI response
    setTimeout(async () => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: "I hear you, and I want you to know that your feelings are completely valid. Let's explore this together. Can you tell me more about what led to these feelings?",
        isUser: false,
        timestamp: new Date()
      };
      
      const updatedMessages = [...newMessages, aiResponse];
      setMessages(updatedMessages);
      
      if (currentSession) {
        await saveMessageToDatabase(currentSession.id, aiResponse);
      }
    }, 1500);
  };

  const selectedModeData = modes.find(mode => mode.id === selectedMode);

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Sidebar */}
      <TherapySidebar 
        onSessionSelect={handleSessionSelect}
        currentSessionId={currentSession?.id}
      />
      
      {/* Main Content with left margin for sidebar */}
      <div className="ml-12 transition-all duration-300">
        {/* Full-screen background image with smooth transitions */}
        <div 
          className="absolute inset-0 w-full h-full z-[-10] transition-all duration-500"
          style={{
            backgroundImage: `url('${modeToBackgroundImage[selectedMode]}')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }}
        />
        
        {/* Dark overlay for readability */}
        <div className="absolute inset-0 bg-black/50 z-[-5]" />
        
        <Navigation />
        
        {/* Reflective Check-In Panel for Premium Users */}
        {isPremium && showReflectiveCheckIn && (
          <ReflectiveCheckIn onClose={() => setShowReflectiveCheckIn(false)} />
        )}
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
          {/* Premium Status Banner */}
          {isPremium && (
            <div className="mb-6 glass-effect border border-yellow-500/30 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <span className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black text-sm px-3 py-1 rounded-full font-semibold">
                  PRO
                </span>
                <span className="text-white font-medium">Premium Active</span>
                <span className="text-white/80">- 300 messages & 25 uploads per day</span>
              </div>
            </div>
          )}

          {/* Mode Selector */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold text-white">
                {currentSession ? `Therapy Session: ${currentSession.title}` : 'Choose your therapy mode'}
              </h1>
              {isClassifying && (
                <div className="flex items-center space-x-2 text-white/80">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span className="text-sm">Detecting emotional mode...</span>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {modes.map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => handleModeSelect(mode.id)}
                  className={`p-4 rounded-lg border transition-all duration-300 backdrop-blur-sm ${
                    selectedMode === mode.id
                      ? `${mode.borderColor} ${mode.bgColor} shadow-lg border-opacity-80`
                      : 'border-white/30 hover:border-white/50 glass-effect'
                  }`}
                >
                  <div className="text-2xl mb-2">{mode.icon}</div>
                  <div className="font-semibold text-white">{mode.name}</div>
                  <div className="text-xs text-white/80 mt-1">{mode.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Selected Mode Banner */}
          {selectedModeData && (
            <div className={`p-4 rounded-lg border backdrop-blur-sm ${selectedModeData.borderColor} ${selectedModeData.bgColor} mb-6 border-opacity-60`}>
              <div className="flex items-center space-x-3">
                <span className="text-2xl">{selectedModeData.icon}</span>
                <div>
                  <h3 className="font-semibold text-white">{selectedModeData.name} Mode</h3>
                  <p className="text-sm text-white/80">{selectedModeData.description}</p>
                </div>
              </div>
            </div>
          )}

          {/* Chat Area */}
          <div className="glass-effect rounded-lg border border-white/30 p-6 mb-6 backdrop-blur-md">
            <div className="h-96 overflow-y-auto mb-6 space-y-4">
              {messages.length === 0 ? (
                <div className="text-center text-white/70">
                  <p>Select a therapy mode above to begin your session</p>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-sm p-3 rounded-lg backdrop-blur-sm ${
                        message.isUser
                          ? 'bg-primary/80 text-white'
                          : 'bg-white/20 text-white border border-white/30'
                      }`}
                    >
                      <p>{message.text}</p>
                      {message.images && message.images.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {message.images.map((img, idx) => (
                            <img key={idx} src={img} alt="Upload" className="max-w-full rounded" />
                          ))}
                        </div>
                      )}
                      <p className={`text-xs mt-1 ${
                        message.isUser ? 'text-white/70' : 'text-white/60'
                      }`}>
                        {message.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Chat Input with Spotify Integration */}
            <div className="flex items-center space-x-3">
              <div className="flex-1">
                <ChatInput
                  inputText={inputText}
                  setInputText={setInputText}
                  onSendMessage={handleSendMessage}
                  disabled={false}
                  messageCount={messageCount}
                />
              </div>
              <SpotifyIntegration mode={selectedMode} />
            </div>
          </div>

          {/* Tips Section */}
          <div className="glass-effect rounded-lg border border-white/30 p-6 backdrop-blur-md">
            <h3 className="font-semibold text-white mb-4">Tips for your session</h3>
            <div className="space-y-2 text-green-300">
              <p>• Be honest about your feelings – there's no judgment here.</p>
              <p>• Take your time to reflect before responding.</p>
              <p>• Switch modes based on what you need most right now.</p>
              <p>• Upload images to share visual context with your AI therapist.</p>
              <p>• Remember: This is a safe space for your thoughts.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Therapy;
