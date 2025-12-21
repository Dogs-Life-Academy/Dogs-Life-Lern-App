
import React, { useState, useEffect, useRef } from 'react';
import { fetchQuestions, deleteQuestion, upsertQuestion, bulkInsertQuestions } from '../services/supabaseClient.ts';
import { Question, QuestionType, CsvRow } from '../types.ts';
import { jsPDF } from "jspdf";

interface AdminDashboardProps {
  onBack: () => void;
}

const CATEGORY_MAP: Record<string, string> = {
  'Koalatest': 'Hundeführerschein',
  'Hundetrainer Testfragen': 'Trainerprüfung'
};

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onBack }) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Table Filters
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // Export Filter
  const [exportCategory, setExportCategory] = useState<string>('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Partial<Question> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadQuestions();
  }, []);

  const loadQuestions = async () => {
    setLoading(true);
    try {
      const data = await fetchQuestions();
      setQuestions(data);
    } catch (error) {
      console.error('Error loading questions:', error);
      alert('Failed to load questions.');
    } finally {
      setLoading(false);
    }
  };

  // --- CSV EXPORT LOGIC ---
  const handleExportCSV = () => {
    // Filter questions based on specific export dropdown
    const dataToExport = exportCategory 
        ? questions.filter(q => q.category === exportCategory) 
        : questions;

    if (dataToExport.length === 0) {
        alert("Keine Daten zum Exportieren vorhanden.");
        return;
    }

    // CSV Header
    const headers = ["question,question_type,answers,correct_answers,category"];

    // CSV Rows
    const rows = dataToExport.map(q => {
        // Escape quotes by doubling them: " -> ""
        const escape = (txt: string) => `"${txt.replace(/"/g, '""')}"`;
        
        const qText = escape(q.question_text);
        const qType = escape(q.question_type);
        const answers = escape(q.all_answers.join(';'));
        const correct = escape(q.correct_answers.join(';'));
        const cat = escape(q.category);

        return `${qText},${qType},${answers},${correct},${cat}`;
    });

    const csvContent = [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const filenameCat = exportCategory ? `_${exportCategory.replace(/\s+/g, '_')}` : '_Alle';
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `dogs_life_export${filenameCat}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- PDF EXPORT LOGIC ---
  const handleExportPDF = () => {
    // Filter questions based on specific export dropdown
    const dataToExport = exportCategory 
        ? questions.filter(q => q.category === exportCategory) 
        : questions;
    
    if (dataToExport.length === 0) {
        alert("Keine Daten zum Exportieren vorhanden.");
        return;
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const margin = 15;
    const maxLineWidth = pageWidth - (margin * 2);
    let yPos = 20;

    // Title
    doc.setFontSize(18);
    const titleSuffix = exportCategory ? ` (${exportCategory})` : '';
    doc.text(`Dog´s Life Academy - Fragenkatalog${titleSuffix}`, margin, yPos);
    yPos += 10;
    
    doc.setFontSize(10);
    doc.text(`Export Datum: ${new Date().toLocaleDateString()} | Anzahl Fragen: ${dataToExport.length}`, margin, yPos);
    yPos += 15;

    // Questions Loop
    dataToExport.forEach((q, index) => {
        // Page break check
        if (yPos > 270) {
            doc.addPage();
            yPos = 20;
        }

        // Question Block
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        
        const questionTitle = `${index + 1}. ${q.question_text} [${q.category}]`;
        const splitTitle = doc.splitTextToSize(questionTitle, maxLineWidth);
        doc.text(splitTitle, margin, yPos);
        yPos += (splitTitle.length * 6); // Adjust Y based on lines

        // Answers
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        
        q.all_answers.forEach((ans) => {
            const isCorrect = q.correct_answers.includes(ans);
            // Mark correct answers for the catalog
            const prefix = isCorrect ? "(X)" : "( )"; 
            
            // Highlight correct text if needed (simulated by bold prefix)
            if (isCorrect) doc.setFont("helvetica", "bold");
            else doc.setFont("helvetica", "normal");

            const ansText = `${prefix} ${ans}`;
            const splitAns = doc.splitTextToSize(ansText, maxLineWidth - 5); // Indent slightly
            
            // Check page break inside answers
            if (yPos + (splitAns.length * 5) > 280) {
                 doc.addPage();
                 yPos = 20;
            }

            doc.text(splitAns, margin + 5, yPos);
            yPos += (splitAns.length * 5);
        });

        yPos += 8; // Spacing between questions
    });

    const filenameCat = exportCategory ? `_${exportCategory.replace(/\s+/g, '_')}` : '_Alle';
    doc.save(`fragenkatalog${filenameCat}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // CSV Parsing Logic (Import)
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      if (!text) return;

      try {
        setLoading(true);
        const rows = parseCSV(text);
        
        let skippedCount = 0;
        const questionsToInsert = rows.map((row, idx): Partial<Question> | null => {
          let qType = row.question_type ? row.question_type.trim() : '';
          
          // Normalize type
          if (qType.toLowerCase() === 'single choice') qType = 'single_choice';
          if (qType.toLowerCase() === 'multiple choice') qType = 'multiple_choice';

          // Validate Type
          if (qType !== 'single_choice' && qType !== 'multiple_choice') {
            console.warn(`Row ${idx + 2}: Invalid type '${row.question_type}'. Skipped.`);
            skippedCount++;
            return null;
          }

          // Clean Category
          let category = row.category ? row.category.trim() : '';
          category = CATEGORY_MAP[category] || category;

          return {
            question_text: row.question,
            question_type: qType as QuestionType,
            all_answers: row.answers.split(';').map(s => s.trim()).filter(Boolean),
            correct_answers: row.correct_answers.split(';').map(s => s.trim()).filter(Boolean),
            category: category
          };
        }).filter((q): q is Partial<Question> => {
           return q !== null && !!q.question_text && (q.all_answers?.length || 0) > 0;
        });

        if (questionsToInsert.length === 0) {
            throw new Error(skippedCount > 0 ? "All rows were skipped due to errors." : "No valid questions found.");
        }

        await bulkInsertQuestions(questionsToInsert);
        
        let msg = `Successfully imported ${questionsToInsert.length} questions.`;
        if (skippedCount > 0) msg += ` (${skippedCount} rows skipped due to invalid format)`;
        alert(msg);
        
        loadQuestions();
      } catch (error: any) {
        console.error(error);
        alert(`Error importing CSV: ${error.message || 'Unknown error'}`);
      } finally {
        setLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const parseCSV = (text: string): CsvRow[] => {
    const lines = text.split('\n');
    const result: CsvRow[] = [];
    
    for (let i = 1; i < lines.length; i++) {
        const currentLine = lines[i].trim();
        if (!currentLine) continue;

        const matches = [];
        let inQuote = false;
        let buffer = '';
        
        for(let j = 0; j < currentLine.length; j++) {
            const char = currentLine[j];
            if(char === '"') {
                inQuote = !inQuote;
            } else if(char === ',' && !inQuote) {
                matches.push(buffer);
                buffer = '';
            } else {
                buffer += char;
            }
        }
        matches.push(buffer);

        const values = matches.map(m => m.trim().replace(/^"|"$/g, '').replace(/""/g, '"').trim());

        if (values.length >= 5) {
            const row: any = {};
            row.question = values[0];
            row.question_type = values[1];
            row.answers = values[2];
            row.correct_answers = values[3];
            row.category = values[4];
            result.push(row);
        }
    }
    return result;
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this question?')) {
      try {
        await deleteQuestion(id);
        setQuestions(prev => prev.filter(q => q.id !== id));
      } catch (error) {
        alert('Failed to delete question.');
      }
    }
  };

  const handleEdit = (question: Question) => {
    setEditingQuestion(question);
    setIsModalOpen(true);
  };

  const handleAddNew = () => {
    setEditingQuestion({
      question_text: '',
      question_type: 'single_choice',
      all_answers: [''],
      correct_answers: [],
      category: 'Hundeführerschein'
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQuestion) return;

    if(!editingQuestion.question_text || !editingQuestion.category || (editingQuestion.all_answers?.length || 0) < 2) {
        alert("Please fill in required fields and provide at least 2 answers.");
        return;
    }

    try {
      await upsertQuestion(editingQuestion);
      setIsModalOpen(false);
      loadQuestions();
    } catch (error) {
      alert('Failed to save question.');
    }
  };

  // Filter Logic for Table
  const filteredQuestions = questions.filter(q => {
    const matchesCategory = filterCategory ? q.category === filterCategory : true;
    const matchesSearch = searchTerm ? q.question_text.toLowerCase().includes(searchTerm.toLowerCase()) : true;
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="h-full overflow-y-auto bg-gray-50 font-sans">
      <div className="bg-[#6C5CE7] text-white py-6 px-8 shadow-lg sticky top-0 z-20">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
            <h1 className="text-3xl font-extrabold tracking-tight">Admin Dashboard</h1>
            <button onClick={onBack} className="bg-white/20 hover:bg-white/30 text-white font-bold py-2 px-4 rounded-lg transition">Sign Out</button>
        </div>
      </div>

      <div className="p-6 max-w-7xl mx-auto space-y-8">
        
        {/* Data Management Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Import Section */}
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-between h-full">
              <div>
                  <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                      <svg className="w-6 h-6 mr-2 text-[#6C5CE7]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                      Daten Import (CSV)
                  </h2>
                  <div className="flex items-center space-x-4">
                    <label className="block w-full">
                        <span className="sr-only">Choose CSV</span>
                        <input 
                            type="file" 
                            accept=".csv" 
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                            className="block w-full text-sm text-gray-500
                            file:mr-4 file:py-3 file:px-6
                            file:rounded-xl file:border-0
                            file:text-sm file:font-bold
                            file:bg-indigo-50 file:text-[#6C5CE7]
                            hover:file:bg-indigo-100 cursor-pointer"
                        />
                    </label>
                  </div>
              </div>
              <div>
                  {loading && <span className="text-[#6C5CE7] font-bold animate-pulse block mt-2">Processing...</span>}
                  <p className="text-xs text-gray-400 mt-3 font-medium">Spalten: question, question_type, answers, correct_answers, category</p>
              </div>
            </div>

            {/* Export Section (New) */}
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-between h-full">
                <div>
                    <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                        <svg className="w-6 h-6 mr-2 text-[#FF9F43]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                        Daten Export
                    </h2>
                    <p className="text-sm text-gray-500 font-medium mb-4">
                        Wähle eine Kategorie, um einen Fragenkatalog zu erstellen oder die Daten zu sichern.
                    </p>
                    
                    <select 
                      value={exportCategory} 
                      onChange={(e) => setExportCategory(e.target.value)}
                      className="w-full border-2 border-gray-200 rounded-xl p-3 mb-6 focus:outline-none focus:border-[#FF9F43] font-bold text-gray-600 bg-white"
                    >
                      <option value="">Alle Kategorien exportieren</option>
                      <option value="Hundeführerschein">Nur Hundeführerschein</option>
                      <option value="Trainerprüfung">Nur Trainerprüfung</option>
                    </select>
                </div>
                <div className="flex space-x-4">
                    <button 
                        onClick={handleExportCSV}
                        className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 px-4 rounded-xl transition flex items-center justify-center"
                    >
                        CSV Export
                    </button>
                    <button 
                        onClick={handleExportPDF}
                        className="flex-1 bg-[#FF9F43] hover:bg-[#ffb063] text-white font-bold py-3 px-4 rounded-xl shadow-md active:translate-y-1 transition flex items-center justify-center"
                    >
                        PDF Katalog
                    </button>
                </div>
            </div>
        </div>

        {/* Management Section */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
          <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
            <h2 className="text-2xl font-bold text-gray-800">Fragen verwalten <span className="text-gray-400 text-lg">({filteredQuestions.length})</span></h2>
            <button 
              onClick={handleAddNew}
              className="bg-[#2ecc71] text-white px-6 py-3 rounded-xl font-bold hover:bg-[#27ae60] shadow-md transition transform hover:scale-105"
            >
              + Neue Frage
            </button>
          </div>

          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <input 
              type="text" 
              placeholder="Suche..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border-2 border-gray-100 p-3 rounded-xl flex-grow focus:outline-none focus:border-[#6C5CE7] font-medium text-gray-600 bg-white"
            />
            <select 
              value={filterCategory} 
              onChange={(e) => setFilterCategory(e.target.value)}
              className="border-2 border-gray-100 p-3 rounded-xl focus:outline-none focus:border-[#6C5CE7] font-bold text-gray-600 bg-white"
            >
              <option value="">Alle Kategorien anzeigen</option>
              <option value="Hundeführerschein">Hundeführerschein</option>
              <option value="Trainerprüfung">Trainerprüfung</option>
            </select>
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-100">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">ID</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Frage</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Typ</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Kategorie</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-gray-400 uppercase tracking-wider">Aktionen</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {filteredQuestions.map((q) => (
                  <tr key={q.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-400">{q.id}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-700 max-w-xs truncate">{q.question_text}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${q.question_type === 'single_choice' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>
                            {q.question_type === 'single_choice' ? 'Single' : 'Multi'}
                        </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-500">{q.category}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button onClick={() => handleEdit(q)} className="text-[#6C5CE7] hover:text-[#5f4dd0] font-bold mr-4">Edit</button>
                      <button onClick={() => handleDelete(q.id)} className="text-[#e17055] hover:text-[#c0392b] font-bold">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredQuestions.length === 0 && <div className="p-8 text-center text-gray-400 font-bold">Keine Fragen gefunden.</div>}
          </div>
        </div>

        {/* Modal for Add/Edit */}
        {isModalOpen && editingQuestion && (
          <div className="fixed inset-0 bg-gray-900 bg-opacity-60 backdrop-blur-sm overflow-y-auto h-full w-full flex items-center justify-center z-50 p-4">
            <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-2xl transform scale-100 animate-in fade-in zoom-in duration-200">
              <h3 className="text-2xl font-extrabold text-gray-800 mb-6">{editingQuestion.id ? 'Frage bearbeiten' : 'Neue Frage'}</h3>
              <form onSubmit={handleSave} className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-2">Fragetext</label>
                  <textarea 
                    required
                    className="w-full border-2 border-gray-200 rounded-xl p-3 focus:outline-none focus:border-[#6C5CE7] transition bg-white"
                    rows={3}
                    value={editingQuestion.question_text}
                    onChange={e => setEditingQuestion({...editingQuestion, question_text: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-600 mb-2">Kategorie</label>
                    <select 
                      className="w-full border-2 border-gray-200 rounded-xl p-3 focus:outline-none focus:border-[#6C5CE7] bg-white"
                      value={editingQuestion.category}
                      onChange={e => setEditingQuestion({...editingQuestion, category: e.target.value})}
                    >
                      <option value="Hundeführerschein">Hundeführerschein</option>
                      <option value="Trainerprüfung">Trainerprüfung</option>
                    </select>
                  </div>
                  <div>
                      <label className="block text-sm font-bold text-gray-600 mb-2">Typ</label>
                      <select 
                        className="w-full border-2 border-gray-200 rounded-xl p-3 focus:outline-none focus:border-[#6C5CE7] bg-white"
                        value={editingQuestion.question_type}
                        onChange={e => setEditingQuestion({...editingQuestion, question_type: e.target.value as QuestionType, correct_answers: []})}
                      >
                        <option value="single_choice">Single Choice</option>
                        <option value="multiple_choice">Multiple Choice</option>
                      </select>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-xl">
                  <label className="block text-sm font-bold text-gray-600 mb-3">Antworten (Richtige anhaken)</label>
                  {editingQuestion.all_answers?.map((answer, idx) => (
                    <div key={idx} className="flex items-center space-x-3 mb-3">
                      <input 
                        type={editingQuestion.question_type === 'single_choice' ? 'radio' : 'checkbox'}
                        name="correct_answer"
                        checked={editingQuestion.correct_answers?.includes(answer) && answer !== ''}
                        onChange={(e) => {
                          let newCorrect = [...(editingQuestion.correct_answers || [])];
                          if (editingQuestion.question_type === 'single_choice') {
                              newCorrect = [answer];
                          } else {
                              if (e.target.checked) newCorrect.push(answer);
                              else newCorrect = newCorrect.filter(a => a !== answer);
                          }
                          setEditingQuestion({...editingQuestion, correct_answers: newCorrect});
                        }}
                        className="h-5 w-5 text-[#6C5CE7] focus:ring-[#6C5CE7]"
                      />
                      <input 
                        type="text"
                        value={answer}
                        onChange={(e) => {
                           const newAnswers = [...(editingQuestion.all_answers || [])];
                           const oldVal = newAnswers[idx];
                           newAnswers[idx] = e.target.value;
                           
                           let newCorrect = [...(editingQuestion.correct_answers || [])];
                           if (newCorrect.includes(oldVal)) {
                               newCorrect = newCorrect.filter(c => c !== oldVal);
                               newCorrect.push(e.target.value);
                           }

                           setEditingQuestion({...editingQuestion, all_answers: newAnswers, correct_answers: newCorrect});
                        }}
                        className="flex-grow border-2 border-gray-200 rounded-lg p-2 text-sm focus:border-[#6C5CE7] outline-none bg-white"
                        placeholder={`Option ${idx + 1}`}
                      />
                      <button 
                        type="button"
                        onClick={() => {
                            const newAnswers = editingQuestion.all_answers?.filter((_, i) => i !== idx);
                            const newCorrect = editingQuestion.correct_answers?.filter(c => c !== answer);
                            setEditingQuestion({...editingQuestion, all_answers: newAnswers, correct_answers: newCorrect});
                        }}
                        className="text-[#e17055] hover:text-[#d35400] font-bold px-2"
                      >
                          &times;
                      </button>
                    </div>
                  ))}
                  <button 
                      type="button"
                      onClick={() => setEditingQuestion({
                          ...editingQuestion, 
                          all_answers: [...(editingQuestion.all_answers || []), '']
                      })}
                      className="text-sm text-[#6C5CE7] font-bold hover:underline mt-2 ml-8"
                  >
                      + Option hinzufügen
                  </button>
                </div>

                <div className="flex justify-end space-x-4 pt-4 border-t border-gray-100">
                  <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)}
                    className="px-6 py-3 border-2 border-gray-200 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-50 transition"
                  >
                    Abbrechen
                  </button>
                  <button 
                    type="submit" 
                    className="px-6 py-3 rounded-xl shadow-lg text-sm font-bold text-white bg-[#6C5CE7] hover:bg-[#5f4dd0] transition transform hover:scale-105"
                  >
                    Speichern
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
