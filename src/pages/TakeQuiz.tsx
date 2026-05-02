import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/use-profile";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowLeft, Send, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function TakeQuiz() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const { profile } = useProfile();
  const [quiz, setQuiz] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [score, setScore] = useState(0);

  useEffect(() => {
    if (quizId) fetchQuiz();
  }, [quizId]);

  async function fetchQuiz() {
    setLoading(true);
    const { data, error } = await supabase
      .from("quizzes")
      .select("*, classes(name)")
      .eq("id", quizId)
      .single();
    
    if (error) {
      toast.error("Failed to load quiz");
      navigate("/student");
    } else {
      setQuiz(data);
    }
    setLoading(false);
  }

  const handleOptionSelect = (value: string) => {
    setAnswers({ ...answers, [currentQuestion]: value });
  };

  const handleNext = () => {
    if (currentQuestion < quiz.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const calculateScore = () => {
    let correctCount = 0;
    quiz.questions.forEach((q: any, index: number) => {
      if (answers[index] === q.correct) {
        correctCount++;
      }
    });
    return correctCount;
  };

  const handleSubmit = async () => {
    if (Object.keys(answers).length < quiz.questions.length) {
      if (!confirm("You haven't answered all questions. Submit anyway?")) return;
    }

    setIsSubmitting(true);
    const finalScore = calculateScore();
    
    try {
      const { error } = await supabase.from("quiz_submissions").insert({
        quiz_id: quizId,
        student_id: profile?.id,
        score: finalScore,
        total_questions: quiz.questions.length,
        answers: answers
      });

      if (error) throw error;

      setScore(finalScore);
      setIsFinished(true);
      toast.success("Quiz submitted successfully!");
    } catch (error: any) {
      toast.error("Failed to submit quiz: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isFinished) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-primary/20 shadow-2xl">
          <CardHeader className="text-center">
            <div className="h-20 w-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-10 w-10 text-green-500" />
            </div>
            <CardTitle className="text-3xl font-bold">Quiz Completed!</CardTitle>
            <CardDescription className="text-lg">Great job on finishing the quiz.</CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            <div className="bg-muted p-6 rounded-2xl">
              <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-1">Your Score</p>
              <div className="flex items-end justify-center gap-2">
                <span className="text-6xl font-black text-primary">{score}</span>
                <span className="text-2xl font-bold text-muted-foreground mb-2">/ {quiz.questions.length}</span>
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              {score === quiz.questions.length ? "Perfect score! Outstanding work." : 
               score > quiz.questions.length / 2 ? "Well done! Keep practicing." : 
               "Keep studying, you can do it!"}
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={() => navigate(`/student/class/${quiz.class_id}`)} className="w-full h-12 text-lg gradient-hero">
              Back to Class
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  const question = quiz.questions[currentQuestion];
  const progress = ((currentQuestion + 1) / quiz.questions.length) * 100;

  return (
    <div className="min-h-screen bg-muted/30 pb-12">
      <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate(`/student/class/${quiz.class_id}`)}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Quit Quiz
          </Button>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">Question {currentQuestion + 1} of {quiz.questions.length}</span>
            <div className="w-32 h-2 bg-background rounded-full overflow-hidden">
              <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>

        <Card className="border-border/50 shadow-xl overflow-hidden bg-background">
          <div className="h-1 bg-primary" />
          <CardHeader className="space-y-4">
            <CardDescription className="text-primary font-semibold flex items-center gap-2">
              <AlertCircle className="h-4 w-4" /> MULTIPLE CHOICE QUESTION
            </CardDescription>
            <CardTitle className="text-2xl leading-relaxed">
              {question.question}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-8 pt-4">
            <RadioGroup 
              value={answers[currentQuestion] || ""} 
              onValueChange={handleOptionSelect}
              className="grid grid-cols-1 gap-4"
            >
              {question.options.map((option: string, i: number) => (
                <Label
                  key={i}
                  className={`flex items-center space-x-3 p-5 rounded-xl border-2 cursor-pointer transition-all hover:bg-muted/50 ${
                    answers[currentQuestion] === option 
                      ? "border-primary bg-primary/5 shadow-md" 
                      : "border-border/50"
                  }`}
                >
                  <RadioGroupItem value={option} className="h-5 w-5" />
                  <span className="text-lg font-medium">{option}</span>
                </Label>
              ))}
            </RadioGroup>
          </CardContent>
          <CardFooter className="flex justify-between items-center bg-muted/20 p-6 mt-8">
            <Button 
              variant="outline" 
              onClick={handlePrevious} 
              disabled={currentQuestion === 0}
              className="px-8 h-12"
            >
              Previous
            </Button>
            
            {currentQuestion === quiz.questions.length - 1 ? (
              <Button 
                onClick={handleSubmit} 
                disabled={isSubmitting} 
                className="px-12 h-12 gradient-hero shadow-lg shadow-primary/20"
              >
                {isSubmitting ? <Loader2 className="animate-spin" /> : <><Send className="mr-2 h-4 w-4" /> Finish Quiz</>}
              </Button>
            ) : (
              <Button onClick={handleNext} className="px-12 h-12">
                Next Question
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
