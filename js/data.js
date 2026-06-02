window.DATA = {
  name: "Abdulrhman",
  location: "Jeddah, KSA",
  email: "abodefy43@gmail.com",
  github: "https://github.com/abodefy43-spec",
  githubHandle: "abodefy43-spec",
  lichess: "https://lichess.org/@/Akera_bot",
  lichessHandle: "Akera_bot",

  skillsBuild: ["Real-time ML", "Recommendation systems", "Computer vision", "Mobile apps", "Backend services", "Multithreading"],
  skillsCore: ["Python", "C++20", "Dart", "Kotlin", "PyTorch", "gRPC", "Docker", "CUDA", "Git"],
  skillsComfortable: ["Rust", "TypeScript", "SQL", "Bash", "C", "Linux"],

  experience: {
    role: "Machine Learning Engineer",
    org: "QEU",
    orgNote: "q-commerce grocery · Jeddah",
    when: "2025 — Now",
    body: "I work on the ML and backend systems behind QEU's recommendations, forecasting, and warehouse monitoring — picking and tuning the right models inside architectures that hold up in production.",
    points: [
      "A gRPC recommendation engine that serves personalized product bundles: an offline picker precomputes them, an in-memory server answers requests fast, and live out-of-stock updates patch the results. Deployed on GCP Cloud Run.",
      "Per-SKU, per-warehouse demand forecasting that learns each store's own demand patterns and applies them only where the data supports it, with a walk-forward cross-validation harness for honest accuracy.",
      "A warehouse computer-vision pipeline: a detection cascade plus a verifier to cut false positives, with a vision-language model ensemble for labeling, running on rented GPU with cost-control auto-stop.",
    ],
    tags: ["Python", "gRPC", "PyTorch", "GCP", "Docker"],
  },

  // FEATURED: audio censor
  featured: {
    id: "censor",
    name: "Real-Time Audio Censor",
    proof: "Python · real-time speech",
    desc: "Listens to live audio, catches banned words, and replaces them with a beep through a short delay buffer — so the word is censored before it's heard. It reconstructs whole words from the speech model's subword tokens (matching the raw tokens misfires), and runs the detection on a separate thread, gated by voice activity, so the audio never stutters.",
    tags: ["Python", "Whisper / Parakeet", "Silero VAD", "ONNX"],
    repo: "https://github.com/abodefy43-spec/audio-censor",
    live: null,
  },

  projects: [
    {
      id: "recsys",
      name: "Q Bundle Recommender",
      role: "gRPC recommendation engine",
      desc: "Personalized product bundles for a grocery app — precomputed by an offline picker and served from memory by a gRPC API, with live out-of-stock patching. Deployed on GCP Cloud Run.",
      tags: ["Python", "gRPC", "GCP"],
      repo: "https://github.com/abodefy43-spec/bundling-system",
    },
    {
      id: "ar",
      name: "dar_nakheel",
      role: "mobile AR — place furniture in your room",
      desc: "A Flutter app with a native Kotlin ARCore layer: place multiple pieces in your real room at once, rotate them with an on-screen ring, take snapshots, and configure them with live-preview theming.",
      tags: ["Flutter", "Kotlin", "ARCore"],
      repo: "https://github.com/abodefy43-spec/dar-nakheel",
    },
    {
      id: "ripper",
      name: "Ripper — chess engine",
      role: "C++20 · plays on Lichess",
      desc: "A chess engine in C++20 with no dependencies — bitboard move generation, multi-threaded search, an opening book and UCI support. It plays online as @Akera_bot at roughly 2000–2200 Elo. You can play a quick game further up the page.",
      tags: ["C++20", "multithreading", "UCI"],
      repo: "https://github.com/abodefy43-spec/chess",
    },
  ],
};
