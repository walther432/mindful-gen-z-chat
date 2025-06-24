
import { useState } from 'react';
import Navigation from '@/components/ui/navigation';
import ChatInput from '@/components/therapy/ChatInput';
import { useAuth } from '@/contexts/AuthContext';

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
  const [selectedMode, setSelectedMode] = useState<TherapyMode>('reflect');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [messageCount, setMessageCount] = useState(0);

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

  const getModePrompts = (mode: TherapyMode): string => {
    const prompts = {
      reflect: "I'm here to help you reflect on your thoughts and feelings. What's been on your mind lately?",
      recover: "Let's work together on your healing journey. What would you like to process today?",
      rebuild: "I'm here to support you as you rebuild and rediscover yourself. Where shall we start?",
      evolve: "Ready to grow and evolve? Let's explore what's possible for you. What area of your life are you looking to transform?"
    };
    return prompts[mode];
  };

  const handleModeSelect = (mode: TherapyMode) => {
    setSelectedMode(mode);
    const welcomeMessage: Message = {
      id: Date.now().toString(),
      text: getModePrompts(mode),
      isUser: false,
      timestamp: new Date()
    };
    setMessages([welcomeMessage]);
  };

  const handleSendMessage = () => {
    if (!inputText.trim()) return;
    if (!isPremium && messageCount >= 50) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      isUser: true,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setMessageCount(prev => prev + 1);

    // Simulate AI response (placeholder for future GPT integration)
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: "I hear you, and I want you to know that your feelings are completely valid. Let's explore this together. Can you tell me more about what led to these feelings?",
        isUser: false,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiResponse]);
    }, 1500);
  };

  const selectedModeData = modes.find(mode => mode.id === selectedMode);

  return (
    <div className="min-h-screen gradient-bg">
      <Navigation />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Premium Status Banner */}
        {isPremium && (
          <div className="mb-6 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <span className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black text-sm px-3 py-1 rounded-full font-semibold">
                PRO
              </span>
              <span className="text-foreground font-medium">Premium Active</span>
              <span className="text-muted-foreground">- Unlimited messages & uploads</span>
            </div>
          </div>
        )}

        {/* Mode Selector */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-6">Choose your therapy mode</h1>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {modes.map((mode) => (
              <button
                key={mode.id}
                onClick={() => handleModeSelect(mode.id)}
                className={`p-4 rounded-lg border transition-all duration-300 ${
                  selectedMode === mode.id
                    ? `${mode.borderColor} ${mode.bgColor} shadow-lg`
                    : 'border-border/50 hover:border-primary/30 gradient-card'
                }`}
              >
                <div className="text-2xl mb-2">{mode.icon}</div>
                <div className="font-semibold text-foreground">{mode.name}</div>
                <div className="text-xs text-muted-foreground mt-1">{mode.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Selected Mode Banner */}
        {selectedModeData && (
          <div className={`p-4 rounded-lg border ${selectedModeData.borderColor} ${selectedModeData.bgColor} mb-6`}>
            <div className="flex items-center space-x-3">
              <span className="text-2xl">{selectedModeData.icon}</span>
              <div>
                <h3 className="font-semibold text-foreground">{selectedModeData.name} Mode</h3>
                <p className="text-sm text-muted-foreground">{selectedModeData.description}</p>
              </div>
            </div>
          </div>
        )}

        {/* Chat Area */}
        <div className="gradient-card rounded-lg border border-border/50 p-6 mb-6">
          <div className="h-96 overflow-y-auto mb-6 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center text-muted-foreground">
                <p>Select a therapy mode above to begin your session</p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-sm p-3 rounded-lg ${
                      message.isUser
                        ? 'bg-primary text-white'
                        : 'bg-secondary text-foreground'
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
                      message.isUser ? 'text-white/70' : 'text-muted-foreground'
                    }`}>
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Chat Input */}
          <ChatInput
            inputText={inputText}
            setInputText={setInputText}
            onSendMessage={handleSendMessage}
            disabled={messages.length === 0}
            messageCount={messageCount}
          />
        </div>

        {/* Tips Section */}
        <div className="gradient-card rounded-lg border border-border/50 p-6">
          <h3 className="font-semibold text-foreground mb-4">Tips for your session</h3>
          <div className="space-y-2 text-green-400">
            <p>• Be honest about your feelings – there's no judgment here.</p>
            <p>• Take your time to reflect before responding.</p>
            <p>• Switch modes based on what you need most right now.</p>
            <p>• Upload images to share visual context with your AI therapist.</p>
            <p>• Remember: This is a safe space for your thoughts.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Therapy;
