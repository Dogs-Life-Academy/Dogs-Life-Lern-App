
import React, { useState, useEffect } from 'react';
import { Question, UserAnswers } from '../types.ts';

interface QuizGameProps {
  questions: Question[];
  onFinish: (answers: UserAnswers) => void;
  onExit: () => void;
  timeLimit?: number; // Time limit in seconds (0 for no limit)
}

const QuizGame: React.FC<QuizGameProps> = ({ questions, onFinish, onExit, timeLimit = 0 }) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<UserAnswers>({});
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [timeLeft, setTimeLeft] = useState(timeLimit);

  // Initialize answers map
  useEffect(() => {
    // Reset scroll of the content area when question changes
    const contentArea = document.getElementById('quiz-content-area');
    if (contentArea) contentArea.scrollTop = 0;
  }, [currentIdx]);

  // Timer Logic
  useEffect(() => {
    if (timeLimit <= 0) return;

    const timerId = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerId);
          // Time is up, finish quiz automatically
          onFinish(answers); 
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerId);
  }, [timeLimit, onFinish, answers]); 

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const currentQuestion = questions[currentIdx];
  const isLastQuestion = currentIdx === questions.length - 1;

  // Calculate progress
  const progressPercent = ((currentIdx + 1) / questions.length) * 100;

  const handleOptionToggle = (option: string) => {
    const currentSelected = answers[currentQuestion.id] || [];
    let newSelected: string[];

    if (currentQuestion.question_type === 'single_choice') {
      newSelected = [option];
    } else {
      if (currentSelected.includes(option)) {
        newSelected = currentSelected.filter(item => item !== option);
      } else {
        newSelected = [...currentSelected, option];
      }
    }

    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: newSelected
    }));
  };

  const isCurrentAnswered = (answers[currentQuestion.id]?.length || 0) > 0;
  const isAllAnswered = questions.every(q => (answers[q.id]?.length || 0) > 0);

  const handleFinishClick = () => {
    setShowConfirmModal(true);
  };

  const confirmFinish = () => {
    onFinish(answers);
  };

  if (!currentQuestion) return <div>Loading...</div>;

  return (
    <div className="fixed inset-0 flex flex-col bg-[#6C5CE7] text-white h-[100dvh] w-full overflow-hidden font-sans">
      
      {/* 1. Header Area - COMPACT */}
      <div className="flex-none px-4 py-2 w-full max-w-3xl mx-auto z-10">
        <div className="flex items-center justify-between mb-2">
            <button onClick={onExit} className="p-1.5 hover:bg-white/10 rounded-full transition">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7"></path></svg>
            </button>
            
            <div className="flex flex-col items-center leading-tight">
              <span className="font-bold text-sm md:text-base">Frage {currentIdx + 1} <span className="text-white/60 text-xs">/ {questions.length}</span></span>
              {timeLimit > 0 && (
                <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded mt-0.5 ${timeLeft < 300 ? 'bg-red-500 text-white animate-pulse' : 'bg-white/20 text-white'}`}>
                  {formatTime(timeLeft)}
                </span>
              )}
            </div>

            <div className="w-8"></div> {/* Spacer */}
        </div>

        {/* Progress Bar - Thinner */}
        <div className="h-1.5 bg-[#a29bfe] rounded-full overflow-hidden w-full">
            <div 
                className="h-full bg-[#FF9F43] rounded-full transition-all duration-500 ease-out" 
                style={{ width: `${progressPercent}%` }}
            ></div>
        </div>
      </div>

      {/* 2. Content Area - Optimized for Long Text Scrolling */}
      <div className="flex-1 w-full max-w-3xl mx-auto bg-white rounded-t-[20px] shadow-2xl overflow-hidden flex flex-col min-h-0 relative z-0">
        
        {/* Unified Scroll Container: Both Question and Answers scroll together */}
        <div id="quiz-content-area" className="flex-1 overflow-y-auto p-4 md:p-6 scroll-smooth">
            
            {/* Question Area - Left Aligned */}
            <div className="mb-4 md:mb-6 w-full flex flex-col items-start gap-2">
                 <div className="px-2.5 py-1 bg-purple-100 text-[#6C5CE7] rounded-full text-[10px] md:text-xs font-bold uppercase tracking-wider">
                    {currentQuestion.category} • {currentQuestion.question_type === 'single_choice' ? 'Eine Antwort' : 'Mehrere Antworten'}
                 </div>
                 <div className="w-full p-4 md:p-5 rounded-2xl border-2 border-gray-100 bg-gray-50/50 shadow-sm text-left">
                     <h2 className="text-lg md:text-xl lg:text-2xl font-extrabold text-gray-800 leading-snug">
                        {currentQuestion.question_text}
                     </h2>
                 </div>
            </div>

            {/* Answer Options List */}
            <div className="flex flex-col gap-3 pb-4">
                {currentQuestion.all_answers.map((option, idx) => {
                    const isSelected = (answers[currentQuestion.id] || []).includes(option);
                    return (
                        <button 
                            key={idx}
                            onClick={() => handleOptionToggle(option)}
                            className={`w-full text-left p-4 md:p-5 rounded-2xl border-2 font-bold text-sm md:text-base transition-all transform active:scale-[0.98] flex items-start justify-between group leading-snug min-h-fit ${
                                isSelected 
                                    ? 'bg-[#FF9F43] border-[#FF9F43] text-white shadow-lg ring-4 ring-[#FF9F43]/10' 
                                    : 'bg-white border-gray-100 text-gray-700 hover:border-[#8c7ae6] hover:bg-purple-50 shadow-sm'
                            }`}
                        >
                            <span className="flex-1 pr-4 py-0.5">{option}</span>
                            <div className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                                isSelected ? 'border-white bg-white/20' : 'border-gray-200'
                            }`}>
                                {isSelected && <div className="w-3 h-3 bg-white rounded-full"></div>}
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>

        {/* 3. Footer Navigation - Compact & Sticky */}
        <div className="flex-none p-4 md:p-5 bg-white border-t border-gray-100 flex justify-between items-center z-10 shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
            <button 
                onClick={() => setCurrentIdx(prev => Math.max(0, prev - 1))}
                disabled={currentIdx === 0}
                className={`px-5 py-3 md:px-7 md:py-3.5 rounded-xl font-bold text-sm text-gray-500 bg-gray-100 transition-colors ${currentIdx === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-gray-200 active:bg-gray-300'}`}
            >
                Zurück
            </button>

            {isLastQuestion ? (
                <button 
                    onClick={handleFinishClick}
                    disabled={!isAllAnswered}
                    className={`px-7 py-3 md:px-10 md:py-3.5 rounded-xl font-bold text-sm text-white shadow-xl transition-all ${
                        isAllAnswered 
                            ? 'bg-[#FF9F43] hover:bg-[#ffb063] active:translate-y-[2px] active:shadow-md' 
                            : 'bg-gray-300 cursor-not-allowed'
                    }`}
                >
                    Beenden
                </button>
            ) : (
                <button 
                    onClick={() => setCurrentIdx(prev => Math.min(questions.length - 1, prev + 1))}
                    className="px-7 py-3 md:px-10 md:py-3.5 rounded-xl font-bold text-sm text-white bg-[#FF9F43] hover:bg-[#ffb063] active:translate-y-[2px] active:shadow-md transition-all shadow-xl shadow-orange-200"
                >
                    Weiter
                </button>
            )}
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-6">
            <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center transform scale-100 animate-in fade-in zoom-in duration-200">
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-[#FF9F43]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                </div>
                <h3 className="text-2xl font-extrabold text-[#2d3436] mb-2">Quiz beenden?</h3>
                <p className="text-gray-500 mb-8 font-medium text-sm">Bist du bereit für die Auswertung? Du kannst deine Antworten danach nicht mehr ändern.</p>
                <div className="flex flex-col gap-3">
                    <button 
                        onClick={confirmFinish}
                        className="w-full py-3.5 bg-[#FF9F43] text-white rounded-xl hover:bg-[#ffa502] font-bold shadow-lg active:translate-y-1 text-base transition-all"
                    >
                        Test auswerten
                    </button>
                    <button 
                        onClick={() => setShowConfirmModal(false)}
                        className="w-full py-3.5 bg-gray-50 text-gray-500 rounded-xl hover:bg-gray-100 font-bold text-base transition-all"
                    >
                        Noch einmal prüfen
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default QuizGame;
