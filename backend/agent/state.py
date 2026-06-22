from typing import TypedDict, Annotated, Sequence, Dict, Any
from langchain_core.messages import BaseMessage
import operator

class AgentState(TypedDict):
    """The state representation for the F1 Race Engineer LangGraph agent."""
    messages: Annotated[Sequence[BaseMessage], operator.add]
    intent: str
    resolved_inputs: Dict[str, Any]
    tool_output: str
    final_response: str
