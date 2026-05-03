import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, Printer, ArrowLeft } from "lucide-react";

export default function PrintQuiz() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (quizId) fetchQuiz();
  }, [quizId]);

  async function fetchQuiz() {
    setLoading(true);
    const { data } = await supabase
      .from("quizzes")
      .select("*, classes(name, subject, grade)")
      .eq("id", quizId)
      .single();
    setQuiz(data);
    setLoading(false);
  }

  const handlePrint = () => {
    window.print();
  };

  const QuestionItem = ({ q, index }: { q: any, index: number }) => (
    <div className="space-y-3 break-inside-avoid">
      <div className="flex gap-2">
        <span className="font-bold text-lg">Q{index + 1}.</span>
        <p className="text-lg leading-relaxed">{q.question}</p>
      </div>

      {q.options && q.options.length > 0 ? (
        <div className="grid grid-cols-2 gap-y-2 pl-8">
          {q.options.map((opt: string, j: number) => (
            <div key={j} className="flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-black rounded-full shrink-0" />
              <span>{opt}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="pl-8 pt-4">
          <div className="border-b border-dotted border-black w-full h-8" />
          <div className="border-b border-dotted border-black w-full h-8" />
          <div className="border-b border-dotted border-black w-full h-8" />
        </div>
      )}
    </div>
  );

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen bg-white text-black p-8 md:p-16">
      {/* Action Bar (Hidden on Print) */}
      <div className="mb-8 flex justify-between items-center print:hidden bg-muted p-4 rounded-lg">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <Button onClick={handlePrint} className="gradient-hero">
          <Printer className="mr-2 h-4 w-4" /> Print / Save as PDF
        </Button>
      </div>

      {/* Quiz Paper Header */}
      <div className="border-2 border-black p-6 space-y-4 mb-8">
        <div className="flex justify-between items-start border-b-2 border-black pb-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold uppercase tracking-wider">EduPlan AI Assessment</h1>
            <p className="text-lg font-semibold">{quiz.classes.name}</p>
          </div>
          <div className="text-right">
            <p className="font-bold">Date: ________________</p>
            <p className="font-bold">Total Marks: {quiz.questions.length * 2}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm font-bold uppercase">
          <p>Student Name: ________________________________</p>
          <p>Roll No: ________________</p>
          <p>Subject: {quiz.subject}</p>
          <p>Grade: {quiz.grade}</p>
        </div>
      </div>

      {/* Instructions */}
      <div className="mb-8">
        <p className="font-bold underline mb-2">Instructions:</p>
        <ul className="list-disc list-inside text-sm italic">
          <li>Read all questions carefully before answering.</li>
          <li>Ensure your name and roll number are written clearly.</li>
          <li>For MCQs, tick the correct option. For short questions, write within the space.</li>
        </ul>
      </div>

      {/* Questions */}
      <div className="space-y-12">
        {quiz.questions.sections ? (
          quiz.questions.sections.map((section: any, sIndex: number) => (
            <div key={sIndex} className="space-y-6">
              <div className="border-y-2 border-black py-2 text-center bg-gray-50">
                <h2 className="text-xl font-black uppercase tracking-widest">{section.name}</h2>
                {section.instructions && <p className="text-xs italic mt-1">{section.instructions}</p>}
              </div>
              <div className="space-y-8">
                {section.questions.map((q: any, i: number) => (
                  <QuestionItem key={i} q={q} index={i} />
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="space-y-8">
            {(Array.isArray(quiz.questions) ? quiz.questions : quiz.questions.questions).map((q: any, i: number) => (
              <QuestionItem key={i} q={q} index={i} />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-16 pt-8 border-t border-black text-center text-xs text-gray-500">
        Generated by EduPlan AI • Academic Integrity is the foundation of learning.
      </div>
    </div>
  );
}
