window.DATA = {
  name: "Abdulrhman",
  email: "abodefy43@gmail.com",
  github: "https://github.com/abodefy43-spec",
  lichess: "https://lichess.org/@/Akera_bot",

  featured: {
    title: "Real-Time Audio Censor",
    desc: "Real-time speech moderation. It catches flagged words the moment they're spoken and removes them before they reach the listener — clean audio out, on the fly. Built on a production speech engine to stay accurate on live, messy audio.",
    tags: ["Python", "Real-time ASR", "Audio"],
    links: [["Source", "https://github.com/abodefy43-spec/audio-censor"]],
    run: "Runs the real speech engine live — record a clip and hear it cleaned."
  },

  experience: {
    role: "Machine Learning Engineer",
    org: "QEU",
    when: "2025 — present",
    note: "q-commerce platform · Jeddah, KSA",
    points: [
      "Built the recommendation system that personalizes what customers see across the platform — serving tailored product bundles in real time, kept in sync with live inventory.",
      "Built the demand-forecasting system that drives inventory planning across stores, so the right stock is in the right place — validated to be accurate enough for the business to plan against.",
      "Built a computer-vision system for warehouse operations that turns camera feeds into structured signals, running efficiently at scale."
    ],
    tags: ["Recommendation", "Forecasting", "Computer Vision", "Backend", "Cloud"]
  },

  projects: [
    { no: "01", ttl: "Recommendation Engine", role: "personalization at scale", desc: "Powers what customers see across a live q-commerce platform — personalized product bundles served in real time and kept in sync with live inventory.", tags: ["Python", "Recommendation", "Cloud"], href: "https://github.com/abodefy43-spec/bundling-system" },
    { no: "02", ttl: "dar_nakheel", role: "cross-platform mobile AR", desc: "An augmented-reality app that lets you place and arrange furniture in your real room from your phone — built cross-platform with a native AR layer.", tags: ["Flutter", "Dart", "ARCore"], href: "https://github.com/abodefy43-spec/dar-nakheel" },
    { no: "03", ttl: "Ripper", role: "C++ chess engine, from scratch", desc: "A chess engine built from scratch in C++ that competes online on Lichess around 2000–2200. Play a game against it below.", tags: ["C++", "Engine"], href: "https://github.com/abodefy43-spec/chess" }
  ],

  skills: [
    { lab: "What I build", val: "Production machine-learning systems end to end — recommendation & ranking, demand forecasting, computer vision, real-time audio — plus the backend services that serve them.", dim: false },
    { lab: "Languages", val: "Python · C++ · Dart · Kotlin · Go · TypeScript / JavaScript · Rust · SQL · HTML / CSS", dim: false },
    { lab: "Frameworks", val: "PyTorch · Flutter · React · FastAPI / gRPC · ONNX", dim: false },
    { lab: "Infrastructure", val: "Docker · Google Cloud · CUDA / GPU · Linux · Git", dim: true }
  ]
};
