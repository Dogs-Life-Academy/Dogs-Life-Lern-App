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

      {/* 2. Content Area - Optimized for No Scroll */}
      <div className="flex-1 w-full max-w-3xl mx-auto bg-white rounded-t-[20px] shadow-2xl overflow-hidden flex flex-col min-h-0 relative z-0">
        
        {/* Inner Container - Flex Column to distribute space */}
        <div id="quiz-content-area" className="flex-1 flex flex-col p-4 overflow-y-auto scrollbar-hide">
            
            {/* Question Header - Compact */}
            <div className="flex-none text-center mb-3 md:mb-5">
                 <div className="inline-block mb-1.5 px-2 py-0.5 bg-purple-100 text-[#6C5CE7] rounded-full text-[9px] md:text-[10px] font-bold uppercase tracking-wider">
                    {currentQuestion.category} • {currentQuestion.question_type === 'single_choice' ? 'Eine Antwort' : 'Mehrere'}
                 </div>
                 <h2 className="text-base md:text-lg lg:text-xl font-extrabold text-gray-800 leading-snug">
                    {currentQuestion.question_text}
                 </h2>
            </div>

            {/* Answer Options - Auto distribute height */}
            <div className="flex-1 flex flex-col justify-center gap-2 md:gap-3 min-h-0">
                {currentQuestion.all_answers.map((option, idx) => {
                    const isSelected = (answers[currentQuestion.id] || []).includes(option);
                    return (
                        <button 
                            key={idx}
                            onClick={() => handleOptionToggle(option)}
                            className={`w-full text-left p-3 md:p-4 rounded-xl border-2 font-bold text-sm md:text-base transition-all transform active:scale-[0.99] flex items-center justify-between group leading-tight shrink-0 ${
                                isSelected 
                                    ? 'bg-[#FF9F43] border-[#FF9F43] text-white shadow-md' 
                                    : 'bg-white border-gray-200 text-gray-600 hover:border-[#8c7ae6] hover:bg-purple-50'
                            }`}
                        >
                            <span className="flex-1 pr-2">{option}</span>
                            <div className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center ml-2 ${
                                isSelected ? 'border-white bg-white/20' : 'border-gray-300'
                            }`}>
                                {isSelected && <div className="w-2.5 h-2.5 bg-white rounded-full"></div>}
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>

        {/* 3. Footer Navigation - Compact */}
        <div className="flex-none p-3 md:p-5 bg-white border-t border-gray-100 flex justify-between items-center z-10 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
            <button 
                onClick={() => setCurrentIdx(prev => Math.max(0, prev - 1))}
                disabled={currentIdx === 0}
                className={`px-4 py-2.5 md:px-6 md:py-3 rounded-xl font-bold text-sm text-gray-500 bg-gray-100 ${currentIdx === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-200'}`}
            >
                Zurück
            </button>

            {isLastQuestion ? (
                <button 
                    onClick={handleFinishClick}
                    disabled={!isAllAnswered}
                    className={`px-6 py-2.5 md:px-8 md:py-3 rounded-xl font-bold text-sm text-white shadow-lg transition-all ${
                        isAllAnswered 
                            ? 'bg-[#FF9F43] hover:bg-[#ffb063] active:translate-y-[2px]' 
                            : 'bg-gray-300 cursor-not-allowed'
                    }`}
                >
                    Beenden
                </button>
            ) : (
                <button 
                    onClick={() => setCurrentIdx(prev => Math.min(questions.length - 1, prev + 1))}
                    className="px-6 py-2.5 md:px-8 md:py-3 rounded-xl font-bold text-sm text-white bg-[#FF9F43] hover:bg-[#ffb063] active:translate-y-[2px] transition-all"
                >
                    Weiter
                </button>
            )}
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl shadow-2xl p-6 max-w-sm w-full text-center transform scale-100 animate-in fade-in zoom-in duration-200">
                <h3 className="text-xl font-extrabold text-[#2d3436] mb-2">Quiz beenden?</h3>
                <p className="text-gray-500 mb-6 font-medium text-xs md:text-sm">Möchtest du das Quiz wirklich beenden?</p>
                <div className="flex gap-3 justify-center">
                    <button 
                        onClick={() => setShowConfirmModal(false)}
                        className="flex-1 py-2.5 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 font-bold text-sm"
                    >
                        Abbrechen
                    </button>
                    <button 
                        onClick={confirmFinish}
                        className="flex-1 py-2.5 bg-[#FF9F43] text-white rounded-xl hover:bg-[#ffa502] font-bold shadow-md active:translate-y-1 text-sm"
                    >
                        Auswerten
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default QuizGame;