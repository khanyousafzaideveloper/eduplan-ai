import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { status: 200, headers: corsHeaders });

  try {
    // Note: createClient is retained if you want to save logs or do other DB operations in the future.
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { subject, grade, board, type = "MCQs", count = 5 } = await req.json();

    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");

    if (!GROQ_API_KEY) {
      throw new Error("No API Key configured. Please get a free key from console.groq.com and set GROQ_API_KEY on Supabase.");
    }

    // 1. Build Prompt
    let systemPrompt = `You are a Senior Examiner for ${board}. Generate a ${type} for ${subject} (${grade}). Generate exactly ${count} questions in total. Return ONLY valid JSON, without any markdown formatting blocks.`;
    
    if (type === "Full Paper") {
      systemPrompt += ` Pattern: Section A (MCQs), Section B (Short Questions), Section C (Long Questions). Format strictly as: { "isFullPaper": true, "sections": [{ "name": "Section A", "questions": [{ "question": "...", "options": ["..."], "answer": "...", "marks": 1, "importance_score": 8, "probability": "High" }] }] }`;
    } else if (type === "MCQs") {
      systemPrompt += ` Format strictly as: { "isFullPaper": false, "questions": [{ "question": "...", "options": ["Option 1", "Option 2", "Option 3", "Option 4"], "answer": "Option 1", "marks": 1, "importance_score": 8, "probability": "High" }] }`;
    } else if (type === "True/False") {
      systemPrompt += ` Format strictly as: { "isFullPaper": false, "questions": [{ "question": "...", "options": ["True", "False"], "answer": "True", "marks": 1, "importance_score": 8, "probability": "High" }] }`;
    } else {
      // Short Questions
      systemPrompt += ` Format strictly as: { "isFullPaper": false, "questions": [{ "question": "...", "marks": 5, "importance_score": 8, "probability": "High" }] }`;
    }

    // 2. Generation with Groq (Llama 3 8B)
    const resp = await fetch(`https://api.groq.com/openai/v1/chat/completions`, {
      method: "POST",
      headers: { 
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json" 
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Generate paper for ${subject} ${grade}. Return ONLY JSON.` }
        ],
        temperature: 0.6,
        response_format: { type: "json_object" }
      }),
    });

    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error?.message || "AI Generation failed");

    const resultJson = data.choices[0].message.content;
    const content = resultJson.replace(/```json\n?/, "").replace(/\n?```/, "").trim();
    
    return new Response(content, { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    console.error("Critical Error:", e.message);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 200, // Safe for CORS
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
