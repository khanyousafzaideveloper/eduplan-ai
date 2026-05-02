import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { subject, grade, board, count = 5 } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // 1. Generate search query embedding
    const searchQuery = `${subject} ${grade} ${board} questions`;
    const embeddingResp = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/text-embedding-004",
        input: searchQuery,
      }),
    });

    if (!embeddingResp.ok) throw new Error("Search embedding failed");
    const { data: embeddingData } = await embeddingResp.json();
    const queryEmbedding = embeddingData[0].embedding;

    // 2. Vector search for context
    // We'll use a RPC or raw SQL if allowed, but since I can't add an RPC via migration easily (well I can), 
    // I'll assume we added an RPC 'match_chunks' in the migration.
    // Wait, I didn't add it to migrations.sql yet. I'll add it now.
    
    const { data: chunks, error: searchError } = await supabase.rpc("match_chunks", {
      query_embedding: queryEmbedding,
      match_threshold: 0.5,
      match_count: 5,
    });

    if (searchError) throw searchError;

    const context = chunks?.map((c: any) => c.content).join("\n\n---\n\n") || "No specific past paper context found.";

    // 3. Generate quiz with Gemini
    const systemPrompt = `You are an expert examiner for ${board}. 
Generate a quiz with ${count} questions for ${subject}, ${grade}.
Use the provided past paper context to match the style, difficulty, and pattern of ${board} exams.

Return ONLY a JSON array of objects with this structure:
{
  "question": "string",
  "options": ["string", "string", "string", "string"],
  "answer": "the exact string of the correct option",
  "explanation": "string"
}

Past Paper Context:
${context}`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Generate a ${count} question quiz for ${subject} ${grade} for the ${board} board.` }
        ],
        temperature: 0.7,
      }),
    });

    if (!aiResp.ok) throw new Error("AI generation failed");
    const aiData = await aiResp.json();
    let content = aiData.choices[0].message.content;
    
    // Clean JSON if needed (sometimes AI adds markdown blocks)
    content = content.replace(/```json\n?/, "").replace(/\n?```/, "").trim();
    const questions = JSON.parse(content);

    return new Response(JSON.stringify({ questions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-quiz error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
