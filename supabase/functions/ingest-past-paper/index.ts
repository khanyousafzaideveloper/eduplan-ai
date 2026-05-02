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

    const { content, metadata } = await req.json();

    if (!content) throw new Error("Content is required");

    // Chunking (Simple character-based chunking for now)
    const chunkSize = 1000;
    const chunks = [];
    for (let i = 0; i < content.length; i += chunkSize) {
      chunks.push(content.slice(i, i + chunkSize));
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    for (const chunk of chunks) {
      // Get embedding
      const embeddingResp = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/text-embedding-004",
          input: chunk,
        }),
      });

      if (!embeddingResp.ok) {
        const err = await embeddingResp.text();
        console.error("Embedding error:", err);
        throw new Error(`AI gateway embedding error: ${embeddingResp.status}`);
      }

      const { data } = await embeddingResp.json();
      const embedding = data[0].embedding;

      // Store in DB
      const { error } = await supabase.from("past_paper_chunks").insert({
        content: chunk,
        embedding,
        metadata,
      });

      if (error) throw error;
    }

    return new Response(JSON.stringify({ success: true, chunks: chunks.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ingest-past-paper error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
