import React, { useState, useRef, useEffect } from 'react';
import { sendChatMessage } from '../services/api';
import { Radio, Send, Terminal, Cpu } from 'lucide-react';

const SUGGESTED_PROMPTS = [
  "Should Verstappen pit now?",
  "What tire strategy should Hamilton use?",
  "Compare Leclerc and Norris pace.",
  "Explain FIA safety car rules.",
  "Give me a strategy summary for Monza."
];

export default function RaceEngineerChat() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Radio check. This is your Race Engineer. I'm connected to the telemetry DB and ML strategy models. What is your status, driver?"
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (text) => {
    if (!text.trim() || loading) return;
    
    const userMessage = { role: 'user', content: text };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setLoading(true);

    try {
      // Build history for LangGraph agent (excluding the last message, which is sent as 'message')
      const chatHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));
      
      const result = await sendChatMessage(text, chatHistory);
      
      setMessages(prev => [...prev, { role: 'assistant', content: result.response }]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "TRANSMISSION BLOCKED. Copy that, we had a telemetry dropout. (Could not connect to FastAPI server. Please check that uvicorn is running.)" 
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Tab Header */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-800">
        <div>
          <h1 className="text-2xl font-bold uppercase text-white flex items-center gap-2">
            <Radio className="text-f1-red animate-pulse" size={24} />
            AI Race Engineer Radio
          </h1>
          <p className="text-xs text-gray-400">Intercom active | Linked models: RF-Degradation, XGB-Pitstop, ChromaDB RAG</p>
        </div>
        <div className="flex items-center gap-2 text-xs bg-f1-red/10 border border-f1-red/30 px-3 py-1 rounded-full text-f1-red font-mono uppercase">
          <span className="w-2 h-2 bg-f1-red rounded-full animate-ping"></span>
          Groq Online
        </div>
      </div>

      {/* Suggested Prompts Grid */}
      <div className="my-3">
        <p className="text-xs text-gray-400 mb-2 uppercase tracking-wider font-semibold">Suggested Commands:</p>
        <div className="flex flex-wrap gap-2">
          {SUGGESTED_PROMPTS.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(prompt)}
              disabled={loading}
              className="text-xs f1-glass-card hover:bg-f1-red/20 hover:text-white transition duration-200 py-1.5 px-3 rounded-md text-gray-300 border border-white/5 hover:border-f1-red/40"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Window */}
      <div className="flex-1 overflow-y-auto pr-2 my-2 space-y-4 bg-black/40 rounded-xl p-4 border border-white/5">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[75%] rounded-xl px-4 py-3 shadow-md ${
                msg.role === 'user'
                  ? 'bg-f1-red text-white rounded-br-none font-medium'
                  : 'f1-glass-card text-gray-200 rounded-bl-none border-l-4 border-f1-red'
              }`}
            >
              {msg.role === 'assistant' && (
                <div className="flex items-center gap-1 text-[10px] uppercase font-mono text-f1-red mb-1 font-bold">
                  <Terminal size={10} />
                  Race Engineer Intercom
                </div>
              )}
              {msg.role === 'user' && (
                <div className="flex items-center gap-1 text-[10px] uppercase font-mono text-white/70 mb-1">
                  <Cpu size={10} />
                  Driver Radio
                </div>
              )}
              <p className="text-sm whitespace-pre-line leading-relaxed font-mono tracking-tight">{msg.content}</p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="f1-glass-card text-gray-200 rounded-xl rounded-bl-none px-4 py-3 max-w-[70%] border-l-4 border-f1-red">
              <div className="flex items-center gap-2">
                <div className="flex space-x-1">
                  <div className="w-2.5 h-2.5 bg-f1-red rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2.5 h-2.5 bg-f1-red rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2.5 h-2.5 bg-f1-red rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
                <span className="text-xs text-gray-400 font-mono font-bold uppercase animate-pulse-slow">Processing Telemetry Matrix...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input box */}
      <div className="flex gap-2 pt-2 border-t border-gray-800">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend(inputValue)}
          placeholder="Ask strategy, tire degradation, safety rules, compare drivers..."
          disabled={loading}
          className="flex-1 f1-input font-mono text-sm"
        />
        <button
          onClick={() => handleSend(inputValue)}
          disabled={loading || !inputValue.trim()}
          className="bg-f1-red hover:bg-red-700 disabled:bg-gray-800 text-white p-3 rounded-lg flex items-center justify-center transition duration-200 shadow-lg shadow-f1-red/10"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
