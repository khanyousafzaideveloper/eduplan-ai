import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { status: 200, headers: corsHeaders });

  try {
    const { messages, userRole = "student" } = await req.json();
    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");

    if (!GROQ_API_KEY) {
      throw new Error("No API Key configured. Please set GROQ_API_KEY on Supabase.");
    }

    let systemPrompt = "";
    if (userRole === "teacher" || userRole === "admin") {
      systemPrompt = `You are EduPlan AI, an expert teaching assistant. Your role is to help teachers with lesson planning, syllabus creation, educational strategies, and generating educational content. Be professional, highly knowledgeable about modern pedagogy, and concise. Provide actionable advice.`;
    } else {
      systemPrompt = `You are EduPlan AI, an expert, friendly personal tutor. Your role is to help students understand concepts, answer their academic questions, and encourage critical thinking. IMPORTANT RULE: Never just give direct answers to homework or exam questions. Instead, explain the concepts and guide them to figure it out themselves. Be encouraging and use a supportive tone.`;
    }

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
          ...messages
        ],
        temperature: 0.7,
      }),
    });

    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error?.message || "AI Chat failed");

    const responseText = data.choices[0].message.content;

    return new Response(JSON.stringify({ content: responseText }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("Critical Error:", e.message);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
