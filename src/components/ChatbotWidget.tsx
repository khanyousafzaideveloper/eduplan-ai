import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Bot, User, Loader2, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useProfile } from "@/hooks/use-profile";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function ChatbotWidget() {
  const { profile } = useProfile();
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize greeting based on role
  useEffect(() => {
    if (isOpen && messages.length === 0 && profile) {
      const greeting = profile.role === "teacher" 
        ? "Hello! I'm your EduPlan Teaching Assistant. How can I help you with lesson planning or grading today?"
        : "Hi there! I'm your EduPlan Tutor. What subject or concept can I help you understand today?";
      
      setMessages([{ role: "assistant", content: greeting }]);
    }
  }, [isOpen, profile, messages.length]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  // If user is not logged in, don't show the widget
  if (!profile) return null;

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: input.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      // Send the last 10 messages for context to avoid huge payloads
      const contextMessages = newMessages.slice(-10);
      
      const { data, error } = await supabase.functions.invoke("chat-assistant", {
        body: {
          messages: contextMessages,
          userRole: profile.role
        }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setMessages([...newMessages, { role: "assistant", content: data.content }]);
    } catch (error: any) {
      console.error("Chat error:", error);
      setMessages([
        ...newMessages, 
        { role: "assistant", content: "Sorry, I encountered an error connecting to my brain. Please try again later." }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) {
    return (
      <Button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-2xl gradient-hero flex items-center justify-center hover:scale-110 transition-transform z-50"
      >
        <MessageCircle className="h-6 w-6 text-white" />
      </Button>
    );
  }

  return (
    <div 
      className={cn(
        "fixed bottom-6 right-6 bg-background border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden z-50 transition-all duration-300 ease-in-out",
        isExpanded ? "w-[80vw] md:w-[600px] h-[80vh]" : "w-[350px] h-[500px]"
      )}
    >
      {/* Header */}
      <div className="gradient-hero p-4 text-white flex justify-between items-center shrink-0">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          <span className="font-semibold">
            {profile.role === "teacher" || profile.role === "admin" ? "Teaching Assistant" : "AI Tutor"}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20" onClick={() => setIsExpanded(!isExpanded)}>
            {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20" onClick={() => setIsOpen(false)}>
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/30">
        {messages.map((msg, idx) => (
          <div key={idx} className={cn("flex w-full", msg.role === "user" ? "justify-end" : "justify-start")}>
            <div className={cn(
              "flex gap-3 max-w-[85%]", 
              msg.role === "user" ? "flex-row-reverse" : "flex-row"
            )}>
              <div className={cn(
                "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
                msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
              )}>
                {msg.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
              </div>
              <div className={cn(
                "px-4 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap",
                msg.role === "user" 
                  ? "bg-primary text-primary-foreground rounded-tr-sm" 
                  : "bg-white dark:bg-zinc-800 border border-border shadow-sm rounded-tl-sm"
              )}>
                {msg.content}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex w-full justify-start">
            <div className="flex gap-3 max-w-[85%] flex-row">
              <div className="h-8 w-8 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center shrink-0">
                <Bot className="h-4 w-4" />
              </div>
              <div className="px-4 py-3 rounded-2xl bg-white dark:bg-zinc-800 border border-border shadow-sm rounded-tl-sm flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Thinking...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 bg-background border-t border-border shrink-0">
        <div className="flex gap-2 items-center">
          <Input 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={profile.role === "teacher" ? "Ask for lesson ideas..." : "Ask a question..."}
            className="rounded-full bg-muted/50 focus-visible:ring-primary/50"
            disabled={isLoading}
          />
          <Button 
            onClick={handleSend} 
            disabled={!input.trim() || isLoading}
            size="icon"
            className="h-10 w-10 rounded-full shrink-0 gradient-hero"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
