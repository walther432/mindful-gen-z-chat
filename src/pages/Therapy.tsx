
import { useState, useEffect } from 'react';
import Navigation from '@/components/ui/navigation';
import TherapySidebar from '@/components/therapy/TherapySidebar';
import { useAuth } from '@/contexts/AuthContext';
import { useTherapySessions, TherapySession } from '@/hooks/useTherapySessions';

type TherapyMode = 'reflect' | 'recover' | 'rebuild' | 'evolve';

const Therapy = () => {
  const { isPremium } = useAuth();
  const { 
    sessions, 
    currentSession, 
    setCurrentSession, 
    createSession, 
    updateSession
  } = useTherapySessions();
  
  const [selectedMode, setSelectedMode] = useState<TherapyMode>('reflect');

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

  // Update mode when session changes
  useEffect(() => {
    if (currentSession) {
      setSelectedMode(currentSession.mode.toLowerCase() as TherapyMode);
    }
  }, [currentSession]);

  const handleSessionSelect = (session: TherapySession) => {
    setCurrentSession(session);
  };

  const handleModeSelect = async (mode: TherapyMode) => {
    setSelectedMode(mode);
    
    if (!currentSession) {
      // Create new session if none exists
      await createSession(mode.charAt(0).toUpperCase() + mode.slice(1), 'New Session');
    } else {
      // Update existing session mode
      await updateSession(currentSession.id, { mode: mode.charAt(0).toUpperCase() + mode.slice(1) });
    }
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

          {/* Empty Chat Area */}
          <div className="glass-effect rounded-lg border border-white/30 p-6 mb-6 backdrop-blur-md">
            <div className="h-96 flex items-center justify-center">
              <div className="text-center text-white/70">
                <div className="text-6xl mb-4">💭</div>
                <h3 className="text-xl font-semibold mb-2">Start a session to begin your therapy journey</h3>
                <p>Select a therapy mode above and create a new session to get started.</p>
              </div>
            </div>
          </div>

          {/* Tips Section */}
          <div className="glass-effect rounded-lg border border-white/30 p-6 backdrop-blur-md">
            <h3 className="font-semibold text-white mb-4">Tips for your session</h3>
            <div className="space-y-2 text-green-300">
              <p>• Be honest about your feelings – there's no judgment here.</p>
              <p>• Take your time to reflect before responding.</p>
              <p>• Switch modes based on what you need most right now.</p>
              <p>• Remember: This is a safe space for your thoughts.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Therapy;
