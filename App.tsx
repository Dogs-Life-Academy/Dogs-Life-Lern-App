
import React, { useState, useEffect } from 'react';
import { View, UserRole, QuizConfig, Question, UserAnswers } from './types.ts';
import { fetchQuizQuestions } from './services/supabaseClient.ts';
import AdminDashboard from './components/AdminDashboard.tsx';
import QuizGame from './components/QuizGame.tsx';
import QuizResult from './components/QuizResult.tsx';

function App() {
  const [currentView, setCurrentView] = useState<View>('START');
  const [role, setRole] = useState<UserRole>(null);
  const [adminPassword, setAdminPassword] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  
  // Default count 5
  const [quizConfig, setQuizConfig] = useState<QuizConfig>({ category: 'Hundeführerschein', count: 5 });
  const [quizQuestions, setQuizQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [userAnswers, setUserAnswers] = useState<UserAnswers>({});
  const [showIntroModal, setShowIntroModal] = useState(false);

  // Navigation Helpers
  const goHome = () => {
    setCurrentView('START');
    setRole(null);
    setAdminPassword('');
    setPasswordError(false);
    setShowIntroModal(false);
  };

  const handleRoleSelect = (selectedRole: UserRole) => {
    if (selectedRole === 'PARTICIPANT') {
      setRole('PARTICIPANT');
      setCurrentView('SELECTION');
    } else {
      setCurrentView('ADMIN_LOGIN');
    }
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPassword === '25CH07hsbw+') {
      setRole('ADMIN');
      setCurrentView('ADMIN_DASHBOARD');
      setPasswordError(false);
    } else {
      setPasswordError(true);
    }
  };

  const startQuizProcess = async () => {
    setLoading(true);
    try {
      const questions = await fetchQuizQuestions(quizConfig.category, quizConfig.count);
      if (questions.length === 0) {
        alert("Keine Fragen für diese Kategorie gefunden.");
        setLoading(false);
        return;
      } 
      
      setQuizQuestions(questions);

      // Check for Modal Condition: ANY category AND 60 questions
      if (quizConfig.count === 60) {
        setShowIntroModal(true);
        setLoading(false);
      } else {
        setCurrentView('GAME');
        setLoading(false);
      }

    } catch (err) {
      console.error(err);
      alert("Fehler beim Starten des Tests.");
      setLoading(false);
    }
  };

  const confirmStartQuiz = () => {
    setShowIntroModal(false);
    setCurrentView('GAME');
  };

  const finishQuiz = (answers: UserAnswers) => {
    setUserAnswers(answers);
    setCurrentView('RESULT');
  };

  // View Rendering
  const renderView = () => {
    switch (currentView) {
      case 'START':
        return (
          <div className="min-h-screen bg-[#6C5CE7] flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {/* Decorative circles */}
            <div className="absolute top-10 left-10 w-20 h-20 bg-white opacity-10 rounded-full"></div>
            <div className="absolute bottom-10 right-10 w-32 h-32 bg-white opacity-10 rounded-full"></div>
            
            <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center relative z-10">
              <div className="mb-8 flex justify-center">
                <img 
                  src="https://pruefung.hs-bw.com/wp-content/uploads/2021/02/Logo-Dogs-Life-ohne-www.png" 
                  alt="Dog´s Life Academy" 
                  className="w-48 h-auto object-contain"
                />
              </div>
              
              <h1 className="text-2xl font-extrabold text-gray-800 mb-2">Dog´s Life Academy</h1>
              <h2 className="text-xl font-bold text-gray-700 mb-8">Theorie Test Prüfungen</h2>
              <p className="text-gray-500 mb-6 text-sm">Wähle eine Option, um zu starten.</p>
              
              <div className="space-y-4">
                <button 
                  onClick={() => handleRoleSelect('PARTICIPANT')}
                  className="w-full py-4 bg-[#FF9F43] hover:bg-[#ffb063] text-white rounded-xl font-bold text-xl shadow-[0_4px_0_rgb(200,120,50)] active:shadow-none active:translate-y-[4px] transition-all"
                >
                  Los geht's!
                </button>
              </div>
            </div>

            {/* Subtle Admin Button at bottom */}
            <button 
                onClick={() => handleRoleSelect('ADMIN')}
                className="absolute bottom-6 text-white/30 hover:text-white/80 text-xs font-bold transition-colors cursor-pointer"
            >
                Admin Access
            </button>
          </div>
        );

      case 'ADMIN_LOGIN':
        return (
          <div className="min-h-screen bg-[#6C5CE7] flex items-center justify-center p-4">
            <div className="bg-white p-8 rounded-3xl shadow-xl max-w-sm w-full">
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 bg-[#e1f0ff] rounded-full flex items-center justify-center text-3xl">
                  🔒
                </div>
              </div>
              <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">Admin Login</h2>
              <form onSubmit={handleAdminLogin} className="space-y-4">
                <div>
                  <input 
                    type="password" 
                    placeholder="Passwort eingeben" 
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className={`w-full p-4 border-2 rounded-xl focus:outline-none font-bold text-gray-600 placeholder-gray-400 transition-colors bg-white ${
                      passwordError 
                        ? 'border-red-400 focus:border-red-500' 
                        : 'border-gray-100 focus:border-[#6C5CE7]'
                    }`}
                  />
                  {passwordError && <p className="text-red-500 text-sm mt-2 font-semibold">Falsches Passwort.</p>}
                </div>
                <button 
                  type="submit" 
                  className="w-full bg-[#6C5CE7] text-white py-4 rounded-xl font-bold hover:bg-[#5a4bcf] shadow-lg transition transform active:scale-95"
                >
                  Einloggen
                </button>
                <button 
                  type="button" 
                  onClick={() => setCurrentView('START')} 
                  className="w-full text-gray-400 text-sm hover:text-gray-600 font-bold py-2"
                >
                  Abbrechen
                </button>
              </form>
            </div>
          </div>
        );

      case 'SELECTION':
        // Determine theme based on selected category
        const isTrainer = quizConfig.category === 'Trainerprüfung';
        
        // Dynamic classes based on theme
        const activeThemeClass = isTrainer ? 'bg-[#6C5CE7] border-[#4834d4]' : 'bg-[#FF9F43] border-[#e67e22]';
        const activeShadowClass = isTrainer ? 'shadow-[0_4px_0_#4834d4]' : 'shadow-[0_4px_0_#e67e22]';
        const hoverClass = isTrainer ? 'hover:bg-[#5f4dd0]' : 'hover:bg-[#ffb063]';
        
        return (
          <>
            {/* Scrollable Container for Selection View */}
            <div className={`h-full w-full overflow-y-auto scrollbar-hide ${isTrainer ? 'bg-[#6C5CE7]' : 'bg-[#FF9F43]'} transition-colors duration-500`}>
              <div className="min-h-full w-full flex items-center justify-center p-4">
                <div className="bg-white p-6 rounded-3xl shadow-2xl max-w-md w-full relative">
                  <button onClick={goHome} className="absolute top-6 left-6 text-gray-400 hover:text-gray-600">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7"></path></svg>
                  </button>
                  
                  <h2 className="text-2xl font-extrabold text-gray-800 mb-6 text-center mt-2">Quiz auswählen</h2>
                  
                  <div className="mb-6">
                    {/* Label removed as requested */}
                    <div className="flex flex-col gap-2">
                      {/* Hundeführerschein Button */}
                      <button
                        onClick={() => setQuizConfig({...quizConfig, category: 'Hundeführerschein'})}
                        className={`py-3 px-6 rounded-2xl border-b-4 font-bold text-lg transition-all ${
                          quizConfig.category === 'Hundeführerschein'
                            ? 'bg-[#FF9F43] border-[#e67e22] text-white translate-y-[2px] border-b-0 mb-[4px]' 
                            : 'bg-gray-100 border-gray-200 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        Hundeführerschein
                      </button>
                      
                      {/* Trainerprüfung Button */}
                      <button
                        onClick={() => setQuizConfig({...quizConfig, category: 'Trainerprüfung'})}
                        className={`py-3 px-6 rounded-2xl border-b-4 font-bold text-lg transition-all ${
                          quizConfig.category === 'Trainerprüfung'
                            ? 'bg-[#6C5CE7] border-[#4834d4] text-white translate-y-[2px] border-b-0 mb-[4px]' 
                            : 'bg-gray-100 border-gray-200 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        Trainerprüfung
                      </button>
                    </div>
                  </div>

                  <div className="mb-8">
                    <label className="block text-gray-800 font-bold mb-3 text-center">Anzahl Fragen</label>
                    <div className="grid grid-cols-1 gap-2">
                      {[5, 10, 20, 60].map(count => (
                        <button
                          key={count}
                          onClick={() => setQuizConfig({...quizConfig, count})}
                          className={`py-2 rounded-xl border-2 font-bold transition-all ${
                            quizConfig.count === count
                              ? `${activeThemeClass} text-white shadow-lg`
                              : 'border-transparent bg-gray-100 text-gray-400 hover:bg-gray-200'
                          }`}
                        >
                          {count} Fragen
                        </button>
                      ))}
                    </div>
                  </div>

                  <button 
                    onClick={startQuizProcess}
                    disabled={loading}
                    className={`w-full py-4 rounded-xl font-extrabold text-xl ${isTrainer ? 'bg-[#6C5CE7]' : 'bg-[#FF9F43]'} text-white ${activeShadowClass} ${hoverClass} active:shadow-none active:translate-y-[4px] transition-all flex justify-center items-center`}
                  >
                    {loading ? (
                      <svg className="animate-spin h-6 w-6 text-white" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                      </svg>
                    ) : 'Quiz starten'}
                  </button>
                </div>
              </div>
            </div>

            {/* INTRO MODAL FOR 60 QUESTIONS (Both Categories) */}
            {showIntroModal && (
              <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm">
                 {/* Flex container for centering - min-h-full ensures vertical scrolling works on mobile */}
                <div className="flex min-h-full items-center justify-center p-4">
                  {/* Modal Content */}
                  <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200 my-8">
                    <div className="p-8">
                      <div className="flex justify-center mb-6">
                        <img 
                          src={isTrainer 
                              ? "https://pruefung.hs-bw.com/wp-content/uploads/2025/05/D.O.Q.-Test.jpg" 
                              : "https://pruefung.hs-bw.com/wp-content/uploads/2022/11/KoAla-Test.png"}
                          alt="Prüfung Logo" 
                          className="max-h-24 w-auto object-contain"
                        />
                      </div>
                      
                      <h2 className="text-xl md:text-2xl font-bold text-center text-gray-800 mb-1">
                        {isTrainer ? "THEORIE - PRÜFUNG ZUM / ZUR HUNDETRAINER/IN" : "THEORIE - PRÜFUNG HUNDEFÜHRERSCHEIN"}
                      </h2>
                      <h3 className="text-lg md:text-xl font-medium text-center text-gray-600 mb-6">
                        {isTrainer ? "Prüfungsbogen Hundetrainer" : "Prüfungsbogen Sachkundenachweis"}
                      </h3>

                      <div className="text-sm md:text-base text-gray-700 space-y-4 mb-8">
                        <p className="font-bold italic text-center">
                          {isTrainer 
                            ? "Für die interne Prüfung zum selbständigen Hundetrainer und zur Vorbereitung auf die Prüfung zum behördlich zertifizierten Hundetrainer nach §11 Abs. 1 Satz 1 Nummer 8 Buchstabe f TierSchG" 
                            : "Vorbereitung auf den behördlichen Sachkundenachweis für Hundehalter."}
                        </p>
                        
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                          <p className="font-bold mb-2">Prüfungsordnung</p>
                          <ul className="list-disc pl-5 space-y-1">
                            <li>Es können nur eine oder auch mehrere Antworten richtig sein</li>
                            <li>Nur wenn alle 60 Fragen beantwortet wurden kann der Test ausgewertet werden.</li>
                            <li>Pro richtige Antwort gibt es einen Punkt.</li>
                            <li>Eine Änderung der Antworten ist nach der Auswertung nicht mehr möglich.</li>
                            <li>Du hast jetzt 90 min Zeit um alle Fragen zu beantworten</li>
                            <li className="text-red-600 font-bold">ACHTUNG: Wenn die Zeit abgelaufen ist und noch nicht alle Fragen beantwortet sind wird der Test automatisch abgeschlossen und als "NICHT Bestanden" gewertet!</li>
                            <li>Der Test gilt als bestanden wenn <span className="font-bold italic">mindestens 80 %</span> der Fragen richtig beantwortet wurden</li>
                          </ul>
                        </div>
                      </div>

                      <div className="flex justify-center">
                        <button 
                          onClick={confirmStartQuiz}
                          className="bg-[#482880] hover:bg-[#3a2066] text-white font-bold py-3 px-12 rounded-lg text-lg transition shadow-lg"
                        >
                          Start
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        );

      case 'GAME':
        const timeLimit = quizConfig.count === 60 ? 5400 : 0;
        return (
          <QuizGame 
            questions={quizQuestions} 
            onFinish={finishQuiz} 
            onExit={goHome} 
            timeLimit={timeLimit}
          />
        );

      case 'RESULT':
        return <QuizResult questions={quizQuestions} userAnswers={userAnswers} onRestart={() => setCurrentView('SELECTION')} onHome={goHome} />;

      case 'ADMIN_DASHBOARD':
        return <AdminDashboard onBack={goHome} />;

      default:
        return <div>Unknown View</div>;
    }
  };

  return <>{renderView()}</>;
}

export default App;