export const AI_MODELS = [
    // =========================
    // GOOGLE GEMINI
    // =========================
    {
      id: "gemini-3.5-flash",
      provider: "google",
      rpm: 5,
      rpd: 20,
      tpm: 250_000,
      capabilities: {
        toolCalling: true,
        webSearch: true,
        generalChat: true,
        storeData: true,
      },
      priority: 1,
    },
    {
      id: "gemini-3.5-flash-lite",
      provider: "google",
      rpm: 15,
      rpd: 500,
      tpm: 250_000,
      capabilities: {
        toolCalling: true,
        webSearch: true,
        generalChat: true,
        storeData: true,
      },
      priority: 2,
    },
  
    {
      id: "gemini-3.1-flash-lite",
      provider: "google",
      rpm: 15,
      rpd: 500,
      tpm: 250_000,
      capabilities: {
        toolCalling: true,
        webSearch: true,
        generalChat: true,
        storeData: true,
      },
      priority: 3,
    },
  
    {
      id: "gemini-2.5-flash-lite",
      provider: "google",
      rpm: 10,
      rpd: 20,
      tpm: 250_000,
      capabilities: {
        toolCalling: true,
        webSearch: true,
        generalChat: true,
        storeData: true,
      },
      priority: 4,
    },
  
    {
      id: "gemini-3-flash-preview",
      provider: "google",
      rpm: 5,
      rpd: 20,
      tpm: 250_000,
      capabilities: {
        toolCalling: true,
        webSearch: true,
        generalChat: true,
        storeData: true,
      },
      priority: 5,
    },
  
    {
      id: "gemini-2.5-flash",
      provider: "google",
      rpm: 5,
      rpd: 20,
      tpm: 250_000,
      capabilities: {
        toolCalling: true,
        webSearch: true,
        generalChat: true,
        storeData: true,
      },
      priority: 6,
    },

    {
      id: "llama-3.1-8b-instant",
      provider: "groq",
      rpm: 30,
      rpd: 14_400,
      tpm: 6_000,
      capabilities: {
        toolCalling: true,
        webSearch: false,
        generalChat: true,
        storeData: true,
      },
      priority: 7,
    },
    
    {
      id: "llama-3.3-70b-versatile",
      provider: "groq",
      rpm: 30,
      rpd: 1_000,
      tpm: 12_000,
      capabilities: {
        toolCalling: true,
        webSearch: false,
        generalChat: true,
        storeData: true,
      },
      priority: 8,
    },
    
    {
      id: "openai/gpt-oss-120b",
      provider: "groq",
      rpm: 30,
      rpd: 1_000,
      tpm: 8_000,
      capabilities: {
        toolCalling: true,
        webSearch: false,
        generalChat: true,
        storeData: true,
      },
      priority: 9,
    },
    
    {
      id: "openai/gpt-oss-20b",
      provider: "groq",
      rpm: 30,
      rpd: 1_000,
      tpm: 8_000,
      capabilities: {
        toolCalling: true,
        webSearch: false,
        generalChat: true,
        storeData: true,
      },
      priority: 10,
    },
    
    {
      id: "qwen/qwen3.6-27b",
      provider: "groq",
      rpm: 30,
      rpd: 1_000,
      tpm: 8_000,
      capabilities: {
        toolCalling: true,
        webSearch: false,
        generalChat: true,
        storeData: true,
      },
      priority: 11,
    },
    
    {
      id: "groq/compound-mini",
      provider: "groq",
      rpm: 30,
      rpd: 250,
      tpm: 70_000,
      capabilities: {
        toolCalling: true,
        webSearch: true,
        generalChat: true,
        storeData: true,
      },
      priority: 12,
    },

    {
      id: "mistral-small-latest",
      provider: "mistral",
      rpm: null,
      rpd: null,
      tpm: null,
      capabilities: {
        toolCalling: true,
        webSearch: false,
        generalChat: true,
        storeData: true,
      },
      priority: 13,
    },
  
    // =========================
    // OPENROUTER
    // =========================
    {
      id: "openrouter/free",
      provider: "openrouter",
      rpm: null,
      rpd: 50,
      tpm: null,
      capabilities: {
        toolCalling: true,
        webSearch: false,
        generalChat: true,
        storeData: true,
      },
      priority: 14,
    },
  ] as const;
  
  export type AIModel = (typeof AI_MODELS)[number];