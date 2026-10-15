#!/usr/bin/env node

/**
 * Interactive Terminal Chatbot CLI for Member 8 AI Heritage Chatbot
 *
 * Runs entirely in the terminal without requiring Vite, a browser, or a running Express server.
 * Uses LangChain.js + local Ollama (Llama 3.2).
 *
 * Usage:
 *   npm run chat                      # Interactive terminal session
 *   npm run chat -- --mock            # Interactive session with mock LLM
 *   node tests/chat-cli.js "question" # Single-shot query
 */

import readline from "readline";
import { generateChatAnswer } from "../services/generate-chat-answer.service.js";
import { generateWithOllama } from "../services/llm.service.js";

// Curated, approved archival passages used as evidence fixtures for terminal demonstration
// (Real-time dynamic MongoDB retrieval will feed from Member 7's vector search once integrated)
const APPROVED_HERITAGE_EVIDENCE = [
  {
    id: "ttd-arch-01",
    title: "Epigraphia Tirupati — Vol. IV: Vijayanagara Inscriptions",
    page: 112,
    text: "In the cyclic year Dhatri (1516 CE), Emperor Sri Krishnadevaraya visited the shrine of Lord Venkateswara and consecrated the gilded copper roofing on the Ananda Nilaya vimana, offering several jeweled crowns.",
  },
  {
    id: "ttd-water-03",
    title: "Sacred Water Bodies of Tirumala Hills",
    page: 24,
    text: "Swami Pushkarini is an ancient sacred water tank measuring approximately 1.5 acres situated immediately north of the Sri Venkateswara Temple. Legends hold that Garuda brought it from Vaikuntha for the sport of the Lord.",
  },
  {
    id: "ttd-paths-02",
    title: "Pilgrim Footpaths of Seshachalam",
    page: 55,
    text: "The ancient stone step footpath commences from Alipiri at the base of the Tirupati hills, spanning 3,550 steps across approximately 9 kilometers to reach the summit at Tirumala.",
  },
];

async function executeQuery(question, history = [], useMock = false) {
  const mockCaller = async () =>
    JSON.stringify({
      answer:
        "According to Vijayanagara records, Emperor Sri Krishnadevaraya visited the temple in 1516 CE and consecrated the gilded copper roofing on the Ananda Nilaya vimana.",
      citationNumbers: [1],
      insufficientEvidence: false,
      suggestedFollowUps: ["What other gifts did Sri Krishnadevaraya offer?"],
    });

  const startTime = Date.now();
  const result = await generateChatAnswer({
    question,
    passages: APPROVED_HERITAGE_EVIDENCE,
    history,
    llmCaller: useMock ? mockCaller : generateWithOllama,
  });

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log(`\n-------------------------------------------------------`);
  console.log(`Heritage Guide Response (${elapsed}s):`);
  console.log(`-------------------------------------------------------`);
  console.log(`\n${result.answer}\n`);

  if (result.insufficientEvidence) {
    console.log(`[!] Insufficient Evidence: YES (Answer is not supported by approved sources)`);
  } else {
    console.log(`[✓] Evidence Grounded: YES`);
  }

  if (result.citations && result.citations.length > 0) {
    console.log(`\nSupporting Citations (${result.citations.length}):`);
    result.citations.forEach((c, idx) => {
      console.log(
        `  [${idx + 1}] Document: "${c.title}" | Page: ${c.page ?? "N/A"} | ID: [${c.id}]`
      );
    });
  } else {
    console.log(`Citations: None`);
  }

  if (result.suggestedFollowUps && result.suggestedFollowUps.length > 0) {
    console.log(`\nSuggested Follow-Up Topics:`);
    result.suggestedFollowUps.forEach((q) => console.log(`  - ${q}`));
  }

  console.log(`-------------------------------------------------------\n`);

  return result;
}

async function main() {
  const args = process.argv.slice(2);
  const useMock = args.includes("--mock");
  const nonFlagArgs = args.filter((a) => !a.startsWith("--"));

  // 1. Single-shot question mode
  if (nonFlagArgs.length > 0) {
    const question = nonFlagArgs.join(" ");
    console.log(`\n[HERITAGE CHAT CLI - Single Query]`);
    console.log(`Mode: ${useMock ? "Mock LLM" : "Live Ollama (Llama 3.2)"}`);
    console.log(`Question: "${question}"`);
    try {
      await executeQuery(question, [], useMock);
    } catch (err) {
      console.error(`Error:`, err.message);
    }
    process.exit(0);
  }

  // 2. Interactive Terminal Session
  console.log(`=======================================================`);
  console.log(`🏛️  Tirumala Heritage Trail Explorer — Terminal Chatbot`);
  console.log(`   Powered by LangChain.js + Ollama (Llama 3.2)`);
  console.log(`   Mode: ${useMock ? "Mock LLM Fixture" : "Live Local Ollama"}`);
  console.log(`   Evidence: ${APPROVED_HERITAGE_EVIDENCE.length} Approved Archival Documents Loaded`);
  console.log(`=======================================================`);
  console.log(`Commands:`);
  console.log(`  - Type your question and press Enter`);
  console.log(`  - Type 'clear' to reset conversation history`);
  console.log(`  - Type 'exit' or 'quit' (or Ctrl+C) to leave`);
  console.log(`=======================================================\n`);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  let conversationHistory = [];

  const handleExit = () => {
    console.log(`\nExiting Heritage Chat. Goodbye!`);
    rl.close();
    process.exit(0);
  };

  process.on("SIGINT", handleExit);

  const promptUser = () => {
    const turns = conversationHistory.length / 2;
    const historyBadge = turns > 0 ? ` [Turn ${turns + 1}]` : "";

    rl.question(`Ask Heritage Guide${historyBadge} > `, async (input) => {
      const q = input.trim();

      if (!q) {
        promptUser();
        return;
      }

      if (q.toLowerCase() === "exit" || q.toLowerCase() === "quit") {
        handleExit();
        return;
      }

      if (q.toLowerCase() === "clear") {
        conversationHistory = [];
        console.log(`\n[Conversation history cleared.]\n`);
        promptUser();
        return;
      }

      try {
        console.log(`\nSearching approved evidence & generating response...`);
        const result = await executeQuery(q, conversationHistory, useMock);

        // Update multi-turn history with latest valid turn
        conversationHistory.push({ role: "user", content: q });
        conversationHistory.push({ role: "assistant", content: result.answer });

        // Keep last 6 messages
        if (conversationHistory.length > 6) {
          conversationHistory = conversationHistory.slice(-6);
        }
      } catch (err) {
        console.error(`\n[Error]: ${err.message}\n`);
      }

      promptUser();
    });
  };

  promptUser();
}

main();
