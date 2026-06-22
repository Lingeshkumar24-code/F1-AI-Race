import os
import json
from typing import Dict, Any
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
from langchain_groq import ChatGroq
from langgraph.graph import StateGraph, START, END

from backend.agent.state import AgentState
from backend.agent.tools import (
    get_driver_stats,
    predict_tire_life,
    recommend_pit_stop,
    compare_drivers,
    get_fia_rule,
    generate_race_report
)

# Fetch API key
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")

# Initialize LLM
def get_llm(json_mode: bool = False):
    """Factory to get the Groq Chat LLM instance."""
    kwargs = {}
    if json_mode:
        kwargs["model_kwargs"] = {"response_format": {"type": "json_object"}}
    return ChatGroq(
        groq_api_key=GROQ_API_KEY,
        model_name="llama-3.3-70b-versatile",
        temperature=0.1,
        **kwargs
    )

def detect_intent_node(state: AgentState) -> Dict[str, Any]:
    """Analyzes the latest user message to detect intent and extract parameters."""
    latest_message = state["messages"][-1].content
    
    intent_prompt = f"""
You are the telemetry and parsing sub-module for an AI F1 Race Engineer.
Analyze the user's latest query and identify their intent and extract any parameters.

Supported Intents:
1. "get_driver_stats": Querying F1 stats, sectors, speed, performance history for a specific driver.
   - Required args: "driver_name" (string)
2. "predict_tire_life": Predicting tire degradation or lap time loss.
   - Required args: "compound" (string: Soft, Medium, or Hard), "age" (integer, default to 10 if not found), "track_temp" (float, default to 30.0 if not found)
3. "recommend_pit_stop": Recommendation on whether a driver should pit.
   - Required args: "lap_number" (integer, default to 25 if not found), "tire_age" (integer, default to 15 if not found), "compound" (string: Soft, Medium, or Hard, default to 'Medium'), "position" (integer, default to 5 if not found)
4. "compare_drivers": Comparing statistics between two drivers.
   - Required args: "driver1" (string), "driver2" (string)
5. "get_fia_rule": Inquiring about safety car rules, VSC, track limits, penalties, flag regulations.
   - Required args: "query" (string, search terms to look up in the regulations)
6. "generate_race_report": Asking for summaries, winner details, strategies of past races.
   - Required args: "query" (string, search terms to look up in reports)
7. "general_chat": General F1 smalltalk, greeting, or unspecified queries.
   - No arguments.

You MUST respond with a JSON object in the following format:
{{
  "intent": "<one_of_the_seven_intents_above>",
  "args": {{ ... }}
}}

User Query: "{latest_message}"
"""
    
    llm = get_llm(json_mode=True)
    try:
        response = llm.invoke([SystemMessage(content=intent_prompt)])
        result = json.loads(response.content)
        return {
            "intent": result.get("intent", "general_chat"),
            "resolved_inputs": result.get("args", {})
        }
    except Exception as e:
        print(f"Error in intent detection node: {e}")
        return {
            "intent": "general_chat",
            "resolved_inputs": {}
        }

def execute_tool_node(state: AgentState) -> Dict[str, Any]:
    """Invokes the appropriate analytical tool or RAG pipeline based on detected intent."""
    intent = state["intent"]
    args = state["resolved_inputs"]
    
    print(f"Executing tool for intent '{intent}' with arguments: {args}")
    
    output = ""
    try:
        if intent == "get_driver_stats":
            driver = args.get("driver_name", "")
            output = get_driver_stats(driver)
            
        elif intent == "predict_tire_life":
            compound = args.get("compound", "Medium")
            age = int(args.get("age", 10))
            temp = float(args.get("track_temp", 30.0))
            output = predict_tire_life(compound, age, temp)
            
        elif intent == "recommend_pit_stop":
            lap = int(args.get("lap_number", 25))
            age = int(args.get("tire_age", 15))
            compound = args.get("compound", "Medium")
            pos = int(args.get("position", 5))
            output = recommend_pit_stop(lap, age, compound, pos)
            
        elif intent == "compare_drivers":
            d1 = args.get("driver1", "")
            d2 = args.get("driver2", "")
            output = compare_drivers(d1, d2)
            
        elif intent == "get_fia_rule":
            q = args.get("query", "")
            output = get_fia_rule(q)
            
        elif intent == "generate_race_report":
            q = args.get("query", "")
            output = generate_race_report(q)
            
        else:
            output = "No tool execution needed."
            
    except Exception as e:
        output = f"Tool execution failed: {str(e)}"
        
    return {"tool_output": output}

def generate_answer_node(state: AgentState) -> Dict[str, Any]:
    """Generates the final response to the user, acting as the F1 Race Engineer."""
    messages = state["messages"]
    intent = state["intent"]
    tool_output = state["tool_output"]
    
    system_prompt = """
You are a highly skilled, professional Formula 1 Race Engineer speaking directly to your driver (the user) over the team radio.
Your tone should be:
- Direct, professional, and composed.
- F1-savvy, using racing terminology (e.g., 'box this lap', 'push now', 'check status', 'copy that', 'understoood').
- Analytical, referencing telemetry, safety windows, and margins.

Guidelines:
1. Always incorporate the provided telemetry context or RAG retrieval outputs directly into your radio messages.
2. Be concise but highly technical. If the driver asks for a strategy recommendation, make a clear decision (e.g., 'Box, Box' or 'Stay out').
3. Reference specific FIA rules or data points when available.
4. Keep the response formatted in clean, readable Markdown.
"""
    
    input_messages = [SystemMessage(content=system_prompt)]
    
    # Add historical messages (limit to last 5 for context length efficiency)
    input_messages.extend(messages[-5:])
    
    # Append tool outputs if they exist
    if tool_output and intent != "general_chat":
        context_msg = f"Engineer Telemetry/RAG Context for current request:\n{tool_output}"
        input_messages.append(SystemMessage(content=context_msg))
        
    llm = get_llm(json_mode=False)
    try:
        response = llm.invoke(input_messages)
        return {"final_response": response.content}
    except Exception as e:
        return {"final_response": f"Radio transmission disrupted. (Error: {str(e)})"}

# Build LangGraph StateGraph
workflow = StateGraph(AgentState)

# Add Nodes
workflow.add_node("detect_intent", detect_intent_node)
workflow.add_node("execute_tool", execute_tool_node)
workflow.add_node("generate_answer", generate_answer_node)

# Add Edges
workflow.add_edge(START, "detect_intent")
workflow.add_edge("detect_intent", "execute_tool")
workflow.add_edge("execute_tool", "generate_answer")
workflow.add_edge("generate_answer", END)

# Compile Graph
agent_graph = workflow.compile()

def run_f1_agent(query: str, history=None) -> str:
    """Convenient entry point to execute the LangGraph F1 agent."""
    if history is None:
        history = []
        
    messages = []
    for msg in history:
        if msg.get("role") == "user":
            messages.append(HumanMessage(content=msg["content"]))
        elif msg.get("role") == "assistant":
            messages.append(AIMessage(content=msg["content"]))
            
    messages.append(HumanMessage(content=query))
    
    initial_state = {
        "messages": messages,
        "intent": "",
        "resolved_inputs": {},
        "tool_output": "",
        "final_response": ""
    }
    
    final_state = agent_graph.invoke(initial_state)
    return final_state["final_response"]
