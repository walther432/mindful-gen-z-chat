import { useState, useEffect } from 'react';
import { Menu } from 'lucide-react';
import Navigation from '@/components/ui/navigation';
import ChatInput from '@/components/therapy/ChatInput';
import ReflectiveCheckIn from '@/components/therapy/ReflectiveCheckIn';
import SpotifyIntegration from '@/components/therapy/SpotifyIntegration';
import EnhancedTherapySidebar from '@/components/therapy/EnhancedTherapySidebar';
import { useAuth } from '@/contexts/AuthContext';
import { useTherapySessions, TherapyMode, TherapySession } from '@/hooks/useTherapySessions';
import { useAIChat } from '@/hooks/useAIChat';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  images?: string[];
}

const Therapy = () => {
  const { isPremium } = useAuth();
  const [inputText, setInputText] = useState('');
  const [messageCount, setMessageCount] = useState(0);
  const [showReflectiveCheckIn, setShowReflectiveCheckIn] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [uiMessages, setUiMessages] = useState<Message[]>([]);
  const [showLimitModal, setShowLimitModal] = useState(false);

  const {
    currentSession,
    messages,
    loading,
    createNewSession,
    loadSession,
    addMessage
  } = useTherapySessions();

  const { sendMessage: sendAIMessage, isLoading: aiLoading } = useAIChat();

  // Convert database messages to UI messages
  useEffect(() => {
    const convertedMessages: Message[] = messages.map(msg => ({
      id: msg.id,
      text: msg.content,
      isUser: msg.sender === 'user',
      timestamp: new Date(msg.timestamp)
    }));
    setUiMessages(convertedMessages);
    
    // Count user messages for limit tracking
    const userMessageCount = messages.filter(msg => msg.sender === 'user').length;
    setMessageCount(userMessageCount);
  }, [messages]);

  const modeToBackgroundImage = {
    Reflect: '/lovable-uploads/a3872cd3-caf3-42ac-99bb-15e21499e310.png',
    Recover: '/lovable-uploads/4e0d3477-805c-4e57-b52c-82fe4a8d1c4f.png',
    Rebuild: '/lovable-uploads/07533b71-b782-4088-844e-83d3b08837e7.png',
    Evolve: '/lovable-uploads/63bfd61c-32c7-4ddb-aa9a-6c5a6d885cc6.png'
  };

  const getModePrompts = (mode: TherapyMode): string => {
    const prompts = {
      Reflect: "I'm here to help you reflect on your thoughts and feelings. What's been on your mind lately?",
      Recover: "Let's work together on your healing journey. What would you like to process today?",
      Rebuild: "I'm here to support you as you rebuild and rediscover yourself. Where shall we start?",
      Evolve: "Ready to grow and evolve? Let's explore what's possible for you. What area of your life are you looking to transform?"
    };
    return prompts[mode];
  };

  const handleNewSession = async (title: string, mode: TherapyMode) => {
    const session = await createNewSession(title, mode);
    if (session) {
      const welcomeMessage = getModePrompts(mode);
      await addMessage(welcomeMessage, 'ai');
    }
  };

  const handleSessionSelect = (session: TherapySession) => {
    loadSession(session);
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || !currentSession) return;
    
    const maxMessages = isPremium ? 300 : 50;
    if (messageCount >= maxMessages) {
      setShowLimitModal(true);
      return;
    }

    const userMessage = inputText.trim();
    setInputText('');

    // Add user message
    await addMessage(userMessage, 'user');
    setMessageCount(prev => prev + 1);

    // Get AI response
    if (currentSession) {
      const aiResponse = await sendAIMessage(userMessage, currentSession.id);
      if (aiResponse) {
        await addMessage(aiResponse, 'ai');
      }
    }
  };

  const currentMode = currentSession?.mode || 'Reflect';
  const backgroundImage = modeToBackgroundImage[currentMode];

  return (
    <div className="min-h-screen relative overflow-hidden flex">
      {/* Background */}
      <div 
        className="absolute inset-0 w-full h-full z-[-10] transition-all duration-500"
        style={{
          backgroundImage: `url('${backgroundImage}')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      />
      <div className="absolute inset-0 bg-black/50 z-[-5]" />

      {/* Enhanced Sidebar */}
      <EnhancedTherapySidebar
        onSessionSelect={handleSessionSelect}
        onNewSession={handleNewSession}
        currentSessionId={currentSession?.id}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        <Navigation />
        
        {/* Mobile Menu Button */}
        <div className="md:hidden p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(true)}
            className="text-white hover:bg-white/10"
          >
            <Menu className="w-6 h-6" />
          </Button>
        </div>

        {/* Reflective Check-In Panel for Premium Users */}
        {isPremium && showReflectiveCheckIn && (
          <ReflectiveCheckIn onClose={() => setShowReflectiveCheckIn(false)} />
        )}
        
        <div className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative w-full">
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

          {/* Current Session Info */}
          {currentSession && (
            <div className="mb-6 glass-effect border border-white/30 rounded-lg p-4 backdrop-blur-md">
              <div className="flex items-center space-x-3">
                <div className="text-2xl">
                  {currentSession.mode === 'Reflect' && '🧠'}
                  {currentSession.mode === 'Recover' && '🛠'}
                  {currentSession.mode === 'Rebuild' && '🌱'}
                  {currentSession.mode === 'Evolve' && '⚡'}
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white">{currentSession.title}</h2>
                  <p className="text-white/80 text-sm">{currentSession.mode} Mode</p>
                </div>
              </div>
            </div>
          )}

          {/* Chat Area */}
          <div className="glass-effect rounded-lg border border-white/30 p-6 mb-6 backdrop-blur-md">
            <div className="h-96 overflow-y-auto mb-6 space-y-4">
              {!currentSession ? (
                <div className="text-center text-white/70 py-16">
                  <p className="text-lg mb-4">Welcome to AI Therapy</p>
                  <p>Select a session from the sidebar or create a new one to begin</p>
                </div>
              ) : loading ? (
                <div className="text-center text-white/70 py-16">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white/70 mx-auto mb-4"></div>
                  <p>Loading session...</p>
                </div>
              ) : uiMessages.length === 0 ? (
                <div className="text-center text-white/70 py-16">
                  <p>Session loaded. Start your conversation below.</p>
                </div>
              ) : (
                uiMessages.map((message) => (
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
                      <p className={`text-xs mt-1 ${
                        message.isUser ? 'text-white/70' : 'text-white/60'
                      }`}>
                        {message.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
              
              {/* AI Typing Indicator */}
              {aiLoading && (
                <div className="flex justify-start">
                  <div className="bg-white/20 text-white border border-white/30 max-w-sm p-3 rounded-lg backdrop-blur-sm">
                    <div className="flex items-center space-x-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-white/60 rounded-full animate-pulse"></div>
                        <div className="w-2 h-2 bg-white/60 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                        <div className="w-2 h-2 bg-white/60 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                      </div>
                      <span className="text-sm text-white/70">Echo is reflecting...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Chat Input */}
            <div className="flex items-center space-x-3">
              <div className="flex-1">
                <ChatInput
                  inputText={inputText}
                  setInputText={setInputText}
                  onSendMessage={handleSendMessage}
                  disabled={!currentSession || aiLoading}
                  messageCount={messageCount}
                />
              </div>
              <SpotifyIntegration mode={currentMode} />
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

      {/* Message Limit Modal */}
      <Dialog open={showLimitModal} onOpenChange={setShowLimitModal}>
        <DialogContent className="bg-black/90 backdrop-blur-md border border-white/20 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-white mb-4">Daily Message Limit Reached</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-white/80">
              You've reached today's limit of 50 messages. Upgrade to Premium for deeper insights, memory, and unlimited conversations.
            </p>
            
            <div className="flex flex-col space-y-3">
              <Button
                onClick={() => {
                  setShowLimitModal(false);
                  // Navigate to upgrade page or show upgrade modal
                }}
                className="bg-gradient-to-r from-primary to-purple-600 w-full"
              >
                Upgrade to Premium
              </Button>
              
              <Button
                variant="outline"
                onClick={() => {
                  setShowLimitModal(false);
                  // Create new session
                  handleNewSession(`New Session ${Date.now()}`, 'Reflect');
                }}
                className="border-white/30 text-white hover:bg-white/10 w-full"
              >
                Start New Therapy Session
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Therapy;
