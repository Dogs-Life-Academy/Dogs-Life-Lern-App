import React, { useState } from 'react';
import { Question, UserAnswers, UserDetails } from '../types.ts';
import { downloadCertificate } from '../services/certificateGenerator.ts';

interface QuizResultProps {
  questions: Question[];
  userAnswers: UserAnswers;
  onRestart: () => void;
  onHome: () => void;
  userDetails?: UserDetails | null;
  category?: string;
  questionCount?: number;
}

const QuizResult: React.FC<QuizResultProps> = ({ questions, userAnswers, onRestart, onHome, userDetails, category, questionCount }) => {
  const [generatingCert, setGeneratingCert] = useState(false);
  const [certError, setCertError] = useState(false);
  // Logic to calculate score
  let correctCount = 0;

  const analyzedQuestions = questions.map(q => {
    const userAns = userAnswers[q.id] || [];
    const correctAns = q.correct_answers || [];

    const uSet = new Set(userAns.map(s => s.trim()));
    const cSet = new Set(correctAns.map(s => s.trim()));
    
    // Multiple choice: Must select ALL correct and NO wrong ones.
    const isCorrect = uSet.size === cSet.size && [...uSet].every(val => cSet.has(val));
    
    if (isCorrect) correctCount++;

    return { ...q, isCorrect, userAns, cSet };
  });

  const percentage = Math.round((correctCount / questions.length) * 100);
  const passed = percentage >= 80;

  const canShowCertificate = passed && questionCount === 60 && !!userDetails && !!category;

  const handleDownloadCertificate = async () => {
    if (!userDetails || !category) return;
    setGeneratingCert(true);
    setCertError(false);
    try {
      await downloadCertificate({
        firstName: userDetails.firstName,
        lastName: userDetails.lastName,
        dogName: userDetails.dogName,
        chipNumber: userDetails.chipNumber,
        category,
        scorePercentage: percentage,
      });
    } catch (err) {
      console.error('Fehler beim Erstellen des Zertifikats:', err);
      setCertError(true);
    } finally {
      setGeneratingCert(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#1e1f26] flex flex-col h-[100dvh] w-full overflow-hidden">
        
        {/* 1. Header Area (Score) - Fixed */}
        <div className="flex-none bg-[#1e1f26] p-4 pb-0 z-10 w-full max-w-md mx-auto">
             <div className="bg-white rounded-2xl p-4 text-center shadow-lg relative overflow-hidden mb-4">
                 <div className={`absolute top-0 left-0 w-full h-20 ${passed ? 'bg-[#2ecc71]' : 'bg-[#e17055]'} opacity-20`}></div>
                 
                 <div className="relative flex flex-col items-center">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center border-4 border-white shadow-md mb-2 ${passed ? 'bg-[#2ecc71]' : 'bg-[#e17055]'}`}>
                        {passed ? (
                             <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                        ) : (
                             <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg>
                        )}
                    </div>
                    <h1 className="text-xl font-extrabold text-gray-800 leading-none">
                        {passed ? 'Bestanden!' : 'Nicht bestanden'}
                    </h1>
                    <div className="text-3xl font-black text-[#6C5CE7] mt-1">
                        {percentage}%
                    </div>
                    <p className="text-gray-400 text-xs font-bold">
                        {correctCount} / {questions.length} richtig
                    </p>
                    {canShowCertificate && (
                        <>
                            <button
                                onClick={handleDownloadCertificate}
                                disabled={generatingCert}
                                className="mt-3 w-full py-3 bg-[#6C5CE7] text-white rounded-xl font-bold shadow-md active:translate-y-[1px] transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                            >
                                {generatingCert ? (
                                    <>
                                        <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                                        </svg>
                                        Zertifikat wird erstellt...
                                    </>
                                ) : 'Zertifikat herunterladen'}
                            </button>
                            {certError && (
                                <p className="text-[#e17055] text-xs font-bold mt-2">Zertifikat konnte nicht erstellt werden. Bitte erneut versuchen.</p>
                            )}
                        </>
                    )}
                 </div>
            </div>
        </div>

        {/* 2. Scrollable List Area (Review) */}
        <div className="flex-1 overflow-y-auto scrollbar-hide px-4 pb-4 w-full max-w-md mx-auto">
            <h2 className="text-white font-bold text-lg mb-3 pl-1">Detailauswertung</h2>
            
            <div className="space-y-4">
                {analyzedQuestions.map((q, idx) => (
                    <div key={q.id} className="bg-white rounded-2xl p-5 shadow-md">
                        <div className="flex items-start mb-4 border-b border-gray-100 pb-3">
                            <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mr-3 ${q.isCorrect ? 'bg-[#2ecc71] text-white' : 'bg-[#e17055] text-white'}`}>
                                {idx + 1}
                            </span>
                            <div className="flex-1">
                                <h3 className="text-sm font-bold text-gray-800 leading-tight">
                                    {q.question_text}
                                </h3>
                                {q.image_url && (
                                    <div className="mt-3">
                                        <img src={q.image_url} alt="Bild zur Frage" className="max-h-32 object-contain rounded border border-gray-100 shadow-sm" />
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            {q.all_answers.map((opt, optIdx) => {
                                const isSelected = q.userAns.includes(opt);
                                const isCorrectAnswer = q.cSet.has(opt);
                                
                                // Logic for Visual States
                                let bgClass = "bg-gray-50 border-gray-200";
                                let textClass = "text-gray-500";
                                let icon = null;
                                let statusText = "";

                                if (isSelected && isCorrectAnswer) {
                                    // User chose correct answer
                                    bgClass = "bg-[#d1fae5] border-[#2ecc71]"; 
                                    textClass = "text-[#065f46]";
                                    icon = <svg className="w-5 h-5 text-[#2ecc71]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>;
                                    statusText = "Richtig gewählt";
                                } 
                                else if (isSelected && !isCorrectAnswer) {
                                    // User chose wrong answer
                                    bgClass = "bg-[#fee2e2] border-[#ef4444]";
                                    textClass = "text-[#991b1b]";
                                    icon = <svg className="w-5 h-5 text-[#ef4444]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"/></svg>;
                                    statusText = "Falsch gewählt";
                                } 
                                else if (!isSelected && isCorrectAnswer) {
                                    // User missed correct answer
                                    bgClass = "bg-white border-[#2ecc71] border-dashed";
                                    textClass = "text-[#2ecc71]";
                                    icon = <div className="w-5 h-5 flex items-center justify-center bg-[#2ecc71] rounded-full"><svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg></div>;
                                    statusText = "Richtige Lösung";
                                }

                                return (
                                    <div key={optIdx} className={`relative p-3 rounded-xl border-2 ${bgClass} flex items-start`}>
                                        <div className="flex-shrink-0 mt-0.5 mr-3">
                                            {icon || <div className="w-5 h-5 rounded-full border-2 border-gray-300"></div>}
                                        </div>
                                        <div className="flex-1">
                                            <p className={`text-xs md:text-sm font-bold leading-tight ${textClass}`}>
                                                {opt}
                                            </p>
                                            {(isSelected || isCorrectAnswer) && (
                                                <p className="text-[10px] font-extrabold uppercase mt-1 opacity-80">
                                                    {statusText}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
            
            {/* Spacer for bottom buttons */}
            <div className="h-32"></div>
        </div>

        {/* 3. Footer Area (Buttons) - Fixed */}
        <div className="flex-none bg-[#1e1f26]/90 backdrop-blur-sm p-4 border-t border-white/10 w-full max-w-md mx-auto absolute bottom-0 left-0 right-0">
             <div className="flex gap-3">
                <button 
                    onClick={onHome}
                    className="flex-1 py-3 bg-white/10 text-white rounded-xl font-bold hover:bg-white/20 transition"
                >
                    Menü
                </button>
                <button 
                    onClick={onRestart}
                    className="flex-[2] py-3 bg-[#FF9F43] text-white rounded-xl font-bold shadow-lg active:translate-y-[2px] transition-all"
                >
                    Neuer Test
                </button>
             </div>
        </div>
    </div>
  );
};

export default QuizResult;