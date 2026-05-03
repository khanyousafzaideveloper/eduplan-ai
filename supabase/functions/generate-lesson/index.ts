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
    const { messages } = await req.json();
    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");

    if (!GROQ_API_KEY) {
      throw new Error("No API Key configured. Please get a free key from console.groq.com and set GROQ_API_KEY on Supabase.");
    }

    const systemPrompt = `You are EduPlan AI, an expert teaching assistant. Generate clear, engaging lesson plans and worksheets. Respond in well-structured Markdown.`;

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
    if (!resp.ok) throw new Error(data.error?.message || "AI Generation failed");

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